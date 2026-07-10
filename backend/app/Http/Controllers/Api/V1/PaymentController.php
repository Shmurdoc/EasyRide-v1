<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\RideStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Payment\ConfirmStripePaymentRequest;
use App\Http\Requests\Api\V1\Payment\CreateStripeIntentRequest;
use App\Http\Requests\Api\V1\Payment\DisputeRequest;
use App\Http\Requests\Api\V1\Payment\RefundRequest;
use App\Http\Requests\Api\V1\ProcessPaymentRequest;
use App\Models\Dispute;
use App\Models\Payment;
use App\Models\Ride;
use App\Models\WebhookEvent;
use App\Services\CashPaymentService;
use App\Services\EscrowService;
use App\Services\OzowService;
use App\Services\PayFastService;
use App\Services\PaymentService;
use App\Services\RefundService;
use App\Services\StripeService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use App\Http\Resources\PaymentResource;

class PaymentController extends Controller
{
    public function __construct(
        protected PaymentService $paymentService,
        protected PayFastService $payFastService,
        protected OzowService $ozowService,
        protected EscrowService $escrowService,
        protected RefundService $refundService,
        protected CashPaymentService $cashPaymentService,
        protected StripeService $stripeService,
        protected WalletService $walletService,
    ) {}

    private function isWebhookIpAllowed(string $gateway): bool
    {
        if (config('webhook_ips.bypass_in_local', true)) {
            return true;
        }

        $ip = request()->ip();
        $allowedIps = config("webhook_ips.{$gateway}", []);

        foreach ($allowedIps as $allowed) {
            if (str_contains($allowed, '/')) {
                if ($this->ipInCidr($ip, $allowed)) {
                    return true;
                }
            } elseif ($ip === $allowed) {
                return true;
            }
        }

        return false;
    }

    private function ipInCidr(string $ip, string $cidr): bool
    {
        [$subnet, $mask] = explode('/', $cidr);
        $ipLong = ip2long($ip);
        $subnetLong = ip2long($subnet);
        $maskLong = -1 << (32 - (int) $mask);

        return ($ipLong & $maskLong) === ($subnetLong & $maskLong);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $payments = $this->paymentService->getUserPayments(
            $request->user(),
            $request->only(['status', 'method']),
            $request->per_page ?? 15,
        );

        return PaymentResource::collection($payments);
    }

