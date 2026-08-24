<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class WalletService
{
    /**
     * Redis lock key prefix for wallet operations.
     */
    private const LOCK_PREFIX = 'wallet_lock_';

    /**
     * Lock timeout in seconds for concurrent operations.
     */
    private const LOCK_TIMEOUT = 10;

    public function getOrCreateWallet(User $user, string $currency = 'ZAR'): Wallet
    {
        return Wallet::firstOrCreate(
            ['user_id' => $user->id],
            ['tenant_id' => $user->tenant_id, 'balance' => 0.0, 'pending_balance' => 0.0, 'currency' => $currency],
        );
    }

    /**
     * Get the wallet balance. Accepts either a User or Wallet model for
     * backward compatibility. Always reads fresh from DB.
     */
    public function getBalance(User|Wallet $entity): float
    {
        if ($entity instanceof User) {
            $wallet = $this->getOrCreateWallet($entity);

            return (float) $wallet->balance;
        }

        return (float) $entity->fresh()->balance;
    }

    /**
     * Initiate a wallet top-up via an external gateway. Creates a pending
     * transaction and returns the wallet.
     */
    public function topUp(User $user, float $amount, string $method): Wallet
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Top-up amount must be greater than zero.');
        }

        $wallet = $this->getOrCreateWallet($user);

        $this->pendingTopUp(
            $wallet,
            $amount,
            'pending_topup',
            $wallet->id,
            "Wallet top-up via {$method} (pending gateway confirmation)",
        );

        Log::channel('wallet-audit')->info('WALLET_TOPUP_INITIATED_VIA_USER', [
            'user_id' => $user->id,
            'wallet_id' => $wallet->id,
            'amount' => $amount,
            'method' => $method,
            'ip' => request()->ip(),
        ]);

        return $wallet->fresh();
    }

    /**
     * Confirm a pending top-up after gateway callback using gateway reference.
     * Returns the fresh wallet with updated balance.
     */
    public function confirmTopUpByUser(User $user, string $gatewayRef): Wallet
    {
        $wallet = $this->getOrCreateWallet($user);

        $confirmed = $this->confirmTopUpByGatewayReference($gatewayRef);

        if (! $confirmed) {
            throw new RuntimeException('Transaction not found or already confirmed.');
        }

        Log::channel('wallet-audit')->info('WALLET_TOPUP_CONFIRMED_BY_USER', [
            'user_id' => $user->id,
            'gateway_ref' => $gatewayRef,
        ]);

        return $wallet->fresh();
    }

    /**
     * Deduct from a user's wallet using a Redis lock to prevent concurrent
     * over-draws. Throws on insufficient balance.
     */
    public function deduct(User $user, float $amount, string $description): Wallet
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Deduction amount must be greater than zero.');
        }

        $lockKey = self::LOCK_PREFIX . $user->id;

        $lock = Cache::lock($lockKey, self::LOCK_TIMEOUT);

        if (! $lock->get()) {
            throw new RuntimeException('Wallet is busy, please try again.');
        }

        try {
            $wallet = $this->getOrCreateWallet($user);

            $this->debit(
                $wallet,
                $amount,
                'deduction',
                $user->id,
                $description,
            );

            Log::channel('wallet-audit')->info('WALLET_DEDUCTED', [
                'user_id' => $user->id,
                'amount' => $amount,
                'description' => $description,
            ]);

            return $wallet->fresh();
        } finally {
            $lock->release();
        }
    }

    /**
     * Atomic wallet-to-wallet transfer using a deterministic lock ordering
     * to prevent deadlocks.
     */
    public function transfer(User $from, User $to, float $amount): bool
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Transfer amount must be greater than zero.');
        }

        if ($from->id === $to->id) {
            throw new \InvalidArgumentException('Cannot transfer to the same wallet.');
        }

        $lockIds = [$from->id, $to->id];
        sort($lockIds);

        $lockKeyFrom = self::LOCK_PREFIX . $lockIds[0];
        $lockKeyTo = self::LOCK_PREFIX . $lockIds[1];

        $lockFrom = Cache::lock($lockKeyFrom, self::LOCK_TIMEOUT);
        $lockTo = Cache::lock($lockKeyTo, self::LOCK_TIMEOUT);

        if (! $lockFrom->get()) {
            throw new RuntimeException('Source wallet is busy, please try again.');
        }

        if (! $lockTo->get()) {
            $lockFrom->release();
            throw new RuntimeException('Destination wallet is busy, please try again.');
        }

        try {
            return DB::transaction(function () use ($from, $to, $amount) {
                $senderWallet = Wallet::where('user_id', $from->id)->lockForUpdate()->first();
                $receiverWallet = Wallet::where('user_id', $to->id)->lockForUpdate()->first();

                if (! $senderWallet || ! $receiverWallet) {
                    throw new RuntimeException('One or both wallets not found.');
                }

                if ((float) $senderWallet->balance < $amount) {
                    throw new RuntimeException('Insufficient funds for transfer.');
                }

                $senderBalanceBefore = (float) $senderWallet->balance;
                $receiverBalanceBefore = (float) $receiverWallet->balance;

                $senderWallet->decrement('balance', $amount);
                $receiverWallet->increment('balance', $amount);

                $senderWallet->transactions()->create([
                    'type' => 'debit',
                    'amount' => $amount,
                    'balance_before' => $senderBalanceBefore,
                    'balance_after' => (float) $senderWallet->fresh()->balance,
                    'reference_type' => 'transfer_out',
                    'reference_id' => $to->id,
                    'description' => "Transfer to user {$to->id}",
                ]);

                $receiverWallet->transactions()->create([
                    'type' => 'credit',
                    'amount' => $amount,
                    'balance_before' => $receiverBalanceBefore,
                    'balance_after' => (float) $receiverWallet->fresh()->balance,
                    'reference_type' => 'transfer_in',
                    'reference_id' => $from->id,
                    'description' => "Transfer from user {$from->id}",
                ]);

                Log::info('Wallet transfer completed', [
                    'from_user' => $from->id,
                    'to_user' => $to->id,
                    'amount' => $amount,
                ]);

                return true;
            });
        } finally {
            $lockTo->release();
            $lockFrom->release();
        }
    }

    /**
     * Initiate a wallet top-up, creating a pending transaction.
     * Stores the transaction ID as gateway_reference for webhook matching.
     */
    public function initiateTopUp(Wallet $wallet, float $amount, string $method): WalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Top-up amount must be greater than zero.');
        }

        if ($amount > 100000) {
            throw new \InvalidArgumentException('Top-up amount exceeds maximum limit of R100,000.');
        }

        $transaction = $this->pendingTopUp(
            $wallet,
            $amount,
            'pending_topup',
            $wallet->id,
            "Wallet deposit via {$method} (pending gateway confirmation)",
        );

        $transaction->update(['gateway_reference' => $transaction->id]);

        Log::channel('wallet-audit')->info('WALLET_TOPUP_INITIATED', [
            'wallet_id' => $wallet->id,
            'transaction_id' => $transaction->id,
            'amount' => $amount,
            'method' => $method,
            'gateway_reference' => $transaction->id,
            'ip' => request()->ip(),
        ]);

        return $transaction;
    }

    /**
     * Process a wallet withdrawal request.
     */
    public function withdraw(Wallet $wallet, float $amount): WalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Withdrawal amount must be greater than zero.');
        }

        if ($amount > 100000) {
            throw new \InvalidArgumentException('Withdrawal amount exceeds maximum limit of R100,000.');
        }

        if ((float) $wallet->fresh()->balance < $amount) {
            throw new \RuntimeException('Insufficient wallet balance.');
        }

        return $this->debit(
            $wallet,
            $amount,
            'withdrawal',
            $wallet->id,
            'Wallet withdrawal (pending admin approval)',
        );
    }

    /**
     * Get paginated wallet transaction history for a user or wallet with optional filters.
     */
    public function getTransactions(User|Wallet $entity, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        if ($entity instanceof Wallet) {
            $wallet = $entity;
        } else {
            $wallet = Wallet::where('user_id', $entity->id)->first();
        }

        if (! $wallet) {
            return new LengthAwarePaginator([], 0, $perPage);
        }

        return $wallet->transactions()
            ->when($filters['type'] ?? null, fn ($q, $v) => $q->where('type', $v))
            ->latest()
            ->paginate($perPage);
    }

    public function credit(
        Wallet $wallet,
        float $amount,
        string $referenceType,
        string $referenceId,
        string $description = '',
    ): WalletTransaction {
        return DB::transaction(function () use ($wallet, $amount, $referenceType, $referenceId, $description) {
            $freshWallet = Wallet::where('id', $wallet->id)->lockForUpdate()->first();

            $balanceBefore = (float) $freshWallet->balance;

            $freshWallet->increment('balance', $amount);

            $transaction = $freshWallet->transactions()->create([
                'type' => 'credit',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => (float) $freshWallet->fresh()->balance,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => $description,
            ]);

            Log::channel('wallet-audit')->info('WALLET_CREDIT', [
                'wallet_id' => $wallet->id,
                'transaction_id' => $transaction->id,
                'amount' => $amount,
                'reference_type' => $referenceType,
                'balance_before' => $balanceBefore,
                'balance_after' => (float) $freshWallet->fresh()->balance,
            ]);

            return $transaction;
        });
    }

    public function debit(
        Wallet $wallet,
        float $amount,
        string $referenceType,
        string $referenceId,
        string $description = '',
    ): WalletTransaction {
        return DB::transaction(function () use ($wallet, $amount, $referenceType, $referenceId, $description) {
            $freshWallet = Wallet::where('id', $wallet->id)->lockForUpdate()->first();

            if ((float) $freshWallet->balance < $amount) {
                throw new \RuntimeException('Insufficient wallet balance.');
            }

            $balanceBefore = (float) $freshWallet->balance;

            $freshWallet->decrement('balance', $amount);

            $transaction = $freshWallet->transactions()->create([
                'type' => 'debit',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => (float) $freshWallet->fresh()->balance,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => $description,
            ]);

            Log::channel('wallet-audit')->info('WALLET_DEBIT', [
                'wallet_id' => $wallet->id,
                'transaction_id' => $transaction->id,
                'amount' => $amount,
                'reference_type' => $referenceType,
                'balance_before' => $balanceBefore,
                'balance_after' => (float) $freshWallet->fresh()->balance,
            ]);

            return $transaction;
        });
    }

    public function getBalanceFromWallet(Wallet $wallet): float
    {
        return (float) $wallet->balance;
    }

    public function pendingTopUp(
        Wallet $wallet,
        float $amount,
        string $referenceType,
        string $referenceId,
        string $description = '',
        ?string $gatewayReference = null,
    ): WalletTransaction {
        return DB::transaction(function () use ($wallet, $amount, $referenceType, $referenceId, $description, $gatewayReference) {
            $freshWallet = Wallet::where('id', $wallet->id)->lockForUpdate()->first();

            $freshWallet->increment('pending_balance', $amount);

            $transaction = $freshWallet->transactions()->create([
                'type' => 'credit',
                'amount' => $amount,
                'balance_before' => (float) $freshWallet->balance,
                'balance_after' => (float) $freshWallet->balance,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => $description,
                'gateway_reference' => $gatewayReference,
            ]);

            Log::channel('wallet-audit')->info('WALLET_PENDING_TOPUP', [
                'wallet_id' => $wallet->id,
                'transaction_id' => $transaction->id,
                'amount' => $amount,
                'pending_balance_increment' => $amount,
            ]);

            return $transaction;
        });
    }

    public function confirmTopUpById(Wallet $wallet, string $transactionId): bool
    {
        return DB::transaction(function () use ($wallet, $transactionId) {
            $transaction = WalletTransaction::where('wallet_id', $wallet->id)
                ->where('id', $transactionId)
                ->where('reference_type', 'pending_topup')
                ->first();

            if (! $transaction) {
                Log::channel('wallet-audit')->warning('WALLET_CONFIRM_FAILED', [
                    'wallet_id' => $wallet->id,
                    'transaction_id' => $transactionId,
                    'reason' => 'Transaction not found or already confirmed',
                ]);

                return false;
            }

            $freshWallet = Wallet::where('id', $wallet->id)->lockForUpdate()->first();

            $balanceBefore = (float) $freshWallet->balance;

            $freshWallet->increment('balance', (float) $transaction->amount);
            $freshWallet->decrement('pending_balance', (float) $transaction->amount);

            $transaction->update([
                'reference_type' => 'topup_confirmed',
                'description' => str_replace('pending gateway confirmation', 'gateway confirmed', $transaction->description),
            ]);

            Log::channel('wallet-audit')->info('WALLET_TOPUP_CONFIRMED', [
                'wallet_id' => $wallet->id,
                'transaction_id' => $transactionId,
                'amount' => (float) $transaction->amount,
                'balance_before' => $balanceBefore,
                'balance_after' => (float) $freshWallet->fresh()->balance,
            ]);

            return true;
        });
    }

    public function confirmTopUpByGatewayReference(string $gatewayReference): bool
    {
        $transaction = WalletTransaction::where('gateway_reference', $gatewayReference)
            ->where('reference_type', 'pending_topup')
            ->first();

        if (! $transaction) {
            Log::channel('wallet-audit')->warning('WALLET_GATEWAY_CONFIRM_FAILED', [
                'gateway_reference' => $gatewayReference,
                'reason' => 'No pending transaction found for gateway reference',
            ]);

            return false;
        }

        $wallet = $transaction->wallet;

        Log::channel('wallet-audit')->info('WALLET_GATEWAY_CONFIRM_RECEIVED', [
            'wallet_id' => $wallet->id,
            'transaction_id' => $transaction->id,
            'gateway_reference' => $gatewayReference,
            'amount' => (float) $transaction->amount,
        ]);

        return $this->confirmTopUpById($wallet, $transaction->id);
    }

    public function hasSufficientFunds(Wallet $wallet, float $amount): bool
    {
        return (float) $wallet->fresh()->balance >= $amount;
    }

    public function reconcileBalance(Wallet $wallet): array
    {
        $recordedBalance = (float) $wallet->balance;

        $calculatedBalance = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('reference_type', '!=', 'pending_topup')
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as calculated_balance")
            ->value('calculated_balance');

        $calculatedBalance = (float) $calculatedBalance;
        $discrepancy = round($recordedBalance - $calculatedBalance, 2);

        $result = [
            'wallet_id' => $wallet->id,
            'recorded_balance' => $recordedBalance,
            'calculated_balance' => $calculatedBalance,
            'discrepancy' => $discrepancy,
            'is_consistent' => abs($discrepancy) < 0.01,
        ];

        if (! $result['is_consistent']) {
            Log::critical('Wallet balance discrepancy detected', $result);

            $wallet->update(['balance' => $calculatedBalance]);

            Log::info('Wallet balance corrected', [
                'wallet_id' => $wallet->id,
                'old_balance' => $recordedBalance,
                'new_balance' => $calculatedBalance,
            ]);
        }

        return $result;
    }

    public function reconcileAllWallets(): array
    {
        $results = [
            'total' => 0,
            'consistent' => 0,
            'discrepancies' => 0,
            'details' => [],
        ];

        Wallet::cursor()->each(function (Wallet $wallet) use (&$results) {
            $results['total']++;
            $reconciliation = $this->reconcileBalance($wallet);
            $results['details'][] = $reconciliation;

            if ($reconciliation['is_consistent']) {
                $results['consistent']++;
            } else {
                $results['discrepancies']++;
            }
        });

        Log::info('Wallet reconciliation completed', [
            'total' => $results['total'],
            'consistent' => $results['consistent'],
            'discrepancies' => $results['discrepancies'],
        ]);

        return $results;
    }
}
