# EasyRyde — Food Delivery Flows

> **Segment**: 03-WORKFLOWS · **Status**: VERIFIED 2026-08-14  
> **Deep drills**: `../../docs/flow/04-cross-cutting/food-delivery-flow.md`, `../../docs/flow/05-production-readiness/food-delegate-flow.md`

---

## 1. Actors & Roles in Food

| Actor | Interface | Does |
|---|---|---|
| Customer (rider app) | Food tab | browse, cart, checkout, track, rate |
| Driver (driver app) | Food tab | accept orders, update status, deliver |
| Restaurant (admin panel) | `FoodAdminController` | menu/categories CRUD, order visibility |
| PHBIMH partner (future delegate) | phbimh webhooks | external order delegation (`PhbimhIntegrationService`) |

## 2. Order Lifecycle

```
GET /food/restaurants (nearby, open, active)
  → GET /food/restaurants/{id}/menu (categories → items, availability flags)
  → POST /food/restaurants/{id}/order (items[] w/ qty + special instructions,
        delivery_address, payment_method: wallet|card-gateway, tip_amount)
      validation: restaurant open (FoodDeliveryService::isRestaurantOpen), min order
  → food_orders.status: pending → prepared → available_for_pickup → picked_up → in_transit → delivered
  → socket food-order:status to food-order:{id} / user:{customerId} / user:{driverId} / admin
  → GET /food/orders/{id} — 10s poll fallback (FoodOrderTrackingScreen)
  → POST /food/orders/{id}/rate (1-5 + comment)
  → POST /food/orders/{id}/cancel — before prep
```

## 3. Driver Side

```
GET /driver/food/orders/available (open queue; driver tab)
  → POST /driver/food/orders/{id}/accept → assigned
  → POST /driver/food/orders/{id}/status transitions (pickup → deliver)
  → GET /driver/food/orders (my orders) · FoodOrderDetailScreen tracks
  → food-order:driver-location → customer tracking
```

## 4. Money Mechanics

- Payment: wallet debit or gateway charge via `FoodOrderService` (PaymentService dep); `payment_id` links order to payment row.
- Refund: admin-gated `FoodOrderService::processRefund` (order cancel path).
- Fees: subtotal + delivery_fee + service_fee + tip; totals server-computed.
- Wallet insufficient → checkout blocked with top-up prompt (FoodCheckoutScreen checks balance).

## 5. Restaurant Ops (admin panel)

| Operation | Endpoint | Notes |
|---|---|---|
| List/create/update restaurants | `GET/POST/PUT /admin/food/restaurants` | hours, geolat, fees, featured |
| Category create | `POST /admin/food/restaurants/{r}/categories` | sort order |
| Menu item create/update/delete | `POST …/menu-items`, `PUT/DELETE /admin/food/menu-items/{item}` | availability toggles |
| Orders overview + assign driver | `GET /admin/food/orders`, `POST /admin/food/food-orders/{order}/assign-driver` | |

## 6. Edge Cases

- Restaurant closed at order time → 422 with open-hours.
- Menu item `is_available=false` → excluded from menu + rejected at checkout.
- Order + driver both handling same order → server-side status guard (transitions explicit).
- Food during peak → driver may be on ride; no cross-job rejection logic yet (see BACKLOG B-102).

## References

- Data: `../02-DATA-MODEL/ENTITIES.md` §5 · Failure modes: `FAILURE-MODES.md` (F-FD-*) · Delegate flow: `../../docs/flow/05-production-readiness/food-delegate-flow.md`