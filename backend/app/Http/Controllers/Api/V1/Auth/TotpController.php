<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\TotpVerifyRequest;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TotpController extends Controller
{
    public function enable(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->totp_enabled) {
            return ApiResponse::error('TOTP is already enabled.', 400);
        }

        $secret = $user->generateTotpSecret();
        $qrUrl = $user->getTotpQrUrl(config('app.name'));

        return ApiResponse::success([
            'secret' => $secret,
            'qr_url' => $qrUrl,
        ], 'Scan the QR code with your authenticator app. Then call verify to confirm.');
    }

    public function verify(TotpVerifyRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->totp_enabled) {
            return ApiResponse::error('TOTP is already enabled.', 400);
        }

        $validated = $request->validated();

        if (! $user->verifyTotp($validated['code'])) {
            throw ValidationException::withMessages([
                'code' => ['The provided TOTP code is invalid.'],
            ]);
        }

        $user->totp_enabled = true;
        $user->save();

        return ApiResponse::success(message: 'TOTP has been enabled successfully.');
    }

    public function disable(TotpVerifyRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->totp_enabled) {
            return ApiResponse::error('TOTP is not enabled.', 400);
        }

        $validated = $request->validated();

        if (! $user->verifyTotp($validated['code'])) {
            throw ValidationException::withMessages([
                'code' => ['The provided TOTP code is invalid.'],
            ]);
        }

        $user->totp_secret = null;
        $user->totp_enabled = false;
        $user->save();

        \Illuminate\Support\Facades\Log::warning('TOTP disabled for admin user', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return ApiResponse::success(message: 'TOTP has been disabled successfully.');
    }
}
