<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\WalletTransactionType;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class WalletServiceTest extends TestCase
{
    use RefreshDatabase;

    private WalletService $walletService;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::setDefaultDriver('array');
        $this->walletService = new WalletService;
    }

    private function createUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'id' => \Str::uuid()->toString(),
            'name' => 'Test User',
            'email' => uniqid('user_') . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'rider',
            'phone_number' => '+27800000000',
            'is_verified' => true,
        ], $overrides));
    }

    private function createWallet(User $user, float $balance = 100.0): Wallet
    {
        return Wallet::create([
            'id' => \Str::uuid()->toString(),
            'user_id' => $user->id,
            'balance' => $balance,
            'currency' => 'ZAR',
        ]);
    }

    // ── getBalance ──────────────────────────────────────────────

    public function test_get_balance_returns_current_balance(): void
    {
        $user = $this->createUser();
        $wallet = $this->createWallet($user, 250.50);

        $balance = $this->walletService->getBalance($user);

        $this->assertEquals(250.50, $balance);
    }

    // ── topUp ───────────────────────────────────────────────────

    public function test_top_up_creates_pending_transaction_and_increases_pending_balance(): void
    {
        $user = $this->createUser();
        $wallet = $this->createWallet($user, 100.0);

        $result = $this->walletService->topUp($user, 50.0, 'card');

        $this->assertInstanceOf(Wallet::class, $result);
        // topUp() creates a PENDING transaction — balance should NOT change
        $this->assertEquals(100.0, $result->fresh()->balance);
        $this->assertEquals(50.0, $result->fresh()->pending_balance);
        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $wallet->id,
            'type' => 'credit',
            'amount' => 50.0,
            'reference_type' => 'pending_topup',
        ]);
    }

    // ── deduct ──────────────────────────────────────────────────

    public function test_deduct_decreases_balance(): void
    {
        $user = $this->createUser();
        $wallet = $this->createWallet($user, 100.0);

        $result = $this->walletService->deduct($user, 30.0, 'Ride payment');

        $this->assertInstanceOf(Wallet::class, $result);
        $this->assertEquals(70.0, $result->fresh()->balance);
        $this->assertDatabaseHas('wallets', [
            'user_id' => $user->id,
            'balance' => 70.0,
        ]);
    }

    public function test_deduct_fails_with_insufficient_balance(): void
    {
        $user = $this->createUser();
        $wallet = $this->createWallet($user, 20.0);

        $this->expectException(\RuntimeException::class);

        $this->walletService->deduct($user, 50.0, 'Ride payment');
    }

    // ── transfer ────────────────────────────────────────────────

    public function test_transfer_moves_funds_between_wallets(): void
    {
        $sender = $this->createUser(['name' => 'Sender']);
        $receiver = $this->createUser(['name' => 'Receiver']);
        $senderWallet = $this->createWallet($sender, 200.0);
        $receiverWallet = $this->createWallet($receiver, 50.0);

        $result = $this->walletService->transfer($sender, $receiver, 75.0);

        $this->assertTrue($result);
        $this->assertEquals(125.0, $senderWallet->fresh()->balance);
        $this->assertEquals(125.0, $receiverWallet->fresh()->balance);
    }

    public function test_transfer_fails_when_sender_has_insufficient_funds(): void
    {
        $sender = $this->createUser(['name' => 'Sender']);
        $receiver = $this->createUser(['name' => 'Receiver']);
        $senderWallet = $this->createWallet($sender, 10.0);
        $receiverWallet = $this->createWallet($receiver, 50.0);

        $this->expectException(\RuntimeException::class);

        $this->walletService->transfer($sender, $receiver, 75.0);
    }
}
