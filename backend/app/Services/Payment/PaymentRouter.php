<?php

namespace App\Services\Payment;

use App\Services\EscrowService;

class PaymentRouter
{
    public function __construct(
        protected StripeService $stripe,
        protected PayFastService $payfast,
        protected OzowService $ozow,
        protected EscrowService $escrow,
        protected CashReconciliationService $cash,
        protected RefundService $refund,
        protected PayoutService $payout,
    ) {}

    public function processor(string $gateway): StripeService|PayFastService|OzowService|null
    {
        return match ($gateway) {
            'stripe' => $this->stripe,
            'payfast' => $this->payfast,
            'ozow' => $this->ozow,
            default => null,
        };
    }
}
