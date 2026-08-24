# Food Delegate Flow — EasyRyde

**Version:** 1.0.0
**Date:** 2026-07-02
**Status:** New feature specification

---

## 1. Overview

Allow users to order food for someone else, delegate delivery to specific drivers, support group ordering, and schedule deliveries. Extends the existing food delivery flow.

---

## 2. Actors

| Actor | Role | App |
|-------|------|-----|
| Orderer | Person placing and paying for order | Rider App |
| Recipient | Person receiving the food | SMS (no app required) |
| Driver | Person delivering the food | Driver App |
| Restaurant | Person preparing the food | Web (partner) |
| Admin | Monitor and support | Admin App |

---

## 3. User Stories

1. **Order for Someone Else:** "I want to order food for my mom who doesn't have the app"
2. **Delegate to Specific Driver:** "I want my usual driver to deliver my food"
3. **Group Ordering:** "I want to order lunch for the office and everyone pays their share"
4. **Scheduled Delivery:** "I want to order dinner for 7pm tonight"

---

## 4. Flow A: Order for Someone Else

```mermaid
sequenceDiagram
    participant O as Orderer (Rider App)
    participant API as Laravel API
    participant R as Restaurant
    participant S as Socket Server
    participant D as Driver (Driver App)
    participant RC as Recipient (SMS)
    
    O->>API: POST /food/restaurants/{id}/order
    Note right of O: items, delivery_address,<br/>recipient_name, recipient_phone,<br/>payment_method
    
    API->>API: Validate inputs
    API->>API: Process payment
    API->>API: Create FoodOrder (type: delegate)
    API->>API: Create FoodOrderDelegate record
    
    API->>R: Webhook: New order
    R->>API: POST /webhooks/partner/order/confirm
    API->>API: Status: confirmed
    
    API->>RC: SMS: "{orderer_name} ordered food for you from {restaurant}! Track: {url}"
    API->>O: Push: "Order confirmed! Preparing..."
    
    Note over R,D: Restaurant prepares food
    
    R->>API: Status: ready_for_pickup
    API->>RC: SMS: "Your food is ready for pickup!"
    API->>O: Push: "Food ready! Looking for driver..."
    
    API->>S: Find nearby drivers
    S->>D: food:order-request
    
    D->>S: food:order-accept
    S->>API: Assign driver
    
    API->>RC: SMS: "{driver_name} is picking up your order!"
    API->>O: Push: "Driver assigned! On the way to restaurant."
    
    Note over D,RC: Driver picks up and delivers
    
    D->>API: POST /driver/food/orders/{id}/status {status: "delivered"}
    API->>RC: SMS: "Your food has been delivered! Enjoy!"
    API->>O: Push: "Order delivered! Rate the delivery."
```

### 4.1 API Request

```json
POST /food/restaurants/{restaurant_id}/order
Authorization: Bearer {orderer_token}

{
  "items": [
    {
      "menu_item_id": "uuid-1",
      "quantity": 2,
      "special_instructions": "No onions"
    }
  ],
  "delivery_address": "789 Pine Rd, Phalaborwa",
  "delivery_latitude": -23.8850,
  "delivery_longitude": 29.4550,
  "payment_method": "wallet",
  "type": "delegate",
  "recipient_name": "Mama Mokoena",
  "recipient_phone": "+27821234567",
  "note_to_driver": "Please ring doorbell twice"
}
```

### 4.2 Recipient Experience (No App)

**SMS on Order Placed:**
```
Hi Mama! Sarah ordered food for you from Joe's Pizza.

2x Margherita Pizza
Delivery: 789 Pine Rd

Track: https://track.easyryde.co.za/food/order/xyz789

EasyRyde
```

**SMS on Food Ready:**
```
Your food from Joe's Pizza is ready!

Driver is on the way to pick it up.
ETA: 20 minutes

Track: https://track.easyryde.co.za/food/order/xyz789

EasyRyde
```

**SMS on Delivered:**
```
Your food has been delivered!

Enjoy your meal from Joe's Pizza!

EasyRyde
```

---

## 5. Flow B: Delegate to Specific Driver

```mermaid
sequenceDiagram
    participant O as Orderer
    participant API as Laravel API
    participant D as Specific Driver
    
    O->>API: POST /food/restaurants/{id}/order
    Note right of O: preferred_driver_id: "driver-uuid"
    
    API->>API: Check driver availability
    alt Driver online and available
        API->>D: food:order-request (priority)
        D->>API: food:order-accept
        API->>O: Push: "Your preferred driver accepted!"
    else Driver unavailable
        API->>O: Push: "Preferred driver unavailable. Finding another..."
        API->>API: Fall back to auto-assignment
    end
```

