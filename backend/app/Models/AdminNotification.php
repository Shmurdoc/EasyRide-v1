<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdminNotification extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'title',
        'body',
        'type',
        'audience',
        'user_id',
        'sent_count',
        'failed_count',
        'status',
        'sent_at',
        'tenant_id',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
        ];
    }

    public function scopeSent($query)
    {
        return $query->where('status', 'sent');
    }
}
