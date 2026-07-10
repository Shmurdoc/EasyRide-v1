<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Ride;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RideController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $rides = Ride::query()
            ->where('tenant_id', $tenantId)
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->category, fn ($q, $v) => $q->where('category', $v))
            ->when($request->driver_id, fn ($q, $v) => $q->where('driver_id', $v))
            ->when($request->rider_id, fn ($q, $v) => $q->where('rider_id', $v))
            ->when($request->from_date, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->to_date, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->when($request->search, function ($q) use ($request) {
                $search = $request->search;
                $q->where(function ($qq) use ($search) {
                    $qq->where('pickup_address', 'like', "%{$search}%")
                        ->orWhere('dropoff_address', 'like', "%{$search}%");
                });
            })
            ->with(['rider', 'driver', 'payment', 'rating'])
            ->latest()
            ->paginate($request->per_page ?? 15);

        return response()->json($rides);
    }

    public function show(Ride $ride): JsonResponse
    {
        if ($ride->tenant_id !== request()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $ride->load([
            'rider',
            'driver',
            'payment',
            'rating',
            'statusHistory',
            'delivery',
        ]);

        $timeline = $ride->statusHistory
            ->sortBy('created_at')
            ->map(fn ($h) => [
                'from' => $h->from_status,
                'to' => $h->to_status,
                'actor_id' => $h->actor_id,
                'reason' => $h->reason,
                'created_at' => $h->created_at,
            ]);

        return response()->json([
            'ride' => $ride,
            'timeline' => $timeline,
        ]);
    }

    public function dispute(Request $request, Ride $ride): JsonResponse
    {
        if ($ride->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $payment = $ride->payment;

        if ($payment && ! $payment->dispute_hold) {
            $payment->update([
                'dispute_hold' => true,
                'held_until' => now()->addDays(7),
            ]);
        }

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'dispute_ride',
            'resource_type' => 'ride',
            'resource_id' => $ride->id,
            'new_values' => [
                'reason' => $validated['reason'],
                'description' => $validated['description'] ?? null,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Ride flagged for review.',
            'ride' => $ride->fresh(),
        ]);
    }

    public function resolve(Request $request, Ride $ride): JsonResponse
    {
        if ($ride->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'resolution' => 'required|string|in:favor_rider,favor_driver,partial_refund,dismissed',
            'notes' => 'nullable|string|max:1000',
            'refund_amount' => 'nullable|numeric|min:0',
        ]);

        $payment = $ride->payment;

        if ($payment && $payment->dispute_hold) {
            $payment->update([
                'dispute_hold' => false,
                'held_until' => null,
            ]);

            if ($validated['resolution'] === 'partial_refund' && isset($validated['refund_amount'])) {
                $refundAmount = min((float) $validated['refund_amount'], (float) $payment->amount);
                $payment->update([
                    'status' => 'refunded',
                    'refunded_at' => now(),
                    'refund_reason' => 'admin_dispute_resolution',
                    'refund_amount' => $refundAmount,
                    'refunded_by' => $request->user()->id,
                ]);
            }
        }

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'resolve_dispute',
            'resource_type' => 'ride',
            'resource_id' => $ride->id,
            'new_values' => [
                'resolution' => $validated['resolution'],
                'notes' => $validated['notes'] ?? null,
                'refund_amount' => $validated['refund_amount'] ?? null,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Dispute resolved.',
            'ride' => $ride->fresh()->load('payment'),
        ]);
    }
}
