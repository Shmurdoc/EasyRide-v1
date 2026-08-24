<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\DriverPayout;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WalletController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $totalPlatformBalance = (float) Wallet::where('tenant_id', $tenantId)->sum('balance');

        $pendingPayouts = DriverPayout::where('tenant_id', $tenantId)
            ->where('status', 'pending')
            ->sum('amount');

        $completedThisMonth = DriverPayout::where('tenant_id', $tenantId)
            ->where('status', 'paid')
            ->whereMonth('processed_at', now()->month)
            ->sum('amount');

        $driversWithPending = DriverPayout::where('tenant_id', $tenantId)
            ->where('status', 'pending')
            ->distinct('driver_id')
            ->count('driver_id');

        return response()->json([
            'total_platform_balance' => round($totalPlatformBalance, 2),
            'pending_payouts' => round((float) $pendingPayouts, 2),
            'completed_this_month' => round($completedThisMonth, 2),
            'drivers_with_pending' => (int) $driversWithPending,
        ]);
    }

    public function driverWallets(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $wallets = Wallet::where('tenant_id', $tenantId)
            ->with('user:id,name,email')
            ->when($request->min_balance, fn ($q, $v) => $q->where('balance', '>=', $v))
            ->when($request->max_balance, fn ($q, $v) => $q->where('balance', '<=', $v))
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        $wallets->getCollection()->transform(function ($wallet) {
            $totalEarned = WalletTransaction::where('wallet_id', $wallet->id)
                ->whereIn('type', ['deposit', 'earning', 'bonus', 'refund'])
                ->sum('amount');

            $totalWithdrawn = WalletTransaction::where('wallet_id', $wallet->id)
                ->where('type', 'withdrawal')
                ->sum('amount');

            $lastTransaction = WalletTransaction::where('wallet_id', $wallet->id)
                ->latest()
                ->first();

            return [
                'id' => $wallet->id,
                'user' => $wallet->user,
                'balance' => (float) $wallet->balance,
                'currency' => $wallet->currency,
                'total_earned' => round((float) $totalEarned, 2),
                'total_withdrawn' => round((float) $totalWithdrawn, 2),
                'last_transaction' => $lastTransaction ? [
                    'type' => $lastTransaction->type,
                    'amount' => (float) $lastTransaction->amount,
                    'created_at' => $lastTransaction->created_at,
                ] : null,
            ];
        });

        return response()->json($wallets);
    }

    public function walletTransactions(Request $request, Wallet $wallet): JsonResponse
    {
        $transactions = WalletTransaction::where('wallet_id', $wallet->id)
            ->when($request->type, fn ($q, $v) => $q->where('type', $v))
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($transactions);
    }

    public function payoutQueue(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $payouts = DriverPayout::where('tenant_id', $tenantId)
            ->where('status', 'pending')
            ->with('driver:id,name,email')
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($payouts);
    }

    public function approvePayout(Request $request, DriverPayout $payout): JsonResponse
    {
        if ($payout->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($payout->status !== 'pending') {
            return response()->json(['message' => 'Payout is not pending.'], 422);
        }

        $payout->update([
            'status' => 'approved',
            'notes' => $request->input('notes', null),
        ]);

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'approve_payout',
            'resource_type' => 'driver_payout',
            'resource_id' => $payout->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Payout approved.', 'payout' => $payout->fresh()->load('driver')]);
    }

    public function rejectPayout(Request $request, DriverPayout $payout): JsonResponse
    {
        if ($payout->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($payout->status !== 'pending') {
            return response()->json(['message' => 'Payout is not pending.'], 422);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $payout->update([
            'status' => 'rejected',
            'notes' => $validated['reason'],
        ]);

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'reject_payout',
            'resource_type' => 'driver_payout',
            'resource_id' => $payout->id,
            'new_values' => ['reason' => $validated['reason']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Payout rejected.', 'payout' => $payout->fresh()->load('driver')]);
    }

    public function processPayout(Request $request, DriverPayout $payout): JsonResponse
    {
        if ($payout->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (! in_array($payout->status, ['pending', 'approved'])) {
            return response()->json(['message' => 'Payout cannot be processed.'], 422);
        }

        $payout->update([
            'status' => 'paid',
            'processed_at' => now(),
            'reference' => $request->input('reference', null),
        ]);

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'process_payout',
            'resource_type' => 'driver_payout',
            'resource_id' => $payout->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Payout processed.', 'payout' => $payout->fresh()->load('driver')]);
    }

    public function bulkApprovePayouts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payout_ids' => 'required|array',
            'payout_ids.*' => 'string|exists:driver_payouts,id',
        ]);

        $tenantId = $request->user()->tenant_id;

        $updated = DriverPayout::where('tenant_id', $tenantId)
            ->whereIn('id', $validated['payout_ids'])
            ->where('status', 'pending')
            ->update(['status' => 'approved']);

        AdminAuditLog::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'action' => 'bulk_approve_payouts',
            'resource_type' => 'driver_payout',
            'new_values' => ['payout_ids' => $validated['payout_ids'], 'count' => $updated],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => "{$updated} payouts approved.", 'count' => $updated]);
    }

    public function transactionHistory(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $transactions = WalletTransaction::whereHas('wallet', fn ($q) => $q->where('tenant_id', $tenantId))
            ->when($request->type, fn ($q, $v) => $q->where('type', $v))
            ->when($request->from_date, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->to_date, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->with('wallet.user:id,name,email')
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($transactions);
    }

    public function cashReconciliation(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $from = $request->input('from', now()->startOfMonth()->toDateString());
        $to = $request->input('to', now()->endOfMonth()->toDateString());

        $cashPayments = \App\Models\Payment::whereHas('payer', fn ($q) => $q->where('tenant_id', $tenantId))
            ->where('method', 'cash')
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to)
            ->with('payer:id,name')
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        $summary = \App\Models\Payment::whereHas('payer', fn ($q) => $q->where('tenant_id', $tenantId))
            ->where('method', 'cash')
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to)
            ->selectRaw('SUM(cash_received) as total_cash_received')
            ->selectRaw('SUM(cash_discrepancy) as total_discrepancy')
            ->selectRaw('COUNT(CASE WHEN cash_reconciled = true THEN 1 END) as reconciled_count')
            ->selectRaw('COUNT(CASE WHEN cash_reconciled = false THEN 1 END) as unreconciled_count')
            ->first();

        return response()->json([
            'payments' => $cashPayments,
            'summary' => [
                'total_cash_received' => (float) $summary->total_cash_received,
                'total_discrepancy' => (float) $summary->total_discrepancy,
                'reconciled_count' => (int) $summary->reconciled_count,
                'unreconciled_count' => (int) $summary->unreconciled_count,
            ],
        ]);
    }

    public function reconcilePayment(Request $request, \App\Models\Payment $payment): JsonResponse
    {
        if ($payment->method !== 'cash') {
            return response()->json(['message' => 'Only cash payments can be reconciled.'], 422);
        }

        $payment->update(['cash_reconciled' => true]);

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'reconcile_cash_payment',
            'resource_type' => 'payment',
            'resource_id' => $payment->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Payment reconciled.', 'payment' => $payment]);
    }
}
