<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\User;

use App\Http\Requests\Api\V1\ApiFormRequest;
use App\Models\User;

class UserUpdateRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['admin', 'super-admin']);
    }

    public function rules(): array
    {
        $userId = $this->route('user');

        return [
            'name' => 'nullable|string|max:255',
            'email' => ['nullable', 'email', function ($attribute, $value, $fail) use ($userId) {
                $query = User::where('email_hash', User::hashPiiField($value));
                if ($userId) {
                    $query->where('id', '!=', $userId);
                }
                if ($query->exists()) {
                    $fail('The email has already been taken.');
                }
            }],
            'phone_number' => ['nullable', 'string', 'max:20', function ($attribute, $value, $fail) use ($userId) {
                $query = User::where('phone_hash', User::hashPiiField($value));
                if ($userId) {
                    $query->where('id', '!=', $userId);
                }
                if ($query->exists()) {
                    $fail('The phone number has already been taken.');
                }
            }],
            'is_active' => 'nullable|boolean',
        ];
    }
}
