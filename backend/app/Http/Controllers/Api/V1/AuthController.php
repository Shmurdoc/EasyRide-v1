<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\CreateDriverRequest;
use App\Http\Requests\Api\V1\Auth\ForgotPasswordRequest;
use App\Http\Requests\Api\V1\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $tenant = Tenant::firstOrCreate(
            ['slug' => $request->tenant_slug ?? 'default'],
            ['name' => $request->tenant_name ?? 'Default Tenant']
        );

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'phone_number' => $request->phone_number,
        ]);

        $user->role = 'rider';
        $user->save();
        $user->assignRole('rider');

        $platform = $request->header('X-Platform', 'unknown');
        $token = $user->createToken("auth-{$platform}")->plainTextToken;

        $user->load('tenant');

        return ApiResponse::success(
            data: ['user' => new UserResource($user), 'token' => $token],
            message: 'Registration successful',
            code: 201
        );
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if ($user && $user->locked_until && $user->locked_until->isFuture()) {
            $minutesRemaining = (int) ceil($user->locked_until->diffInSeconds(now()) / 60);

            return ApiResponse::apiError(423, 'Account Locked', 'Account is locked due to too many failed attempts. Try again in '.$minutesRemaining.' minute(s).');
        }

        if (! $user || ! Hash::check($request->password, $user->password)) {
            if ($user) {
                $user->failed_attempts = ($user->failed_attempts ?? 0) + 1;

                if ($user->failed_attempts >= 5) {
                    $user->locked_until = now()->addMinutes(15);
                }

                $user->save();
            }

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user->failed_attempts = 0;
        $user->locked_until = null;
        $user->save();

        $platform = $request->header('X-Platform', 'unknown');
        $token = $user->createToken("auth-{$platform}")->plainTextToken;

        $user->load('tenant');

        return ApiResponse::success(
            data: ['user' => new UserResource($user), 'token' => $token],
            message: 'Login successful'
        );
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();
        $plainTextToken = $token?->plainTextToken;

        $token->delete();

        // H-12 FIX: Notify socket server to invalidate token cache and disconnect
        if ($plainTextToken) {
            try {
                \Illuminate\Support\Facades\Redis::publish('auth:token:invalidate', json_encode([
                    'token' => $plainTextToken,
                    'userId' => $request->user()->id,
                ]));
            } catch (\Exception $e) {
                // Log but don't fail logout if Redis is unavailable
                \Illuminate\Support\Facades\Log::warning('Failed to publish token invalidation', [
                    'user_id' => $request->user()->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request): JsonResponse
    {
        return ApiResponse::success(
            data: ['user' => new UserResource($request->user()->load(['tenant', 'roles', 'driverProfile', 'vehicle']))]
        );
    }

    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();
        $oldToken = $user->currentAccessToken();

        if (! $oldToken) {
            return ApiResponse::apiError(401, 'No Token', 'No active token to refresh.');
        }

        $plainTextToken = $oldToken->plainTextToken;
        $token = $user->createToken('auth-token')->plainTextToken;
        $oldToken->delete();

        if ($plainTextToken) {
            try {
                \Illuminate\Support\Facades\Redis::publish('auth:token:invalidate', json_encode([
                    'token' => $plainTextToken,
                    'userId' => $user->id,
                ]));
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Failed to publish token invalidation on refresh', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $user->load('tenant');

        return ApiResponse::success(
            data: ['user' => new UserResource($user), 'token' => $token],
            message: 'Token refreshed successfully'
        );
    }

    public function createDriver(CreateDriverRequest $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            return ApiResponse::forbidden('Unauthorized.');
        }

        $validated = $request->validated();
        $tenantId = $request->user()->tenant_id;

        $user = User::create([
            'tenant_id' => $tenantId,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'phone_number' => $validated['phone_number'],
        ]);

        $user->role = 'driver';
        $user->is_active = true;
        $user->is_approved = true;
        $user->save();
        $user->assignRole('driver');

        return response()->json([
            'user' => new UserResource($user),
            'message' => 'Driver account created successfully.',
        ], 201);
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json(['message' => __(Password::RESET_LINK_SENT)], 200);
        }

        $status = Password::sendResetLink(['email' => $user->email]);

        return $status === Password::RESET_LINK_SENT
            ? response()->json(['message' => __($status)])
            : ApiResponse::apiError(400, 'Reset Failed', __($status));
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json(['message' => __('passwords.user')], 400);
        }

        $status = Password::reset(
            ['email' => $user->email, 'password' => $validated['password'], 'password_confirmation' => $validated['password_confirmation'], 'token' => $validated['token']],
            function ($user, $password) {
                $user->forceFill(['password' => $password])->save();
            }
        );

        return $status === Password::PASSWORD_RESET
            ? response()->json(['message' => __($status)])
            : ApiResponse::apiError(400, 'Reset Failed', __($status));
    }
}
