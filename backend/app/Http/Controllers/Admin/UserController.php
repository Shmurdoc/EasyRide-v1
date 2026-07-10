<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $users = User::query()
            ->where('tenant_id', $tenantId)
            ->when($request->role, fn ($q, $v) => $q->where('role', $v))
            ->when($request->is_active !== null, fn ($q, $v) => $q->where('is_active', filter_var($v, FILTER_VALIDATE_BOOLEAN)))
            ->when($request->search, fn ($q, $v) => $q->where(function ($qq) use ($v) {
                $qq->where('name', 'like', "%{$v}%")
                    ->orWhere('email', 'like', "%{$v}%")
                    ->orWhere('phone_number', 'like', "%{$v}%");
            }))
            ->with(['driverProfile', 'vehicle'])
            ->latest()
            ->paginate($request->per_page ?? 15);

        return response()->json($users);
    }

    public function show(User $user): JsonResponse
    {
        if ($user->tenant_id !== request()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $user->load([
            'driverProfile',
            'vehicle',
            'ridesAsRider' => fn ($q) => $q->latest()->limit(10),
            'ridesAsDriver' => fn ($q) => $q->latest()->limit(10),
            'wallet',
            'payments' => fn ($q) => $q->latest()->limit(10),
        ]);

        $stats = [
            'total_rides_as_rider' => $user->ridesAsRider()->count(),
            'total_rides_as_driver' => $user->ridesAsDriver()->count(),
            'total_payments' => $user->payments()->sum('amount'),
            'wallet_balance' => (float) ($user->wallet?->balance ?? 0),
        ];

        return response()->json([
            'user' => $user,
            'stats' => $stats,
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if ($user->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $user->id,
            'phone_number' => 'sometimes|string|max:20',
            'is_active' => 'sometimes|boolean',
        ]);

        $oldValues = $user->only(array_keys($validated));
        $user->update($validated);
        $newValues = $user->only(array_keys($validated));

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'update_user',
            'resource_type' => 'user',
            'resource_id' => $user->id,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json($user);
    }

    public function suspend(Request $request, User $user): JsonResponse
    {
        if ($user->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $user->update(['is_active' => false]);

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'suspend_user',
            'resource_type' => 'user',
            'resource_id' => $user->id,
            'new_values' => ['reason' => $validated['reason']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'User suspended.',
            'user' => $user->fresh(),
        ]);
    }

    public function activate(Request $request, User $user): JsonResponse
    {
        if ($user->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $user->update(['is_active' => true]);

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'activate_user',
            'resource_type' => 'user',
            'resource_id' => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'User activated.',
            'user' => $user->fresh(),
        ]);
    }
}
