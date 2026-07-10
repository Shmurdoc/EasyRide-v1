<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Consent;

use App\Http\Requests\Api\V1\ApiFormRequest;

class ConsentRevokeRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'consent_type' => 'required|string|in:terms_of_service,privacy_policy,marketing_email,marketing_sms,location_tracking,data_sharing_partners,biometric_data',
        ];
    }
}
