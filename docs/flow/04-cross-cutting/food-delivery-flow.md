# Food Delivery Flow — EasyRyde

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

Food delivery lifecycle: restaurant browsing, menu ordering, payment, driver assignment, tracking, and delivery completion.

---

## 2. Actors

| Actor | Role | App |
|-------|------|-----|
| Rider | Food orderer | Rider App |
| Driver | Food deliverer | Driver App |
| Restaurant | Food preparer | Web (partner) |
| Admin | Restaurant/order manager | Admin App / Web |

---

## 3. Food Order State Machine

```
                    +----------------+
                    |    PLACED      |
                    +-------+--------+
                            |
                    +-------v--------+
                    |   CONFIRMED    |
                    +-------+--------+
                            |
                    +-------v--------+
                    |  PREPARING     |
                    +-------+--------+
                            |
                    +-------v--------+
                    |  READY_FOR     |
                    |  PICKUP        |
                    +-------+--------+
                            |
                    +-------v--------+
                    |  PICKED_UP     |
                    +-------+--------+
                            |
                    +-------v--------+
                    |  IN_DELIVERY   |
                    +-------+--------+
                            |
              +-------------+-------------+
              |                           |
    +---------v---------+     +-----------v-----------+
    |    DELIVERED       |     |     CANCELLED         |
    +-------------------+     +-----------------------+
```

---

## 4. End-to-End Flow

### 4.1 Restaurant Browsing (Rider)

```
Rider opens RestaurantListScreen
    |
    +---> GET /food/restaurants
    |     Returns: [{ id, name, cuisine_type, rating, delivery_fee, ... }]
    |
    +---> Display restaurant cards
    |     - Image, name, cuisine, rating
    |     - Delivery time, minimum order, delivery fee
    |
    +---> Rider taps restaurant
    |
    +---> Navigate to RestaurantMenuScreen
```

### 4.2 Menu Viewing and Cart (Rider)

```
RestaurantMenuScreen loads
    |
    +---> GET /food/restaurants/{id}/menu
    |     Returns: [{ id, name, price, description, is_available, ... }]
    |
    +---> Display menu by category
    |     - Item name, description, price
    |     - Add to cart button
    |
    +---> Rider taps "Add to Cart"
    |     - Cart state updated (local)
    |     - Cart count badge updates
    |
    +---> Rider views cart
    |     - List of items with quantities
    |     - Subtotal calculation
    |     - Delivery fee
    |     - Total
    |
    +---> Navigate to FoodCheckoutScreen
```

### 4.3 Checkout and Order (Rider)

```
FoodCheckoutScreen
    |
    +---> Order summary:
    |     - Items with quantities and prices
    |     - Subtotal, delivery fee, total
    |
    +---> Delivery address input
    |
    +---> Payment method selection (Cash/Wallet/Stripe)
    |
    +---> Rider taps "Place Order"
    |
    +---> POST /food/restaurants/{id}/order
    |     {
    |       items: [{ menu_item_id, quantity, special_instructions }],
    |       delivery_address,
    |       payment_method
    |     }
    |
    +---> Backend creates FoodOrder:
    |     - status: "placed"
    |     - Links to restaurant, customer
    |     - Creates FoodOrderItems
    |     - Processes payment
    |
    +---> Navigate to FoodOrderTrackingScreen
```

### 4.4 Order Processing (Restaurant)

```
Restaurant receives order (via webhook or admin panel)
    |
    +---> POST /webhooks/partner/order (or manual)
    |
    +---> Restaurant confirms order:
    |     status: "confirmed"
    |
    +---> Restaurant starts preparing:
    |     status: "preparing"
    |
    +---> Restaurant marks ready:
    |     status: "ready_for_pickup"
    |
    +---> Notification sent to rider:
    |     "Your order is being prepared"
    |     "Your order is ready for pickup"
```

### 4.5 Driver Assignment

```
Order ready for pickup
    |
    +---> Admin assigns driver (or auto-assign):
    |     POST /deliveries/{id}/assign
    |     { driver_id }
    |
    +---> Driver notified via push:
    |     "New food delivery order available"
    |
    +---> Driver accepts in FoodOrderDetailScreen:
    |     POST /driver/food/orders/{order}/accept
    |
    +---> Status: "picked_up"
    |
    +---> Driver navigates to restaurant
```

### 4.6 Delivery Tracking (Rider)

```
FoodOrderTrackingScreen
    |
    +---> GET /food/orders/{id} (polling or socket)
    |
    +---> Display order status:
    |     - Placed -> Confirmed -> Preparing -> Ready
    |     -> Picked Up -> In Delivery -> Delivered
    |
    +---> If driver assigned:
    |     - Show driver info
    |     - Show estimated delivery time
    |     - Real-time location (if Socket.IO connected)
```

### 4.7 Delivery Completion

```
Driver arrives at delivery address
    |
    +---> POST /driver/food/orders/{order}/status
    |     { status: "delivered" }
    |
    +---> Backend updates order:
    |     - status: "delivered"
    |     - delivered_at: now
    |
    +---> Rider receives notification:
    |     "Your order has been delivered!"
    |
    +---> Rider can rate order:
    |     POST /food/orders/{order}/rate
    |     { score: 5, comment: "Great delivery!" }
```

---

## 5. API Endpoints

### Rider Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /food/restaurants | GET | List restaurants |
| /food/restaurants/{id} | GET | Restaurant details |
| /food/restaurants/{id}/menu | GET | Restaurant menu |
| /food/restaurants/{id}/order | POST | Create order |
| /food/orders | GET | My orders |
| /food/orders/{id} | GET | Order details |
| /food/orders/{id}/cancel | POST | Cancel order |
| /food/orders/{id}/rate | POST | Rate order |

### Driver Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /driver/food/orders | GET | My delivery orders |
| /driver/food/orders/available | GET | Available orders |
| /driver/food/orders/{id}/accept | POST | Accept order |
| /driver/food/orders/{id}/status | POST | Update status |

### Admin Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /admin/food/restaurants | CRUD | Manage restaurants |
| /admin/food/restaurants/{id}/menu | CRUD | Manage menu items |
| /restaurant/food/orders | GET | Restaurant orders |
| /deliveries/{id}/assign | POST | Assign driver |

### Webhook Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /webhooks/partner/order | POST | Receive partner order |
| /webhooks/partner/status | POST | Order status update |

---

## 6. Data Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| Restaurant | Restaurant info | name, cuisine_type, delivery_fee, minimum_order |
| RestaurantCategory | Menu categories | name, sort_order |
| MenuItem | Menu items | name, price, is_available, preparation_time |
| FoodOrder | Order record | status, total, delivery_address, payment_method |
| FoodOrderItem | Order line items | menu_item_id, quantity, price, special_instructions |
| Delivery | Delivery record | driver_id, status, pickup/dropoff addresses |

---

## 7. Payment Flow

| Method | Processing | Timing |
|--------|-----------|--------|
| Cash | Record on order creation | Pay on delivery |
| Wallet | Deduct immediately | On order placement |
| Stripe | PaymentIntent | On order placement |

Platform fee: Same as rides (15% of order total).

---

## 8. Known Gaps

1. No real-time restaurant menu updates (prices may change)
2. No order preparation time estimation
3. No driver auto-assignment for food orders
4. No restaurant partner app (webhook-based only)
5. No food order cancellation by restaurant
6. No substitution handling for out-of-stock items
7. No tip functionality for drivers
8. No order reordering (repeat previous order)
