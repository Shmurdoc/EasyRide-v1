<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Rules\SouthAfricaPhone;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => 'required|min:8|confirmed',
            'phone_number' => ['required', 'string', 'max:20', 'unique:users,phone_number', new SouthAfricaPhone],
            'tenant_slug' => 'sometimes|string|max:100',
            'tenant_name' => 'sometimes|string|max:255',
        ];
    }
}
