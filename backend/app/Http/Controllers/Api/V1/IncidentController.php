<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Incident\IncidentAssignRequest;
use App\Http\Requests\Api\V1\Incident\IncidentResolveRequest;
use App\Http\Requests\Api\V1\Incident\IncidentStoreRequest;
use App\Models\IncidentReport;
use App\Services\IncidentReportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IncidentController extends Controller
{
    public function __construct(
        private IncidentReportingService $incidentService,
    ) {}

    public function store(IncidentStoreRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $incident = $this->incidentService->reportIncident(
            $request->user(),
            $validated['incident_type'],
            $validated['severity'],
            $validated['title'],
            $validated['description'],
            $validated['ride_id'] ?? null,
            null,
            null,
        );

        return response()->json([
            'message' => 'Incident reported',
            'incident' => $incident,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $incidents = $this->incidentService->getAllIncidents($request->status);

        return response()->json(['incidents' => $incidents]);
    }

    public function show(Request $request, IncidentReport $incident): JsonResponse
    {
        if ($incident->reporter_id !== $request->user()->id && ! $request->user()->hasRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $incident = $this->incidentService->getIncident($incident);

        return response()->json(['incident' => $incident]);
    }

    public function myIncidents(Request $request): JsonResponse
    {
        $incidents = $this->incidentService->getMyIncidents($request->user());

        return response()->json(['incidents' => $incidents]);
    }

    public function open(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $incidents = $this->incidentService->getOpenIncidents();

        return response()->json(['incidents' => $incidents]);
    }

    public function assign(IncidentAssignRequest $request, IncidentReport $incident): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $this->incidentService->assignIncident($incident, $request->user()->id);

        return response()->json(['message' => 'Incident assigned']);
    }

    public function escalate(IncidentReport $incident, Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $this->incidentService->escalateIncident($incident, $request->user()->id);

        return response()->json(['message' => 'Incident escalated']);
    }

    public function resolve(IncidentResolveRequest $request, IncidentReport $incident): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validated();

        $this->incidentService->resolveIncident($incident, $validated['resolution']);

        return response()->json(['message' => 'Incident resolved']);
    }

    public function close(Request $request, IncidentReport $incident): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $this->incidentService->closeIncident($incident);

        return response()->json(['message' => 'Incident closed']);
    }

    public function stats(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $stats = $this->incidentService->getIncidentStats();

        return response()->json(['stats' => $stats]);
    }

    public function downloadEvidence(Request $request, IncidentReport $incident, int $index): Response
    {
        if ($incident->reporter_id !== $request->user()->id && ! $request->user()->hasRole(['admin', 'super-admin'])) {
            return response('Unauthorized.', 403);
        }

        $content = $this->incidentService->downloadEvidence($incident, $index);

        return response($content, 200, [
            'Content-Type' => 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="evidence_'.$index.'"',
        ]);
    }
}
