<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FoodOrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'food_order_id' => $this->food_order_id,
            'menu_item_id' => $this->menu_item_id,
            'name' => $this->name,
            'price' => $this->price,
            'quantity' => $this->quantity,
            'special_instructions' => $this->special_instructions,
            'line_total' => $this->line_total,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'menu_item' => new MenuItemResource($this->whenLoaded('menuItem')),
        ];
    }
}
