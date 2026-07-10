<?php

namespace Database\Seeders;

use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\RestaurantCategory;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class FoodDeliverySeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'default')->first();

        if (! $tenant) {
            $this->command->warn('No default tenant found. Skipping food delivery seed.');

            return;
        }

        $restaurants = [
            [
                'name' => 'Nando\'s Phalaborwa',
                'slug' => 'nandos-phalaborwa',
                'description' => 'Portuguese flame-grilled peri-peri chicken, famous for its spicy marinades and vibrant atmosphere. A South African favourite since 1987.',
                'cuisine_type' => 'Portuguese, Chicken',
                'price_range' => '$$',
                'delivery_fee' => 15.00,
                'minimum_order' => 50.00,
                'estimated_delivery_minutes' => 35,
                'address' => 'Shop 12, Mimosa Mall, 1 President Street, Phalaborwa, Limpopo',
                'latitude' => -23.9430,
                'longitude' => 31.1412,
                'phone' => '+27159876543',
                'is_featured' => true,
                'opens_at' => '09:00',
                'closes_at' => '21:00',
                'categories' => [
                    'Peri-Peri Chicken' => [
                        ['name' => 'Quarter Chicken', 'description' => 'Flame-grilled quarter chicken with your choice of spice level', 'price' => 59.90, 'sort_order' => 1],
                        ['name' => 'Half Chicken', 'description' => 'Half chicken, flame-grilled with peri-peri basting', 'price' => 99.90, 'sort_order' => 2],
                        ['name' => 'Whole Chicken', 'description' => 'Whole flame-grilled chicken, serves 3-4', 'price' => 179.90, 'sort_order' => 3],
                        ['name' => 'Chicken Wings (6)', 'description' => '6 flame-grilled chicken wings', 'price' => 49.90, 'sort_order' => 4, 'spice_level' => 2],
                    ],
                    'Burgers & Pitas' => [
                        ['name' => 'Chicken Burger', 'description' => 'Grilled chicken breast with lettuce, tomato, and peri-peri mayo', 'price' => 69.90, 'sort_order' => 5],
                        ['name' => 'Veggie Burger', 'description' => 'Halloumi, avocado, grilled veggies, and peri-peri sauce', 'price' => 64.90, 'sort_order' => 6, 'is_vegetarian' => true],
                        ['name' => 'Chicken Pita', 'description' => 'Grilled chicken strips in a warm pita with salad', 'price' => 59.90, 'sort_order' => 7],
                    ],
                    'Sides' => [
                        ['name' => 'PERi-PERi Chips', 'description' => 'Crispy chips sprinkled with PERi-PERi salt', 'price' => 24.90, 'sort_order' => 8, 'is_vegetarian' => true],
                        ['name' => 'Coleslaw', 'description' => 'Creamy homemade coleslaw', 'price' => 19.90, 'sort_order' => 9, 'is_vegetarian' => true],
                        ['name' => 'Garlic Bread', 'description' => 'Toasted garlic bread with herb butter', 'price' => 22.90, 'sort_order' => 10, 'is_vegetarian' => true],
                        ['name' => 'Spicy Rice', 'description' => 'PERi-PERi seasoned rice', 'price' => 24.90, 'sort_order' => 11, 'is_vegetarian' => true],
                    ],
                    'Drinks' => [
                        ['name' => 'Coca-Cola (330ml)', 'price' => 14.90, 'sort_order' => 12],
                        ['name' => 'Fanta Orange (330ml)', 'price' => 14.90, 'sort_order' => 13],
                        ['name' => 'Sprite (330ml)', 'price' => 14.90, 'sort_order' => 14],
                        ['name' => 'Still Water (500ml)', 'price' => 12.90, 'sort_order' => 15],
                    ],
                ],
            ],
            [
                'name' => 'Ocean Basket Phalaborwa',
                'slug' => 'ocean-basket-phalaborwa',
                'description' => 'Fresh seafood with a Mediterranean twist. Famous for its fish and chips, sushi, and sharing platters.',
                'cuisine_type' => 'Seafood, Mediterranean',
                'price_range' => '$$$',
                'delivery_fee' => 20.00,
                'minimum_order' => 80.00,
                'estimated_delivery_minutes' => 40,
                'address' => 'Mimosa Mall, 1 President Street, Phalaborwa, Limpopo',
                'latitude' => -23.9435,
                'longitude' => 31.1418,
                'phone' => '+27159875555',
                'is_featured' => true,
                'opens_at' => '11:00',
                'closes_at' => '21:00',
                'categories' => [
                    'Starters' => [
                        ['name' => 'Calamari Strips', 'description' => 'Lightly crumbed calamari strips served with lemon and tartare sauce', 'price' => 54.90, 'sort_order' => 1],
                        ['name' => 'Prawn Cocktail', 'description' => 'Succulent prawns on a bed of lettuce with Marie Rose sauce', 'price' => 69.90, 'sort_order' => 2],
                        ['name' => 'Mussels Marinara', 'description' => 'Black mussels in a creamy garlic and white wine sauce', 'price' => 59.90, 'sort_order' => 3],
                    ],
                    'Fish & Chips' => [
                        ['name' => 'Hake & Chips', 'description' => 'Crispy battered hake with chips and tartare sauce', 'price' => 84.90, 'sort_order' => 4],
                        ['name' => 'Grilled Kingklip', 'description' => 'Grilled kingklip fillet served with lemon butter sauce', 'price' => 109.90, 'sort_order' => 5],
                        ['name' => 'Snoek & Chips', 'description' => 'Smoked snoek fillet with chips', 'price' => 79.90, 'sort_order' => 6],
                    ],
                    'Sushi' => [
                        ['name' => 'California Roll (8pc)', 'description' => 'Crab stick, avocado, and cucumber inside-out roll', 'price' => 64.90, 'sort_order' => 7],
                        ['name' => 'Salmon Nigiri (4pc)', 'description' => 'Fresh salmon over seasoned sushi rice', 'price' => 59.90, 'sort_order' => 8],
                        ['name' => 'Tuna Maki (8pc)', 'description' => 'Fresh tuna wrapped in seasoned rice and nori', 'price' => 54.90, 'sort_order' => 9],
                    ],
                    'Sides' => [
                        ['name' => 'Chips', 'description' => 'Golden crispy chips', 'price' => 24.90, 'sort_order' => 10, 'is_vegetarian' => true],
                        ['name' => 'Rice', 'description' => 'Steamed white rice', 'price' => 19.90, 'sort_order' => 11, 'is_vegetarian' => true],
                        ['name' => 'Grilled Vegetables', 'description' => 'Seasonal grilled vegetables', 'price' => 29.90, 'sort_order' => 12, 'is_vegetarian' => true, 'is_vegan' => true],
                    ],
                ],
            ],
            [
                'name' => 'Wimpy Phalaborwa',
                'slug' => 'wimpy-phalaborwa',
                'description' => 'Classic South African family-friendly diner serving burgers, breakfasts, and milkshakes since 1967.',
                'cuisine_type' => 'American, Diner',
                'price_range' => '$$',
                'delivery_fee' => 12.00,
                'minimum_order' => 40.00,
                'estimated_delivery_minutes' => 30,
                'address' => 'Mimosa Mall, 1 President Street, Phalaborwa, Limpopo',
                'latitude' => -23.9432,
                'longitude' => 31.1415,
                'phone' => '+27159874444',
                'is_featured' => false,
                'opens_at' => '07:00',
                'closes_at' => '20:00',
                'categories' => [
                    'Breakfast' => [
                        ['name' => 'Full Breakfast', 'description' => '2 eggs, bacon, sausage, tomato, mushroom, and toast', 'price' => 69.90, 'sort_order' => 1],
                        ['name' => 'Pancake Stack', 'description' => '3 fluffy pancakes with butter and syrup', 'price' => 44.90, 'sort_order' => 2, 'is_vegetarian' => true],
                        ['name' => 'Eggs Benedict', 'description' => 'Poached eggs on a toasted muffin with hollandaise', 'price' => 59.90, 'sort_order' => 3],
                    ],
                    'Burgers' => [
                        ['name' => 'Wimpy Classic Burger', 'description' => 'Beef patty with lettuce, tomato, onion, and Wimpy sauce', 'price' => 59.90, 'sort_order' => 4],
                        ['name' => 'Cheese Burger', 'description' => 'Beef patty with melted cheddar, lettuce, and tomato', 'price' => 64.90, 'sort_order' => 5],
                        ['name' => 'Chicken Fillet Burger', 'description' => 'Grilled chicken fillet with mayo and salad', 'price' => 62.90, 'sort_order' => 6],
                        ['name' => 'Veggie Burger', 'description' => 'Plant-based patty with fresh salad', 'price' => 59.90, 'sort_order' => 7, 'is_vegetarian' => true],
                    ],
                    'Milkshakes' => [
                        ['name' => 'Chocolate Milkshake', 'description' => 'Thick and creamy chocolate milkshake', 'price' => 34.90, 'sort_order' => 8, 'is_vegetarian' => true],
                        ['name' => 'Strawberry Milkshake', 'description' => 'Thick and creamy strawberry milkshake', 'price' => 34.90, 'sort_order' => 9, 'is_vegetarian' => true],
                        ['name' => 'Oreo Milkshake', 'description' => 'Cookies and cream milkshake', 'price' => 39.90, 'sort_order' => 10, 'is_vegetarian' => true],
                    ],
                    'Sides' => [
                        ['name' => 'French Fries', 'description' => 'Crispy salted french fries', 'price' => 24.90, 'sort_order' => 11, 'is_vegetarian' => true],
                        ['name' => 'Onion Rings', 'description' => 'Beer-battered onion rings', 'price' => 29.90, 'sort_order' => 12, 'is_vegetarian' => true],
                        ['name' => 'Coleslaw', 'description' => 'Creamy coleslaw', 'price' => 17.90, 'sort_order' => 13, 'is_vegetarian' => true],
                    ],
                ],
            ],
            [
                'name' => 'Pizza Perfect',
                'slug' => 'pizza-perfect-phalaborwa',
                'description' => 'Artisan pizzas made with fresh dough and premium toppings. Hand-tossed and wood-fired.',
                'cuisine_type' => 'Italian, Pizza',
                'price_range' => '$$',
                'delivery_fee' => 10.00,
                'minimum_order' => 60.00,
                'estimated_delivery_minutes' => 30,
                'address' => '74 President Street, Phalaborwa, Limpopo',
                'latitude' => -23.9440,
                'longitude' => 31.1405,
                'phone' => '+27159873333',
                'is_featured' => false,
                'opens_at' => '10:00',
                'closes_at' => '22:00',
                'categories' => [
                    'Classic Pizzas' => [
                        ['name' => 'Margherita', 'description' => 'San Marzano tomato, fresh mozzarella, basil', 'price' => 69.90, 'sort_order' => 1, 'is_vegetarian' => true],
                        ['name' => 'Pepperoni', 'description' => 'Tomato sauce, mozzarella, double pepperoni', 'price' => 79.90, 'sort_order' => 2],
                        ['name' => 'Hawaiian', 'description' => 'Tomato sauce, mozzarella, ham, pineapple', 'price' => 79.90, 'sort_order' => 3],
                        ['name' => 'Mexican', 'description' => 'Spicy mince, jalapeños, peppers, onion, mozzarella', 'price' => 84.90, 'sort_order' => 4, 'spice_level' => 2],
                    ],
                    'Specialty Pizzas' => [
                        ['name' => 'BBQ Chicken', 'description' => 'BBQ sauce base, grilled chicken, red onion, mozzarella', 'price' => 89.90, 'sort_order' => 5],
                        ['name' => 'Veggie Deluxe', 'description' => 'Mushrooms, peppers, onion, olives, sweetcorn, mozzarella', 'price' => 74.90, 'sort_order' => 6, 'is_vegetarian' => true],
                        ['name' => 'Steak & Cheese', 'description' => 'Cream cheese base, sliced steak, mushroom, mozzarella', 'price' => 94.90, 'sort_order' => 7],
                        ['name' => 'Pesto Chicken', 'description' => 'Pesto base, grilled chicken, sun-dried tomato, feta', 'price' => 94.90, 'sort_order' => 8],
                    ],
                    'Pasta' => [
                        ['name' => 'Spaghetti Bolognese', 'description' => 'Classic beef bolognese with parmesan', 'price' => 69.90, 'sort_order' => 9],
                        ['name' => 'Chicken Alfredo', 'description' => 'Fettuccine in creamy parmesan sauce with grilled chicken', 'price' => 79.90, 'sort_order' => 10],
                        ['name' => 'Penne Arrabiata', 'description' => 'Penne in spicy tomato sauce with garlic and chilli', 'price' => 64.90, 'sort_order' => 11, 'is_vegetarian' => true, 'spice_level' => 2],
                    ],
                    'Sides' => [
                        ['name' => 'Garlic Rolls (6)', 'description' => 'Soft bread rolls with garlic butter and herbs', 'price' => 29.90, 'sort_order' => 12, 'is_vegetarian' => true],
                        ['name' => 'Chicken Wings (8)', 'description' => 'Buffalo-style chicken wings with blue cheese dip', 'price' => 54.90, 'sort_order' => 13],
                        ['name' => 'Caesar Salad', 'description' => 'Romaine, croutons, parmesan, Caesar dressing', 'price' => 44.90, 'sort_order' => 14],
                    ],
                ],
            ],
            [
                'name' => 'The Ranch Grill',
                'slug' => 'the-ranch-grill-phalaborwa',
                'description' => 'Premium steaks, grilled meats, and hearty South African fare. The ultimate destination for meat lovers.',
                'cuisine_type' => 'Steakhouse, South African',
                'price_range' => '$$$$',
                'delivery_fee' => 25.00,
                'minimum_order' => 100.00,
                'estimated_delivery_minutes' => 45,
                'address' => '15 Hans van Rensburg Road, Phalaborwa, Limpopo',
                'latitude' => -23.9450,
                'longitude' => 31.1390,
                'phone' => '+27159872222',
                'is_featured' => true,
                'opens_at' => '11:00',
                'closes_at' => '22:00',
                'categories' => [
                    'Starters' => [
                        ['name' => 'Springbok Carpaccio', 'description' => 'Thinly sliced springbok with rocket, parmesan, and balsamic glaze', 'price' => 89.90, 'sort_order' => 1],
                        ['name' => 'Oxtail Potjie', 'description' => 'Slow-braised oxtail in rich gravy, served with bread', 'price' => 79.90, 'sort_order' => 2],
                        ['name' => 'Chicken Livers', 'description' => 'Pan-fried chicken livers in peri-peri sauce', 'price' => 59.90, 'sort_order' => 3, 'spice_level' => 2],
                    ],
                    'Steaks' => [
                        ['name' => 'Rump Steak (300g)', 'description' => 'Prime rump, grilled to perfection', 'price' => 129.90, 'sort_order' => 4],
                        ['name' => 'Sirloin Steak (250g)', 'description' => 'Tender sirloin with your choice of sauce', 'price' => 149.90, 'sort_order' => 5],
                        ['name' => 'T-Bone Steak (400g)', 'description' => 'Massive T-bone with chimichurri', 'price' => 179.90, 'sort_order' => 6],
                        ['name' => 'Fillet Steak (200g)', 'description' => 'Premium fillet with mushroom sauce', 'price' => 169.90, 'sort_order' => 7],
                    ],
                    'Grills' => [
                        ['name' => 'Mixed Grill Platter', 'description' => 'Rump, lamb chop, boerewors, chicken wing, chips', 'price' => 159.90, 'sort_order' => 8],
                        ['name' => 'Lamb Chops (4)', 'description' => 'Grilled lamb loin chops with mint sauce', 'price' => 139.90, 'sort_order' => 9],
                        ['name' => 'Boerewors Roll', 'description' => 'Traditional South African sausage in a roll with chakalaka', 'price' => 54.90, 'sort_order' => 10],
                    ],
                    'Sides' => [
                        ['name' => 'Creamed Spinach', 'description' => 'Rich and creamy spinach', 'price' => 29.90, 'sort_order' => 11, 'is_vegetarian' => true],
                        ['name' => 'Pap & Sheba', 'description' => 'Traditional maize porridge with tomato relish', 'price' => 34.90, 'sort_order' => 12, 'is_vegetarian' => true],
                        ['name' => 'Mielie Bread', 'description' => 'Sweet corn bread', 'price' => 24.90, 'sort_order' => 13, 'is_vegetarian' => true],
                        ['name' => 'Chakalaka & Rice', 'description' => 'Spicy South African vegetable relish with rice', 'price' => 34.90, 'sort_order' => 14, 'is_vegetarian' => true, 'is_vegan' => true, 'spice_level' => 1],
                    ],
                ],
            ],
        ];

        foreach ($restaurants as $restaurantData) {
            $categories = $restaurantData['categories'];
            unset($restaurantData['categories']);

            $restaurant = Restaurant::firstOrCreate(
                ['slug' => $restaurantData['slug']],
                array_merge($restaurantData, ['tenant_id' => $tenant->id])
            );

            foreach ($categories as $categoryName => $menuItems) {
                $category = RestaurantCategory::firstOrCreate(
                    ['restaurant_id' => $restaurant->id, 'name' => $categoryName],
                    ['sort_order' => $menuItems[0]['sort_order']]
                );

                foreach ($menuItems as $itemData) {
                    MenuItem::firstOrCreate(
                        [
                            'restaurant_id' => $restaurant->id,
                            'name' => $itemData['name'],
                        ],
                        array_merge($itemData, ['category_id' => $category->id])
                    );
                }
            }

            $this->command->info("Seeded restaurant: {$restaurant->name}");
        }
    }
}
