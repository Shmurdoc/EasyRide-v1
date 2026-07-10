<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    public function redirect(string $provider): JsonResponse
    {
        if (! in_array($provider, ['google', 'apple'])) {
            return ApiResponse::error('Unsupported provider.', 400);
        }

        $url = Socialite::driver($provider)->stateless()->redirect()->getTargetUrl();

        return ApiResponse::success(['redirect_url' => $url]);
    }

    public function callback(string $provider): JsonResponse
    {
        if (! in_array($provider, ['google', 'apple'])) {
            return ApiResponse::error('Unsupported provider.', 400);
        }

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to authenticate with '.$provider.'.', 400);
        }

        $user = User::where('email_hash', User::hashPiiField($socialUser->getEmail() ?? ''))->first();

        if (! $user) {
            $user = User::create([
                'name' => $socialUser->getName() ?? $socialUser->getNickname() ?? $provider.'_user',
                'email' => $socialUser->getEmail(),
                'password' => Hash::make(Str::password(32)),
                'role' => 'rider',
                'tenant_id' => config('app.default_tenant_id'),
                'email_verified_at' => now(),
            ]);

            $user->assignRole('rider');
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        $user->load('tenant');

        return ApiResponse::success(
            data: ['user' => new UserResource($user), 'token' => $token],
            message: 'Authenticated successfully.'
        );
    }
}