    public function show(Payment $payment): JsonResponse
    {
        $user = request()->user();
        if ($payment->payer_id !== $user->id && $payment->payee_id !== $user->id && ! $user->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json(new PaymentResource($payment->load(['ride', 'payer', 'payee'])));
    }

    public function methods(): JsonResponse
    {
        return response()->json([
            'methods' => $this->paymentService->getPaymentMethods(),
        ]);
    }

    public function processRidePayment(ProcessPaymentRequest $request, Ride $ride): JsonResponse
    {
        if ($ride->rider_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $status = $ride->status instanceof RideStatus ? $ride->status->value : $ride->status;
        if ($status !== RideStatus::COMPLETED->value) {
            return response()->json(['message' => 'Ride is not completed.'], 422);
        }

        if ($ride->payment) {
            return response()->json(['message' => 'Payment already processed.'], 422);
        }

        $velocity = $this->paymentService->checkPaymentVelocity(
            $request->user()->id,
            (float) $ride->total_fare,
        );

        if ($velocity !== null) {
            return response()->json([
                'message' => $velocity['message'],
                'code' => $velocity['code'],
            ], 429);
        }

        $validated = $request->validated();
        $method = $validated['payment_method'];

        if ($method === 'wallet') {
            $payment = $this->escrowService->holdPayment($ride, 'wallet');

            return response()->json(['payment' => $payment, 'message' => 'Payment processed via wallet.'], 201);
        }

        if ($method === 'cash') {
            $payment = $this->cashPaymentService->processCashPayment($ride);

            return response()->json(['payment' => $payment, 'message' => 'Cash payment recorded.'], 201);
        }

        try {
            $result = $this->paymentService->processPayment($ride, $method);

            return response()->json(new PaymentResource($result->load(['ride', 'payer'])), 201);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function payfastWebhook(Request $request): JsonResponse
    {
        if (! $this->isWebhookIpAllowed('payfast')) {
            return response()->json(['status' => 'forbidden'], 403);
        }

        $webhookEvent = WebhookEvent::create([
            'gateway' => 'payfast',
            'event_type' => $request->input('payment_status', 'unknown'),
            'payload' => $request->all(),
            'status' => 'processing',
        ]);

        if ($this->payFastService->verifyItn($request)) {
            $paymentId = $request->input('m_payment_id');
            $payment = Payment::find($paymentId);

            if ($payment && $payment->status === Payment::STATUS_PENDING) {
                $this->escrowService->holdPayment(
                    $payment->ride,
                    'payfast',
                    ['gateway' => 'payfast', 'reference' => $request->input('pf_payment_id')],
                );
            } else {
                $this->walletService->confirmTopUpByGatewayReference((string) $paymentId);
            }

            $webhookEvent->update(['status' => 'processed', 'processed_at' => now()]);

            return response()->json(['status' => 'success']);
        }

        $webhookEvent->update(['status' => 'failed', 'error_message' => 'Itn verification failed', 'processed_at' => now()]);

        return response()->json(['status' => 'invalid'], 400);
    }

    public function payfastReturn(Request $request): JsonResponse
    {
        $paymentId = $request->input('m_payment_id');
        $payment = Payment::find($paymentId);

        return response()->json([
            'status' => 'returned',
            'payment_status' => $payment?->status ?? 'unknown',
        ]);
    }

    public function ozowWebhook(Request $request): JsonResponse
    {
        if (! $this->isWebhookIpAllowed('ozow')) {
            return response()->json(['status' => 'forbidden'], 403);
        }

        $webhookEvent = WebhookEvent::create([
            'gateway' => 'ozow',
            'event_type' => $request->input('Status') ?? $request->input('status', 'unknown'),
            'payload' => $request->all(),
            'status' => 'processing',
        ]);

        if ($this->ozowService->verifyWebhook($request)) {
            $transactionReference = $request->input('TransactionReference') ?? $request->input('transactionReference');
            $status = $request->input('Status') ?? $request->input('status');

            $payment = Payment::find($transactionReference);

            if ($payment) {
                if (strtolower((string) $status) === 'complete') {
                    $this->escrowService->holdPayment(
                        $payment->ride,
                        'ozow',
                        ['gateway' => 'ozow', 'reference' => $request->input('PaymentReference')],
                    );
                } else {
                    $payment->update(['status' => Payment::STATUS_FAILED]);
                }
            } else {
                if (strtolower((string) $status) === 'complete') {
                    $this->walletService->confirmTopUpByGatewayReference((string) $transactionReference);
                }
            }

            $webhookEvent->update(['status' => 'processed', 'processed_at' => now()]);

            return response()->json(['status' => 'success']);
        }

        $webhookEvent->update(['status' => 'failed', 'error_message' => 'Webhook verification failed', 'processed_at' => now()]);

        return response()->json(['status' => 'invalid'], 400);
    }

    public function ozowReturn(Request $request): JsonResponse
    {
        $paymentId = $request->input('transactionReference');
        $payment = Payment::find($paymentId);

        return response()->json([
            'status' => 'returned',
            'payment_status' => $payment?->status ?? 'unknown',
        ]);
    }

    public function stripeWebhook(Request $request): JsonResponse
    {
        $webhookEvent = WebhookEvent::create([
            'gateway' => 'stripe',
            'event_type' => $request->input('type', 'unknown'),
            'payload' => $request->all(),
            'status' => 'processing',
        ]);

        $result = $this->stripeService->handleWebhook($request);

        if (isset($result['error'])) {
            $webhookEvent->update(['status' => 'failed', 'error_message' => $result['error'], 'processed_at' => now()]);

            return response()->json(['error' => $result['error']], 400);
        }

        if ($result['type'] === 'payment_intent.succeeded') {
            $intentId = $result['data']->id;

            $payment = Payment::where('gateway_reference', $intentId)->first();

            if ($payment && $payment->status === Payment::STATUS_PENDING) {
                $this->escrowService->holdPayment(
                    $payment->ride,
                    'stripe',
                    ['gateway' => 'stripe', 'reference' => $intentId],
                );
            } else {
                $this->walletService->confirmTopUpByGatewayReference($intentId);
            }
        }

        if ($result['type'] === 'payment_intent.payment_failed') {
            $intentId = $result['data']->id;

            $payment = Payment::where('gateway_reference', $intentId)->first();

            if ($payment) {
                $payment->update(['status' => Payment::STATUS_FAILED]);
            }
        }

        $webhookEvent->update(['status' => 'processed', 'processed_at' => now()]);

        return response()->json(['status' => 'success']);
    }

    public function twilioWebhook(Request $request): JsonResponse
    {
        return response()->json(['status' => 'received']);
    }

    public function createStripeIntent(CreateStripeIntentRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $amount = (float) $validated['amount'];

        if (! empty($validated['ride_id'])) {
            $ride = Ride::findOrFail($validated['ride_id']);
            if ($ride->rider_id !== $request->user()->id) {
                return response()->json(['message' => 'Unauthorized.'], 403);
            }
            if ($amount !== (float) $ride->total_fare) {
                return response()->json(['message' => 'Amount must match ride total fare.'], 422);
            }
        } else {
            $maxAmount = config('app.max_stripe_amount', 50000);
            if ($amount > $maxAmount) {
                return response()->json(['message' => 'Amount exceeds maximum of R'.$maxAmount.'.'], 422);
            }
        }

        $intent = $this->stripeService->createPaymentIntent(
            $amount,
            $validated['currency'] ?? 'zar',
        );

        return response()->json($intent);
    }

    public function confirmStripePayment(ConfirmStripePaymentRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $result = $this->stripeService->confirmPayment($validated['payment_intent_id']);

        return response()->json($result);
    }

    public function refund(RefundRequest $request, Payment $payment): JsonResponse
    {
        $user = $request->user();

        if ($payment->payer_id !== $user->id && $payment->payee_id !== $user->id && ! $user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        try {
            $result = $this->refundService->processRefund(
                $payment->ride,
                $request->validated('reason'),
                $user->id,
            );

            if (! $result['success']) {
                return response()->json($result, 422);
            }

            return response()->json($result);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function dispute(DisputeRequest $request, Payment $payment): JsonResponse
    {
        if ($payment->payer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (! $this->escrowService->isWithinDisputeWindow($payment->ride)) {
            return response()->json(['message' => 'Dispute window has expired (24 hours after ride completion).'], 422);
        }

        if ($payment->dispute) {
            return response()->json(['message' => 'A dispute already exists for this payment.'], 422);
        }

        $validated = $request->validated();

        Dispute::create([
            'ride_id' => $payment->ride_id,
            'payment_id' => $payment->id,
            'raised_by' => $request->user()->id,
            'reason' => $validated['reason'],
            'description' => $validated['description'],
        ]);

        $this->escrowService->holdPendingFundsForDispute($payment);

        return response()->json(['message' => 'Dispute raised successfully.'], 201);
    }
}
