<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Auth;

use App\Http\Requests\Api\V1\ApiFormRequest;
use App\Models\User;

class CreateDriverRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['admin', 'super-admin']);
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', function ($attribute, $value, $fail) {
                if (User::where('email_hash', User::hashPiiField($value))->exists()) {
                    $fail('The email has already been taken.');
                }
            }],
            'phone_number' => ['required', 'string', 'max:20', function ($attribute, $value, $fail) {
                if (User::where('phone_hash', User::hashPiiField($value))->exists()) {
                    $fail('The phone number has already been taken.');
                }
            }],
            'password' => 'required|min:8|confirmed',
            'tenant_id' => 'sometimes|string|exists:tenants,id',
        ];
    }
}
