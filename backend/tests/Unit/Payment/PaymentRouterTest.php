<?php

namespace Tests\Unit\Payment;

use App\Services\Payment\CashReconciliationService;
use App\Services\EscrowService;
use App\Services\Payment\OzowService;
use App\Services\Payment\PayFastService;
use App\Services\Payment\PaymentRouter;
use App\Services\Payment\PayoutService;
use App\Services\Payment\RefundService;
use App\Services\Payment\StripeService;
use Tests\TestCase;

class PaymentRouterTest extends TestCase
{
    public function test_processor_returns_stripe_for_stripe_gateway(): void
    {
        $router = $this->createRouter();
        $this->assertInstanceOf(StripeService::class, $router->processor('stripe'));
    }

    public function test_processor_returns_payfast_for_payfast_gateway(): void
    {
        $router = $this->createRouter();
        $this->assertInstanceOf(PayFastService::class, $router->processor('payfast'));
    }

    public function test_processor_returns_ozow_for_ozow_gateway(): void
    {
        $router = $this->createRouter();
        $this->assertInstanceOf(OzowService::class, $router->processor('ozow'));
    }

    public function test_processor_returns_null_for_unknown_gateway(): void
    {
        $router = $this->createRouter();
        $this->assertNull($router->processor('unknown'));
    }

    private function createRouter(): PaymentRouter
    {
        return new PaymentRouter(
            \Mockery::mock(StripeService::class),
            \Mockery::mock(PayFastService::class),
            \Mockery::mock(OzowService::class),
            \Mockery::mock(EscrowService::class),
            \Mockery::mock(CashReconciliationService::class),
            \Mockery::mock(RefundService::class),
            \Mockery::mock(PayoutService::class),
        );
    }

    protected function tearDown(): void
    {
        \Mockery::close();
        parent::tearDown();
    }
}
