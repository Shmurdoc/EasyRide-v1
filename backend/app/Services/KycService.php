<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DocumentNotFoundException;
use App\Exceptions\KycAlreadyApprovedException;
use App\Exceptions\KycAlreadySubmittedException;
use App\Models\KycVerification;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class KycService
{
    private const REQUIRED_DOCUMENTS = [
        KycVerification::TYPE_ID_DOCUMENT,
        KycVerification::TYPE_DRIVERS_LICENSE,
        KycVerification::TYPE_PROOF_OF_ADDRESS,
        KycVerification::TYPE_VEHICLE_REGISTRATION,
        KycVerification::TYPE_VEHICLE_INSURANCE,
        KycVerification::TYPE_PSV_LICENSE,
    ];

    public function submitVerification(
        User $user,
        string $verificationType,
        string $documentType,
        string $documentNumber,
        ?UploadedFile $documentFront = null,
        ?UploadedFile $documentBack = null,
        ?UploadedFile $selfie = null,
        ?string $expiresAt = null,
    ): KycVerification {
        $this->validateDocumentType($documentType);
        $this->validateDocumentNumber($documentType, $documentNumber);

        if ($documentFront) {
            $this->validateUploadedFile($documentFront);
        }
        if ($documentBack) {
            $this->validateUploadedFile($documentBack);
        }
        if ($selfie) {
            $this->validateUploadedFile($selfie);
        }

        $existing = KycVerification::where('user_id', $user->id)
            ->where('document_type', $documentType)
            ->where('status', '!=', KycVerification::STATUS_REJECTED)
            ->first();

        if ($existing && $existing->status !== KycVerification::STATUS_EXPIRED) {
            throw new KycAlreadySubmittedException(
                'Verification already submitted for this document type'
            );
        }

        $frontPath = $documentFront ? $documentFront->store('kyc/'.$user->id, 'private') : null;
        $backPath = $documentBack ? $documentBack->store('kyc/'.$user->id, 'private') : null;
        $selfiePath = $selfie ? $selfie->store('kyc/'.$user->id, 'private') : null;

        return KycVerification::create([
            'user_id' => $user->id,
            'verification_type' => $verificationType,
            'document_type' => $documentType,
            'document_number' => $documentNumber,
            'document_front_path' => $frontPath,
            'document_back_path' => $backPath,
            'selfie_path' => $selfiePath,
            'status' => KycVerification::STATUS_PENDING,
            'expires_at' => $expiresAt,
            'metadata' => [
                'submitted_ip' => request()->ip(),
                'submitted_at' => now()->toISOString(),
            ],
        ]);
    }

    public function approveVerification(KycVerification $verification, int $adminId): void
    {
        if ($verification->status === KycVerification::STATUS_APPROVED) {
            throw new KycAlreadyApprovedException('Verification already approved');
        }

        $verification->approve($adminId);

        $this->updateDriverVerificationStatus($verification->user_id);
    }

    public function rejectVerification(KycVerification $verification, string $reason, int $adminId): void
    {
        $verification->reject($reason, $adminId);
    }

    public function getPendingVerifications(): Collection
    {
        return KycVerification::where('status', KycVerification::STATUS_PENDING)
            ->with('user')
            ->orderBy('created_at')
            ->get();
    }

    public function getUserVerifications(User $user): Collection
    {
        return KycVerification::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();
    }

    public function isFullyVerified(User $user): bool
    {
        $approvedTypes = KycVerification::where('user_id', $user->id)
            ->where('status', KycVerification::STATUS_APPROVED)
            ->pluck('document_type')
            ->toArray();

        return count(array_intersect(self::REQUIRED_DOCUMENTS, $approvedTypes)) === count(self::REQUIRED_DOCUMENTS);
    }

    public function checkExpiredVerifications(): int
    {
        $expired = KycVerification::where('status', KycVerification::STATUS_APPROVED)
            ->where('expires_at', '<', now())
            ->update(['status' => KycVerification::STATUS_EXPIRED]);

        if ($expired > 0) {
            $userIds = KycVerification::where('status', KycVerification::STATUS_EXPIRED)
                ->where('expires_at', '<', now())
                ->pluck('user_id')
                ->unique();

            foreach ($userIds as $userId) {
                $this->updateDriverVerificationStatus($userId);
            }
        }

        return $expired;
    }

    public function downloadDocument(KycVerification $verification, string $documentType): string
    {
        $path = match ($documentType) {
            'front' => $verification->document_front_path,
            'back' => $verification->document_back_path,
            'selfie' => $verification->selfie_path,
            default => throw new \InvalidArgumentException('Invalid document type'),
        };

        if (! $path || ! Storage::disk('private')->exists($path)) {
            throw new DocumentNotFoundException('Document not found');
        }

        return Storage::disk('private')->download($path);
    }

    private function updateDriverVerificationStatus(int $userId): void
    {
        $user = User::find($userId);
        if (! $user) {
            return;
        }

        $isVerified = $this->isFullyVerified($user);
        $user->update([
            'is_kyc_verified' => $isVerified,
            'kyc_verified_at' => $isVerified ? now() : null,
        ]);
    }

    private function validateUploadedFile(UploadedFile $file): void
    {
        $allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
        $maxSize = 10 * 1024 * 1024; // 10MB

        if (! in_array($file->getMimeType(), $allowedMimes)) {
            throw new \InvalidArgumentException(
                'Invalid file type. Allowed types: jpeg, png, pdf. Received: '.$file->getMimeType()
            );
        }

        if ($file->getSize() > $maxSize) {
            throw new \InvalidArgumentException(
                'File size exceeds maximum limit of 10MB.'
            );
        }
    }

    private function validateDocumentType(string $type): void
    {
        $validTypes = [
            KycVerification::TYPE_ID_DOCUMENT,
            KycVerification::TYPE_DRIVERS_LICENSE,
            KycVerification::TYPE_PROOF_OF_ADDRESS,
            KycVerification::TYPE_VEHICLE_REGISTRATION,
            KycVerification::TYPE_VEHICLE_INSURANCE,
            KycVerification::TYPE_PSV_LICENSE,
        ];

        if (! in_array($type, $validTypes)) {
            throw new \InvalidArgumentException("Invalid document type: {$type}");
        }
    }

    private function validateDocumentNumber(string $documentType, string $number): void
    {
        $number = preg_replace('/\s+/', '', $number);

        switch ($documentType) {
            case KycVerification::TYPE_ID_DOCUMENT:
                if (! preg_match('/^\d{13}$/', $number)) {
                    throw new \InvalidArgumentException('Invalid South African ID number (must be 13 digits)');
                }
                $this->validateSaIdNumber($number);
                break;

            case KycVerification::TYPE_DRIVERS_LICENSE:
                if (! preg_match('/^\d{13}$/', $number)) {
                    throw new \InvalidArgumentException('Invalid driver license number');
                }
                break;

            case KycVerification::TYPE_VEHICLE_REGISTRATION:
                if (! preg_match('/^[A-Z]{2,3}\s?\d{3,4}\s?[A-Z]$/', strtoupper($number))) {
                    throw new \InvalidArgumentException('Invalid vehicle registration number');
                }
                break;
        }
    }

    private function validateSaIdNumber(string $idNumber): void
    {
        if (strlen($idNumber) !== 13) {
            throw new \InvalidArgumentException('SA ID must be 13 digits');
        }

        $year = substr($idNumber, 0, 2);
        $month = substr($idNumber, 2, 2);
        $day = substr($idNumber, 4, 2);

        $fullYear = ((int) $year < 50 ? '20' : '19').$year;

        if (! checkdate((int) $month, (int) $day, (int) $fullYear)) {
            throw new \InvalidArgumentException('Invalid date of birth in ID number');
        }

        $checksum = 0;
        for ($i = 0; $i < 13; $i++) {
            $digit = (int) $idNumber[$i];
            if ($i % 2 === 0) {
                $checksum += $digit;
            } else {
                $product = $digit * 2;
                $checksum += (int) ($product / 10) + ($product % 10);
            }
        }

        if ($checksum % 10 !== 0) {
            throw new \InvalidArgumentException('Invalid ID number checksum');
        }
    }
}