### 5.1 Driver Availability Check

```php
// OrderService::delegateToDriver()
public function delegateToDriver(FoodOrder $order, string $driverId)
{
    $driver = Driver::findOrFail($driverId);
    
    // Check driver is online
    if (!$driver->is_online) {
        throw new \Exception('Driver is currently offline');
    }
    
    // Check driver is not on an active ride
    if ($driver->activeRide()->exists()) {
        throw new \Exception('Driver is currently on a ride');
    }
    
    // Check driver is within delivery radius
    $distance = $this->calculateDistance(
        $driver->currentLat(),
        $driver->currentLng(),
        $order->restaurant->latitude,
        $order->restaurant->longitude
    );
    
    if ($distance > 5000) { // 5km
        throw new \Exception('Driver is too far from restaurant');
    }
    
    // Assign driver
    $order->update([
        'driver_id' => $driverId,
        'assignment_type' => 'delegated',
    ]);
    
    // Notify driver with priority
    event(new FoodOrderAssigned($order, priority: true));
}
```

---

## 6. Flow C: Group Ordering

```mermaid
sequenceDiagram
    participant H as Host (Rider App)
    participant API as Laravel API
    participant M1 as Member 1 (SMS)
    participant M2 as Member 2 (SMS)
    participant R as Restaurant
    participant D as Driver
    
    H->>API: POST /food/groups/create
    Note right of H: restaurant_id, host_name
    
    API->>H: Group code: "LUNCH2026"
    
    H->>M1: Share link: https://easyryde.co.za/group/LUNCH2026
    H->>M2: Share link: https://easyryde.co.za/group/LUNCH2026
    
    M1->>API: POST /food/groups/{code}/add-items
    Note right of M1: 1x Burger, 1x Fries
    
    M2->>API: POST /food/groups/{code}/add-items
    Note right of M2: 1x Pizza, 1x Coke
    
    H->>API: POST /food/groups/{code}/add-items
    Note right of H: 1x Salad
    
    H->>API: POST /food/groups/{code}/checkout
    Note right of H: payment_method: "split"
    
    API->>API: Calculate totals per member
    API->>M1: SMS: "Your share: R85. Pay now: {url}"
    API->>M2: SMS: "Your share: R110. Pay now: {url}"
    
    Note over M1,M2: Members pay their shares
    
    M1->>API: POST /food/groups/{code}/pay {member_id, method: "wallet"}
    M2->>API: POST /food/groups/{code}/pay {member_id, method: "cash"}
    
    API->>API: All paid? Create combined order
    API->>R: Webhook: Combined order
    API->>H: Push: "Group order placed! Total: R295"
```

### 6.1 Group Order Data Model

```sql
CREATE TABLE food_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    host_id UUID NOT NULL REFERENCES users(id),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    status VARCHAR(50) DEFAULT 'collecting', -- collecting, checkout, placed, delivered
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE food_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES food_groups(id),
    user_id UUID REFERENCES users(id), -- null if guest
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    items JSONB NOT NULL,
    share_amount DECIMAL(10,2),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. Flow D: Scheduled Delivery

```mermaid
sequenceDiagram
    participant O as Orderer
    participant API as Laravel API
    participant S as Scheduler
    participant R as Restaurant
    participant D as Driver
    
    O->>API: POST /food/restaurants/{id}/order
    Note right of O: scheduled_for: "2026-07-02T19:00:00"
    
    API->>API: Create FoodOrder (status: scheduled)
    API->>API: Process payment immediately
    API->>O: Push: "Order scheduled for 7:00 PM"
    
    Note over S: 30 minutes before scheduled time
    
    S->>API: scheduled-food-orders:publish job
    API->>API: Find orders due in 30 min
    API->>R: Webhook: Prepare order
    R->>API: Status: confirmed
    
    API->>O: SMS: "Your scheduled order is being prepared!"
    
    Note over R: Restaurant prepares food
    
    R->>API: Status: ready_for_pickup
    API->>D: Find nearby drivers
    D->>API: Accept order
    
    D->>API: POST /driver/food/orders/{id}/status {status: "delivered"}
    API->>O: Push: "Your scheduled delivery arrived!"
