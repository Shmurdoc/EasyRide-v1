<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class WalletTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
    }

    public function test_rider_can_get_wallet_balance(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 250.00,
        ]);

        Sanctum::actingAs($rider);
        $response = $this->getJson('/api/v1/wallet');

        $response->assertStatus(200)
            ->assertJsonPath('balance', 250);
    }

    public function test_rider_can_get_transactions(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $wallet = Wallet::create([
            'user_id' => $rider->id,
            'balance' => 100.00,
        ]);

        WalletTransaction::create([
            'wallet_id' => $wallet->id,
            'type' => 'credit',
            'amount' => 100.00,
            'balance_before' => 0.0,
            'balance_after' => 100.0,
            'description' => 'Deposit',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->getJson('/api/v1/wallet/transactions');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_rider_can_deposit_to_wallet(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 0.0,
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/wallet/deposit', [
            'amount' => 100.00,
            'payment_method' => 'payfast',
        ]);

        $response->assertStatus(201);
    }

    public function test_rider_can_withdraw_from_wallet(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 500.00,
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/wallet/withdraw', [
            'amount' => 100.00,
            'bank_account' => '1234567890',
            'bank_code' => '123',
            'bank_name' => 'Test Bank',
        ]);

        $response->assertStatus(201);
    }

    public function test_withdraw_fails_insufficient_balance(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 50.00,
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/wallet/withdraw', [
            'amount' => 100.00,
            'bank_account' => '1234567890',
            'bank_code' => '123',
            'bank_name' => 'Test Bank',
        ]);

        $response->assertStatus(422);
    }

    public function test_wallet_created_automatically_on_first_access(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/wallet');

        $response->assertStatus(200);
        $this->assertDatabaseHas('wallets', [
            'user_id' => $rider->id,
            'balance' => 0.0,
        ]);
    }

    public function test_unauthenticated_cannot_access_wallet(): void
    {
        $response = $this->getJson('/api/v1/wallet');

        $response->assertStatus(401);
    }

    public function test_deposit_creates_transaction_record(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $wallet = Wallet::create([
            'user_id' => $rider->id,
            'balance' => 0.0,
        ]);

        Sanctum::actingAs($rider);
        $this->postJson('/api/v1/wallet/deposit', [
            'amount' => 100.00,
            'payment_method' => 'payfast',
        ]);

        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $wallet->id,
            'type' => 'credit',
            'amount' => 100.00,
            'balance_before' => 0.0,
            'balance_after' => 0.0,
            'reference_type' => 'pending_topup',
        ]);
    }

    public function test_negative_deposit_amount_rejected(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 0.0,
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/wallet/deposit', [
            'amount' => -50.00,
            'payment_method' => 'payfast',
        ]);

        $response->assertStatus(422);
    }
}
