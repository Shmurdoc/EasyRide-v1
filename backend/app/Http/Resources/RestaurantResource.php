<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RestaurantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'image_url' => $this->image_url,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'cuisine_type' => $this->cuisine_type,
            'price_range' => $this->price_range,
            'delivery_fee' => $this->delivery_fee,
            'minimum_order' => $this->minimum_order,
            'estimated_delivery_minutes' => $this->estimated_delivery_minutes,
            'is_active' => $this->is_active,
            'is_featured' => $this->is_featured,
            'opens_at' => $this->opens_at,
            'closes_at' => $this->closes_at,
            'rating' => $this->rating,
            'rating_count' => $this->rating_count,
            'total_orders' => $this->total_orders,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'categories' => RestaurantCategoryResource::collection($this->whenLoaded('categories')),
            'menu_items' => MenuItemResource::collection($this->whenLoaded('menuItems')),
        ];
    }
}
