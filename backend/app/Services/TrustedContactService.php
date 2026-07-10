<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\TrustedContact;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TrustedContactService
{
    public function __construct(
        protected PushNotificationService $notificationService,
        protected SmsService $smsService,
    ) {}

    public function addContact(User $owner, array $data): TrustedContact
    {
        $existingCount = TrustedContact::where('owner_id', $owner->id)->count();
        if ($existingCount >= 5) {
            throw new \RuntimeException('Maximum 5 trusted contacts allowed.');
        }

        return TrustedContact::create([
            'owner_id' => $owner->id,
            'name' => $data['name'],
            'phone_number' => $data['phone_number'],
            'relationship' => $data['relationship'] ?? 'friend',
            'is_active' => true,
        ]);
    }

    public function removeContact(User $owner, string $contactId): bool
    {
        $contact = TrustedContact::where('owner_id', $owner->id)->where('id', $contactId)->first();
        if (!$contact) {
            return false;
        }

        return $contact->delete();
    }

    public function getContacts(User $owner)
    {
        return TrustedContact::where('owner_id', $owner->id)
            ->where('is_active', true)
            ->get();
    }

    public function notifyContacts(User $rider, array $rideData): array
    {
        $contacts = $this->getContacts($rider);
        $notified = [];

        foreach ($contacts as $contact) {
            try {
                $this->smsService->send(
                    $contact->phone_number,
                    "EasyRyde: {$rider->name} is on a ride. Pickup: {$rideData['pickup_address']}. Dropoff: {$rideData['dropoff_address']}. Track: {$rideData['tracking_url']}"
                );
                $notified[] = $contact->name;
            } catch (\Exception $e) {
                Log::error('Failed to notify trusted contact', [
                    'contact' => $contact->name,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $notified;
    }
}
