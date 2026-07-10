<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Rating;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class RatingService
{
    public function rateRide(Ride $ride, User $rater, User $ratee, int $score, ?string $comment = null): Rating
    {
        $existing = Rating::where('ride_id', $ride->id)
            ->where('rater_id', $rater->id)
            ->exists();

        if ($existing) {
            throw new \RuntimeException('You have already rated this ride.');
        }

        return Rating::create([
            'ride_id' => $ride->id,
            'rater_id' => $rater->id,
            'ratee_id' => $ratee->id,
            'score' => $score,
            'comment' => $comment,
        ]);
    }

    public function getDriverRating(User $driver): float
    {
        $avg = Rating::where('ratee_id', $driver->id)->whereHas('ride', fn ($q) => $q->where('driver_id', $driver->id))
            ->avg('score');

        return round((float) $avg, 1);
    }

    public function getRiderRating(User $rider): float
    {
        $avg = Rating::where('ratee_id', $rider->id)->whereHas('ride', fn ($q) => $q->where('rider_id', $rider->id))
            ->avg('score');

        return round((float) $avg, 1);
    }

    public function getRideRatings(Ride $ride): Collection
    {
        return $ride->ratings ?? Rating::where('ride_id', $ride->id)->get();
    }
}
