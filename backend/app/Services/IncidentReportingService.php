<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\EvidenceNotFoundException;
use App\Models\IncidentReport;
use App\Models\User;
use App\Notifications\IncidentAlertNotification;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class IncidentReportingService
{
    public function reportIncident(
        User $reporter,
        string $incidentType,
        string $severity,
        string $title,
        string $description,
        ?string $rideId = null,
        ?string $deliveryId = null,
        ?array $evidence = null,
    ): IncidentReport {
        $this->validateIncidentType($incidentType);
        $this->validateSeverity($severity);

        $incident = IncidentReport::create([
            'reporter_id' => $reporter->id,
            'ride_id' => $rideId,
            'delivery_id' => $deliveryId,
            'incident_type' => $incidentType,
            'severity' => $severity,
            'title' => $title,
            'description' => $description,
            'status' => IncidentReport::STATUS_OPEN,
            'metadata' => [
                'reporter_name' => $reporter->name,
                'reporter_email' => $reporter->email,
                'reported_at' => now()->toISOString(),
            ],
        ]);

        if ($evidence) {
            foreach ($evidence as $file) {
                $path = $file->store('incidents/'.$incident->id, 'private');
                $incident->addEvidence($path);
            }
        }

        if ($severity === IncidentReport::SEVERITY_CRITICAL) {
            $this->notifyAdmins($incident);
        }

        return $incident;
    }

    public function getIncident(IncidentReport $incident): IncidentReport
    {
        return $incident->load(['reporter', 'assignedTo', 'ride', 'delivery']);
    }

    public function getMyIncidents(User $reporter): Collection
    {
        return IncidentReport::where('reporter_id', $reporter->id)
            ->orderByDesc('created_at')
            ->get();
    }

    public function getAllIncidents(?string $status = null): Collection
    {
        $query = IncidentReport::with(['reporter', 'assignedTo']);

        if ($status) {
            $query->where('status', $status);
        }

        return $query->orderByDesc('created_at')->get();
    }

    public function getOpenIncidents(): Collection
    {
        return IncidentReport::where('status', IncidentReport::STATUS_OPEN)
            ->with(['reporter', 'assignedTo'])
            ->orderByDesc('severity')
            ->orderBy('created_at')
            ->get();
    }

    public function assignIncident(IncidentReport $incident, string $adminId): void
    {
        $incident->assign($adminId);
    }

    public function escalateIncident(IncidentReport $incident, string $adminId): void
    {
        $incident->escalate($adminId);
    }

    public function resolveIncident(IncidentReport $incident, string $resolution): void
    {
        $incident->resolve($resolution);
    }

    public function closeIncident(IncidentReport $incident): void
    {
        $incident->close();
    }

    public function getIncidentStats(): array
    {
        return [
            'total' => IncidentReport::count(),
            'open' => IncidentReport::where('status', IncidentReport::STATUS_OPEN)->count(),
            'investigating' => IncidentReport::where('status', IncidentReport::STATUS_INVESTIGATING)->count(),
            'resolved' => IncidentReport::where('status', IncidentReport::STATUS_RESOLVED)->count(),
            'escalated' => IncidentReport::where('status', IncidentReport::STATUS_ESCALATED)->count(),
            'critical' => IncidentReport::where('severity', IncidentReport::SEVERITY_CRITICAL)
                ->where('status', '!=', IncidentReport::STATUS_CLOSED)
                ->count(),
            'by_type' => IncidentReport::selectRaw('incident_type, count(*) as count')
                ->groupBy('incident_type')
                ->pluck('count', 'incident_type')
                ->toArray(),
            'by_severity' => IncidentReport::selectRaw('severity, count(*) as count')
                ->groupBy('severity')
                ->pluck('count', 'severity')
                ->toArray(),
        ];
    }

    public function downloadEvidence(IncidentReport $incident, int $index): string
    {
        $paths = $incident->evidence_paths ?? [];

        if (! isset($paths[$index])) {
            throw new EvidenceNotFoundException('Evidence not found');
        }

        $path = $paths[$index];

        if (! Storage::disk('private')->exists($path)) {
            throw new EvidenceNotFoundException('Evidence file not found');
        }

        return Storage::disk('private')->download($path);
    }

    private function notifyAdmins(IncidentReport $incident): void
    {
        $admins = User::role('admin')->get();

        foreach ($admins as $admin) {
            Notification::send($admin, new IncidentAlertNotification($incident));
        }
    }

    private function validateIncidentType(string $type): void
    {
        $validTypes = [
            IncidentReport::TYPE_ACCIDENT,
            IncidentReport::TYPE_SAFETY_CONCERN,
            IncidentReport::TYPE_HARASSMENT,
            IncidentReport::TYPE_VEHICLE_DAMAGE,
            IncidentReport::TYPE_ROBBERY,
            IncidentReport::TYPE_MECHANICAL_FAILURE,
            IncidentReport::TYPE_ROUTE_DEVIATION,
            IncidentReport::TYPE_PAYMENT_ISSUE,
            IncidentReport::TYPE_DRIVER_MISCONDUCT,
            IncidentReport::TYPE_RIDER_MISCONDUCT,
            IncidentReport::TYPE_FOOD_SAFETY,
            IncidentReport::TYPE_DELIVERY_DAMAGE,
            IncidentReport::TYPE_OTHER,
        ];

        if (! in_array($type, $validTypes)) {
            throw new \InvalidArgumentException("Invalid incident type: {$type}");
        }
    }

    private function validateSeverity(string $severity): void
    {
        $validSeverities = [
            IncidentReport::SEVERITY_LOW,
            IncidentReport::SEVERITY_MEDIUM,
            IncidentReport::SEVERITY_HIGH,
            IncidentReport::SEVERITY_CRITICAL,
        ];

        if (! in_array($severity, $validSeverities)) {
            throw new \InvalidArgumentException("Invalid severity: {$severity}");
        }
    }
}
