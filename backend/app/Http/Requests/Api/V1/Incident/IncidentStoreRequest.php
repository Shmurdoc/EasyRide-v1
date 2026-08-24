<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Incident;

use App\Http\Requests\Api\V1\ApiFormRequest;

class IncidentStoreRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'incident_type' => 'required|string|in:accident,safety_concern,harassment,mechanical,other',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'ride_id' => 'nullable|string|exists:rides,id',
            'severity' => 'required|string|in:low,medium,high,critical',
        ];
    }
}
