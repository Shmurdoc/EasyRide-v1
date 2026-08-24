<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Payment;
use App\Services\RefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    public function __construct(
        protected RefundService $refundService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $payments = Payment::whereHas('payer', fn ($q) => $q->where('tenant_id', $request->user()->tenant_id))
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->method, fn ($q, $v) => $q->where('method', $v))
            ->when($request->from_date, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->to_date, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->when($request->search, function ($q) use ($request) {
                $search = $request->search;
                $q->where(function ($qq) use ($search) {
                    $qq->where('gateway_reference', 'like', "%{$search}%")
                        ->orWhere('idempotency_key', 'like', "%{$search}%");
                });
            })
            ->with(['ride', 'payer', 'payee'])
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($payments);
    }

    public function refund(Request $request, Payment $payment): JsonResponse
    {
        if ($payment->payer_id !== $request->user()->id
            && $payment->payee_id !== $request->user()->id
            && ! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($payment->status === Payment::STATUS_REFUNDED) {
            return response()->json(['message' => 'Payment already refunded.'], 422);
        }

        $validated = $request->validate([
            'reason' => 'required|string|in:admin_override,driver_no_show,duplicate_charge,technical_issue,customer_complaint',
            'description' => 'nullable|string|max:500',
        ]);

        $result = $this->refundService->processRefund(
            $payment->ride,
            $validated['reason'],
            $request->user()->id,
        );

        if (! $result['success']) {
            return response()->json(['message' => $result['error']], 422);
        }

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'refund_payment',
            'resource_type' => 'payment',
            'resource_id' => $payment->id,
            'new_values' => [
                'reason' => $validated['reason'],
                'description' => $validated['description'] ?? null,
                'refund_amount' => $result['refund_amount'],
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Refund processed.',
            'refund' => $result,
        ]);
    }

    public function reconciliation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => 'sometimes|date',
            'to' => 'sometimes|date|after_or_equal:from',
            'method' => 'sometimes|string|in:wallet,cash,payfast,ozow,stripe',
        ]);

        $tenantId = $request->user()->tenant_id;

        $from = isset($validated['from'])
            ? \Carbon\Carbon::parse($validated['from'])
            : now()->startOfMonth();

        $to = isset($validated['to'])
            ? \Carbon\Carbon::parse($validated['to'])
            : now()->endOfMonth();

        $query = Payment::whereHas('payer', fn ($q) => $q->where('tenant_id', $tenantId))
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $to);

        if (isset($validated['method'])) {
            $query->where('method', $validated['method']);
        }

        $totalPayments = $query->count();
        $completedPayments = (clone $query)->where('status', Payment::STATUS_COMPLETED)->count();
        $refundedPayments = (clone $query)->where('status', Payment::STATUS_REFUNDED)->count();
        $pendingPayments = (clone $query)->where('status', Payment::STATUS_PENDING)->count();
        $failedPayments = (clone $query)->where('status', Payment::STATUS_FAILED)->count();

        $totalAmount = (float) (clone $query)->where('status', Payment::STATUS_COMPLETED)->sum('amount');
        $totalPlatformFees = (float) (clone $query)->where('status', Payment::STATUS_COMPLETED)->sum('platform_fee');
        $totalDriverPayouts = (float) (clone $query)->where('status', Payment::STATUS_COMPLETED)->sum('driver_payout');
        $totalRefunds = (float) (clone $query)->where('status', Payment::STATUS_REFUNDED)->sum('refund_amount');

        $byMethod = (clone $query)
            ->select('method', 'status')
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('SUM(amount) as total_amount')
            ->groupBy('method', 'status')
            ->get()
            ->groupBy('method')
            ->map(function ($statuses, $method) {
                return [
                    'count' => $statuses->sum('count'),
                    'total_amount' => (float) $statuses->sum('total_amount'),
                    'statuses' => $statuses->pluck('count', 'status'),
                ];
            });

        $cashReconciliation = Payment::whereHas('payer', fn ($q) => $q->where('tenant_id', $tenantId))
            ->where('method', 'cash')
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $to)
            ->selectRaw('SUM(cash_received) as total_cash_received')
            ->selectRaw('SUM(cash_discrepancy) as total_discrepancy')
            ->selectRaw('COUNT(CASE WHEN cash_reconciled = true THEN 1 END) as reconciled_count')
            ->selectRaw('COUNT(CASE WHEN cash_reconciled = false THEN 1 END) as unreconciled_count')
            ->first();

        AdminAuditLog::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'action' => 'reconciliation_report',
            'resource_type' => 'payment',
            'new_values' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'total_payments' => $totalPayments,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'summary' => [
                'total_payments' => $totalPayments,
                'completed' => $completedPayments,
                'refunded' => $refundedPayments,
                'pending' => $pendingPayments,
                'failed' => $failedPayments,
                'total_amount' => round($totalAmount, 2),
                'total_platform_fees' => round($totalPlatformFees, 2),
                'total_driver_payouts' => round($totalDriverPayouts, 2),
                'total_refunds' => round($totalRefunds, 2),
                'net_revenue' => round($totalPlatformFees - $totalRefunds, 2),
            ],
            'by_method' => $byMethod,
            'cash_reconciliation' => [
                'total_cash_received' => (float) $cashReconciliation->total_cash_received,
                'total_discrepancy' => (float) $cashReconciliation->total_discrepancy,
                'reconciled_count' => (int) $cashReconciliation->reconciled_count,
                'unreconciled_count' => (int) $cashReconciliation->unreconciled_count,
            ],
        ]);
    }
}
