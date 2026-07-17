<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RatingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ride_id' => $this->ride_id,
            'rater_id' => $this->rater_id,
            'ratee_id' => $this->ratee_id,
            'score' => $this->score,
            'comment' => $this->comment,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'rater' => new UserResource($this->whenLoaded('rater')),
            'ratee' => new UserResource($this->whenLoaded('ratee')),
            'ride' => new RideResource($this->whenLoaded('ride')),
        ];
    }
}
