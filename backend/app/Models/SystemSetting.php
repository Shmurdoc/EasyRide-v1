<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemSetting extends Model
{
    use HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'tenant_id', 'key', 'value', 'description', 'type', 'options',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'string',
            'options' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function getValueAttribute($value)
    {
        return match ($this->type) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? (bool) $value,
            'number' => (float) $value,
            'json' => json_decode($value, true),
            default => $value,
        };
    }

    public function isValidEnumValue(mixed $value): bool
    {
        if ($this->type !== 'enum') {
            return true;
        }

        $options = is_array($this->options) ? $this->options : [];
        if (empty($options)) {
            return true;
        }

        return in_array($value, $options, true);
    }
}
