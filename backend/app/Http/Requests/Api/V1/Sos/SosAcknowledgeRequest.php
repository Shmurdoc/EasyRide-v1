<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Sos;

use App\Http\Requests\Api\V1\ApiFormRequest;

class SosAcknowledgeRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['admin', 'super-admin']);
    }

    public function rules(): array
    {
        return [
            'notes' => 'sometimes|string|max:1000',
        ];
    }
}