```

### 7.1 Scheduler Implementation

```php
// ScheduledFoodOrdersPublishJob (runs every minute)
public function handle()
{
    $dueOrders = FoodOrder::where('status', 'scheduled')
        ->where('scheduled_for', '<=', now()->addMinutes(30))
        ->get();
    
    foreach ($dueOrders as $order) {
        // Update status to placed
        $order->update(['status' => 'placed']);
        
        // Notify restaurant
        $this->restaurantService->notifyNewOrder($order);
        
        // Notify customer
        Notification::send($order->customer, new ScheduledOrderPreparing($order));
    }
}
```

---

## 8. Socket.IO Events

| Event | Direction | Payload | Room |
|-------|-----------|---------|------|
| `food:order-request` | Server → Driver | order details | driver:{driverId} |
| `food:order-accept` | Driver → Server | orderId | food:{orderId} |
| `food:order-status` | Server → Orderer | status update | user:{ordererId} |
| `food:group-item-added` | Server → Group | member, items | group:{groupId} |
| `food:group-checkout` | Server → Group | totals | group:{groupId} |
| `food:delegate-assigned` | Server → Orderer | driver info | user:{ordererId} |

---

## 9. Database Changes

### New Tables

```sql
-- Food order delegates (order for someone else)
CREATE TABLE food_order_delegates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_order_id UUID NOT NULL REFERENCES food_orders(id),
    orderer_id UUID NOT NULL REFERENCES users(id),
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    tracking_token VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Group orders
CREATE TABLE food_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    host_id UUID NOT NULL REFERENCES users(id),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    status VARCHAR(50) DEFAULT 'collecting',
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE food_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES food_groups(id),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    items JSONB NOT NULL,
    share_amount DECIMAL(10,2),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Food order table changes
ALTER TABLE food_orders ADD COLUMN type VARCHAR(50) DEFAULT 'standard';
-- Values: 'standard', 'delegate', 'group', 'scheduled'
ALTER TABLE food_orders ADD COLUMN scheduled_for TIMESTAMP;
ALTER TABLE food_orders ADD COLUMN preferred_driver_id UUID REFERENCES users(id);
ALTER TABLE food_orders ADD COLUMN assignment_type VARCHAR(50);
-- Values: 'auto', 'delegated', 'preferred'
```

---

## 10. API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/food/restaurants/{id}/order` | POST | Sanctum | Create order (with delegate fields) |
| `/food/groups/create` | POST | Sanctum | Create group order |
| `/food/groups/{code}` | GET | Sanctum | Get group order details |
| `/food/groups/{code}/add-items` | POST | Sanctum/Guest | Add items to group |
| `/food/groups/{code}/checkout` | POST | Sanctum (host) | Finalize group order |
| `/food/groups/{code}/pay` | POST | Sanctum/Guest | Pay member's share |
| `/food/orders/{id}/delegate` | GET | Sanctum | Get delegate info |
| `/food/orders/{id}/track` | GET | Public | Public tracking page |

---

## 11. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Recipient phone not registered | Allow (SMS tracking works) |
| Recipient phone is another user | Allow (they can track via SMS) |
| Group member doesn't pay | Host can remove member or pay for them |
| Host leaves group | Transfer host to another member |
| Restaurant closes before scheduled time | Refund and notify |
| Preferred driver declines | Fall back to auto-assignment |
| Group order > restaurant capacity | Split across restaurants (future) |
| Delivery to different addresses | Not supported (same address for group) |

---

## 12. Validation Rules

| Field | Rule | Error |
|-------|------|-------|
| recipient_name | Required if type=delegate, 2-100 chars | "Enter recipient name" |
| recipient_phone | Required if type=delegate, valid SA format | "Enter valid phone" |
| scheduled_for | Must be future, min 1 hour ahead | "Schedule at least 1 hour ahead" |
| preferred_driver_id | Must be online and available | "Driver unavailable" |
| group code | 6 alphanumeric, unique | Auto-generated |

---

## 13. Cost Estimate

| Item | Monthly Cost |
|------|-------------|
| SMS (1000 delegate orders × 3 SMS) | R1,500 |
| Tracking page hosting | R200 |
| Development (20 days) | R100,000 |
| **Total** | **R101,700** |

---

## 14. Implementation Priority

| # | Task | Effort | Flow |
|---|------|--------|------|
| 1 | Database migrations | 1 day | All |
| 2 | Delegate order flow (backend) | 3 days | A |
| 3 | Delegate order flow (mobile) | 2 days | A |
| 4 | SMS templates + service | 1 day | A |
| 5 | Public tracking page | 1 day | A |
| 6 | Preferred driver delegation | 2 days | B |
| 7 | Group order backend | 4 days | C |
| 8 | Group order mobile | 3 days | C |
| 9 | Scheduled delivery | 2 days | D |
| 10 | Testing | 3 days | All |

**Total:** ~22 days (1 developer)
