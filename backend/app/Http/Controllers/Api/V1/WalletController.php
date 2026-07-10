<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Wallet\WalletDepositRequest;
use App\Http\Requests\Api\V1\Wallet\WalletWithdrawRequest;
use App\Http\Resources\WalletResource;
use App\Services\OzowService;
use App\Services\PayFastService;
use App\Services\StripeService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function __construct(
        protected WalletService $walletService,
        protected PayFastService $payFastService,
        protected OzowService $ozowService,
        protected StripeService $stripeService,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $wallet = $this->walletService->getOrCreateWallet($request->user());

        return response()->json([
            'balance' => (float) $wallet->balance,
            'currency' => $wallet->currency,
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $wallet = $this->walletService->getOrCreateWallet($request->user());

        $transactions = $this->walletService->getTransactions(
            $wallet,
            $request->only(['type']),
            $request->per_page ?? 15,
        );

        return response()->json($transactions);
    }

    public function deposit(WalletDepositRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();
        $wallet = $this->walletService->getOrCreateWallet($user);
        $amount = (float) $validated['amount'];
        $method = $validated['payment_method'];

        try {
            $transaction = $this->walletService->credit(
                $wallet,
                $amount,
                'deposit',
                $wallet->id,
                "Wallet deposit via {$method}",
            );
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if ($method === 'payfast') {
            $url = $this->payFastService->generatePaymentUrl([
                'payment_id' => $transaction->id,
                'amount' => $amount,
                'item_name' => 'EasyRyde Wallet Top-Up',
                'item_description' => "Top up wallet with R{$amount}",
                'name_first' => $user->name ?? '',
                'email' => $user->email ?? '',
            ]);

            return response()->json([
                'transaction' => $transaction,
                'redirect_url' => $url,
                'message' => 'Redirect to PayFast to complete deposit.',
            ], 201);
        }

        if ($method === 'ozow') {
            $result = $this->ozowService->createPayment([
                'amount' => $amount,
                'transaction_reference' => $transaction->id,
                'bank_reference' => 'EASYRYDE-TOPUP',
                'customer' => [
                    'name' => $user->name ?? '',
                    'email' => $user->email ?? '',
                    'phone' => $user->phone_number ?? '',
                ],
            ]);

            if (! $result['success']) {
                return response()->json(['message' => $result['error'] ?? 'Ozow payment failed.'], 502);
            }

            return response()->json([
                'transaction' => $transaction,
                'redirect_url' => $result['url'],
                'message' => 'Redirect to Ozow to complete deposit.',
            ], 201);
        }

        if ($method === 'stripe') {
            $intent = $this->stripeService->createPaymentIntent($amount);

            return response()->json([
                'transaction' => $transaction,
                'client_secret' => $intent['client_secret'] ?? null,
                'payment_intent_id' => $intent['id'] ?? null,
                'message' => 'Confirm payment with Stripe to complete deposit.',
            ], 201);
        }

        return response()->json(['message' => 'Invalid payment method.'], 422);
    }

    public function confirm(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'transaction_id' => 'required|uuid',
        ]);

        $wallet = $this->walletService->getOrCreateWallet($request->user());

        $confirmed = $this->walletService->confirmTopUpById($wallet, $validated['transaction_id']);

        if (! $confirmed) {
            return response()->json(['message' => 'Transaction not found or already confirmed.'], 422);
        }

        return response()->json([
            'message' => 'Wallet top-up confirmed.',
            'balance' => (float) $wallet->fresh()->balance,
        ]);
    }

    public function withdraw(WalletWithdrawRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $wallet = $this->walletService->getOrCreateWallet($request->user());

        try {
            $transaction = $this->walletService->withdraw(
                $wallet,
                (float) $validated['amount'],
            );
        } catch (\RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'balance' => (float) $wallet->fresh()->balance,
                'requested' => (float) $validated['amount'],
            ], 422);
        }

        return response()->json([
            'transaction' => $transaction,
            'message' => 'Withdrawal request submitted for admin approval.',
            'wallet' => new WalletResource($wallet->fresh()),
        ], 201);
    }
}
