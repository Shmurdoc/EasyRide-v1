<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Rating\RatingCreateRequest;
use App\Models\Rating;
use App\Models\Ride;
use App\Models\User;
use App\Services\RatingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RatingController extends Controller
{
    public function __construct(
        protected RatingService $ratingService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $ratings = Rating::where('ratee_id', $request->user()->id)
            ->with(['rater', 'ride'])
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($ratings);
    }

    public function given(Request $request): JsonResponse
    {
        $ratings = Rating::where('rater_id', $request->user()->id)
            ->with(['ratee', 'ride'])
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($ratings);
    }

    public function store(RatingCreateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $ride = Ride::findOrFail($validated['ride_id']);

        if ($ride->rider_id !== $request->user()->id && $ride->driver_id !== $request->user()->id) {
            return response()->json(['message' => 'You did not participate in this ride.'], 403);
        }

        if (! $ride->completed_at) {
            return response()->json(['message' => 'Cannot rate a ride that is not completed.'], 422);
        }

        if (Rating::where('ride_id', $ride->id)->where('rater_id', $request->user()->id)->exists()) {
            return response()->json(['message' => 'You have already rated this ride.'], 422);
        }

        $rater = User::find($request->user()->id);
        $ratee = User::find($validated['ratee_id']);

        $rating = $this->ratingService->rateRide(
            $ride,
            $rater,
            $ratee,
            $validated['score'],
            $validated['comment'] ?? null,
        );

        return response()->json([
            'rating' => $rating->load(['rater', 'ratee']),
            'message' => 'Rating submitted successfully.',
        ], 201);
    }

    public function show(Rating $rating): JsonResponse
    {
        if ($rating->rater_id !== request()->user()->id && $rating->ratee_id !== request()->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json($rating->load(['rater', 'ratee', 'ride']));
    }
}
