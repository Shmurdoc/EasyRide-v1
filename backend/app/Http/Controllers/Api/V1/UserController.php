<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\User\UserUpdateRequest;
use App\Http\Responses\ApiResponse;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validRoles = ['rider', 'driver', 'admin', 'support', 'restaurant'];
        $role = $request->role;
        if ($role && !in_array($role, $validRoles, true)) {
            $role = null;
        }

        $perPage = min((int) ($request->per_page ?? 15), 100);

        $users = User::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->when($role, fn ($q, $v) => $q->where('role', $v))
            ->latest()
            ->paginate($perPage);

        return response()->json($users);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        if ($request->user()->tenant_id !== $user->tenant_id && ! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            return ApiResponse::forbidden('Unauthorized.');
        }

        $user->load(['tenant', 'driverProfile', 'vehicle']);

        return response()->json(new UserResource($user));
    }

    public function update(UserUpdateRequest $request, User $user): JsonResponse
    {
        $currentUser = $request->user();

        if ($currentUser->id !== $user->id && ! $currentUser->hasAnyRole(['admin', 'super-admin'])) {
            return ApiResponse::forbidden('Unauthorized.');
        }

        if (! $currentUser->hasAnyRole(['admin', 'super-admin']) && $currentUser->tenant_id !== $user->tenant_id) {
            return ApiResponse::forbidden('Unauthorized.');
        }

        $validated = $request->validated();

        $user->update($validated);

        return response()->json(new UserResource($user->fresh()));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $currentUser = $request->user();

        $isSelfDelete = $currentUser->id === $user->id;
        $isAdminDelete = $currentUser->hasAnyRole(['admin', 'super-admin']) && $currentUser->tenant_id === $user->tenant_id;

        if (! $isSelfDelete && ! $isAdminDelete) {
            return ApiResponse::forbidden('Unauthorized.');
        }

        $user->delete();

        return response()->json(null, 204);
    }

    public function adminStats(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        return response()->json([
            'total_users' => User::where('tenant_id', $tenantId)->count(),
            'total_riders' => User::where('tenant_id', $tenantId)->where('role', 'rider')->count(),
            'total_drivers' => User::where('tenant_id', $tenantId)->where('role', 'driver')->count(),
            'active_drivers' => User::where('tenant_id', $tenantId)->where('role', 'driver')
                ->whereHas('driverProfile', fn ($q) => $q->where('is_online', true))
                ->count(),
        ]);
    }
}
