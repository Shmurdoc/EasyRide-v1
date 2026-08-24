<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentReport extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'reporter_id',
        'ride_id',
        'delivery_id',
        'incident_type',
        'severity',
        'title',
        'description',
        'status',
        'assigned_to',
        'resolution',
        'resolved_at',
        'evidence_paths',
        'metadata',
    ];

    protected $casts = [
        'evidence_paths' => 'array',
        'metadata' => 'array',
        'resolved_at' => 'datetime',
    ];

    const TYPE_ACCIDENT = 'accident';

    const TYPE_SAFETY_CONCERN = 'safety_concern';

    const TYPE_HARASSMENT = 'harassment';

    const TYPE_VEHICLE_DAMAGE = 'vehicle_damage';

    const TYPE_ROBBERY = 'robbery';

    const TYPE_MECHANICAL_FAILURE = 'mechanical_failure';

    const TYPE_ROUTE_DEVIATION = 'route_deviation';

    const TYPE_PAYMENT_ISSUE = 'payment_issue';

    const TYPE_DRIVER_MISCONDUCT = 'driver_misconduct';

    const TYPE_RIDER_MISCONDUCT = 'rider_misconduct';

    const TYPE_FOOD_SAFETY = 'food_safety';

    const TYPE_DELIVERY_DAMAGE = 'delivery_damage';

    const TYPE_OTHER = 'other';

    const SEVERITY_LOW = 'low';

    const SEVERITY_MEDIUM = 'medium';

    const SEVERITY_HIGH = 'high';

    const SEVERITY_CRITICAL = 'critical';

    const STATUS_OPEN = 'open';

    const STATUS_INVESTIGATING = 'investigating';

    const STATUS_RESOLVED = 'resolved';

    const STATUS_CLOSED = 'closed';

    const STATUS_ESCALATED = 'escalated';

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function ride(): BelongsTo
    {
        return $this->belongsTo(Ride::class);
    }

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(Delivery::class);
    }

    public function isOpen(): bool
    {
        return $this->status === self::STATUS_OPEN;
    }

    public function isCritical(): bool
    {
        return $this->severity === self::SEVERITY_CRITICAL;
    }

    public function escalate(string $adminId): void
    {
        $this->update([
            'status' => self::STATUS_ESCALATED,
            'assigned_to' => $adminId,
        ]);
    }

    public function assign(string $adminId): void
    {
        $this->update([
            'status' => self::STATUS_INVESTIGATING,
            'assigned_to' => $adminId,
        ]);
    }

    public function resolve(string $resolution): void
    {
        $this->update([
            'status' => self::STATUS_RESOLVED,
            'resolution' => $resolution,
            'resolved_at' => now(),
        ]);
    }

    public function close(): void
    {
        $this->update(['status' => self::STATUS_CLOSED]);
    }

    public function addEvidence(string $path): void
    {
        $evidence = $this->evidence_paths ?? [];
        $evidence[] = $path;
        $this->update(['evidence_paths' => $evidence]);
    }
}
