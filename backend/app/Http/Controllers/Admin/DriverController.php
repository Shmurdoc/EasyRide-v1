<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\KycVerification;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DriverController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $drivers = User::where('tenant_id', $tenantId)->role('driver')
            ->when($request->is_approved !== null, fn ($q, $v) => $q->whereHas(
                'driverProfile',
                fn ($qp) => $qp->where('is_approved', filter_var($v, FILTER_VALIDATE_BOOLEAN)),
            ))
            ->when($request->is_verified !== null, fn ($q, $v) => $q->whereHas(
                'driverProfile',
                fn ($qp) => $qp->where('is_verified', filter_var($v, FILTER_VALIDATE_BOOLEAN)),
            ))
            ->when($request->is_online !== null, fn ($q, $v) => $q->where('is_online', filter_var($v, FILTER_VALIDATE_BOOLEAN)))
            ->when($request->search, fn ($q, $v) => $q->where(function ($qq) use ($v) {
                $escaped = addcslashes($v, '%_');
                $qq->where('name', 'like', "%{$escaped}%")
                    ->orWhere('email', 'like', "%{$escaped}%")
                    ->orWhere('phone_number', 'like', "%{$escaped}%");
            }))
            ->with(['driverProfile', 'vehicle'])
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($drivers);
    }

    public function show(Request $request, User $driver): JsonResponse
    {
        if ($driver->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $driver->load([
            'driverProfile',
            'vehicle',
            'ridesAsDriver' => fn ($q) => $q->latest()->limit(10),
        ]);

        $profile = $driver->driverProfile;

        $stats = [
            'total_trips' => (int) ($profile?->total_trips ?? 0),
            'total_earnings' => (float) ($profile?->total_earnings ?? 0),
            'avg_rating' => $profile ? $profile->average_rating : 0,
            'rating_count' => (int) ($profile?->rating_count ?? 0),
            'completed_rides' => Ride::where('driver_id', $driver->id)
                ->where('status', 'completed')
                ->count(),
            'cancelled_rides' => Ride::where('driver_id', $driver->id)
                ->where('status', 'cancelled')
                ->count(),
            'today_earnings' => (float) Ride::where('driver_id', $driver->id)
                ->where('status', 'completed')
                ->whereDate('completed_at', today())
                ->sum('total_fare'),
        ];

        return response()->json([
            'driver' => $driver,
            'stats' => $stats,
        ]);
    }

    public function approve(Request $request, User $driver): JsonResponse
    {
        if ($driver->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (! $driver->hasRole('driver')) {
            return response()->json(['message' => 'User is not a driver.'], 422);
        }

        $profile = $driver->driverProfile;

        if (! $profile) {
            return response()->json(['message' => 'Driver has no profile.'], 422);
        }

        $adminId = $request->user()->id;

        DB::transaction(function () use ($profile, $adminId) {
            $profile->update([
                'is_approved' => true,
                'is_verified' => true,
                'approved_by' => $adminId,
                'approved_at' => now(),
            ]);
        });

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $adminId,
            'action' => 'approve_driver',
            'resource_type' => 'user',
            'resource_id' => $driver->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Driver approved.',
            'driver' => $driver->fresh()->load('driverProfile'),
        ]);
    }

    public function reject(Request $request, User $driver): JsonResponse
    {
        if ($driver->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (! $driver->hasRole('driver')) {
            return response()->json(['message' => 'User is not a driver.'], 422);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $profile = $driver->driverProfile;

        if ($profile) {
            $profile->update([
                'is_approved' => false,
                'is_verified' => false,
            ]);
        }

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'reject_driver',
            'resource_type' => 'user',
            'resource_id' => $driver->id,
            'new_values' => ['reason' => $validated['reason']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Driver rejected.',
            'driver' => $driver->fresh()->load('driverProfile'),
        ]);
    }

    public function suspend(Request $request, User $driver): JsonResponse
    {
        if ($driver->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (! $driver->hasRole('driver')) {
            return response()->json(['message' => 'User is not a driver.'], 422);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $driver->is_active = false;
        $driver->is_online = false;
        $driver->save();

        $profile = $driver->driverProfile;
        if ($profile) {
            $profile->update(['is_approved' => false]);
        }

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'suspend_driver',
            'resource_type' => 'user',
            'resource_id' => $driver->id,
            'new_values' => ['reason' => $validated['reason']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Driver suspended.',
            'driver' => $driver->fresh()->load('driverProfile'),
        ]);
    }

    public function verifyDocuments(Request $request, User $driver): JsonResponse
    {
        if ($driver->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $verifications = KycVerification::where('user_id', $driver->id)
            ->latest()
            ->get();

        $profile = $driver->driverProfile;

        $documentStatus = [
            'license_number' => $profile?->license_number ? 'provided' : 'missing',
            'license_expiry' => $profile?->license_expiry
                ? ($profile->license_expiry->isPast() ? 'expired' : 'valid')
                : 'missing',
            'id_number' => $profile?->id_number ? 'provided' : 'missing',
            'date_of_birth' => $profile?->date_of_birth ? 'provided' : 'missing',
            'kyc_verified' => $driver->is_kyc_verified,
            'driver_approved' => $profile?->is_approved ?? false,
        ];

        return response()->json([
            'driver' => $driver->only(['id', 'name', 'email', 'is_kyc_verified']),
            'document_status' => $documentStatus,
            'kyc_verifications' => $verifications,
        ]);
    }
}
