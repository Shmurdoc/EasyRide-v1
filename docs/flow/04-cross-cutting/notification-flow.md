# Notification Flow — EasyRyde

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

Multi-channel notification system: push (FCM), in-app, SMS (Twilio), and email (SendGrid).

---

## 2. Notification Channels

| Channel | Provider | Use Case | Delivery |
|---------|----------|----------|----------|
| Push | Firebase Cloud Messaging | Ride alerts, payment confirmations | Immediate |
| In-App | Database (InAppNotification) | System messages, ride updates | On app open |
| SMS | Twilio | OTP, SOS alerts, ride status | Immediate |
| Email | SendGrid | Receipts, password reset, weekly reports | Near-immediate |

---

## 3. Notification Architecture

```
Backend Service Layer
    |
    +---> NotificationService (orchestrator)
    |         |
    |         +---> PushNotificationService (FCM)
    |         +---> SmsService (Twilio)
    |         +---> EmailService (SendGrid)
    |         +---> InAppNotification (database)
    |
    +---> Deduplication (Redis, 1-hour TTL)
```

---

## 4. Push Notification Flow

### 4.1 Token Registration

```
App launch
    |
    +---> Expo Notifications.getExpoPushTokenAsync()
    |
    +---> POST /notifications/register-token
    |     { token, platform: "android"|"ios" }
    |
    +---> Backend stores in push_tokens table
    |     { user_id, token, platform, is_active: true }
```

### 4.2 Sending Push Notifications

```
Event triggers notification (ride accepted, payment, etc.)
    |
    +---> NotificationService::send(userId, title, body, type)
    |
    +---> Check deduplication (Redis)
    |     Key: notification:{userId}:{type}:{hash}
    |     TTL: 1 hour
    |     If exists: Skip (duplicate)
    |
    +---> Find user's active push tokens
    |
    +---> For each token:
    |     FCM HTTP v1 API:
    |     POST https://fcm.googleapis.com/v1/projects/{id}/messages:send
    |     {
    |       message: {
    |         token: "expo_push_token",
    |         notification: { title, body },
    |         data: { rideId, type }
    |       }
    |     }
    |
    +---> If token invalid (404):
          Deactivate token in database
```

---

## 5. Notification Types

| Type | Channel | Trigger | Message |
|------|---------|---------|---------|
| ride_accepted | Push | Driver accepts ride | "Driver is on the way!" |
| ride_arrived | Push | Driver arrives at pickup | "Your driver has arrived" |
| ride_started | Push | Trip begins | "Ride in progress" |
| ride_completed | Push | Trip ends | "Ride complete. Rate your driver!" |
| ride_cancelled | Push | Ride cancelled | "Ride cancelled" |
| payment_success | Push | Payment processed | "Payment of R{amount} confirmed" |
| driver_approved | Push | Admin approves driver | "Your account has been approved!" |
| driver_rejected | Push | Admin rejects driver | "Application not approved" |
| sos_alert | Push/SMS | SOS triggered | "SOS alert from {user}" |
| low_balance | Push | Wallet below threshold | "Low wallet balance: R{amount}" |
| promo_code | Push | Promo sent | "Use code {code} for {discount} off!" |
| weekly_earnings | Email | Weekly report | "Your weekly earnings: R{amount}" |
| password_reset | Email | Reset request | "Reset your password" |
| otp | SMS | Login verification | "Your code: {code}" |

---

## 6. In-App Notification Flow

```
Notification created
    |
    +---> Insert into in_app_notifications table
    |     { user_id, title, body, type, data, is_read: false }
    |
    +---> User opens app
    |
    +---> GET /notifications/
    |     Returns unread notifications
    |
    +---> User taps notification
    |
    +---> POST /notifications/{id}/read
    |     Sets is_read: true, read_at: now
    |
    +---> Navigate to relevant screen based on type
```

---

## 7. SMS Flow (Twilio)

```
SMS trigger (OTP, SOS, ride status)
    |
    +---> SmsService::send(phone, template, data)
    |
    +---> Select template:
    |     - ride_status: "Your ride to {address} is {status}"
    |     - payment: "Payment of R{amount} confirmed"
    |     - otp: "Your verification code: {code}"
    |     - sos: "SOS alert from {name} at {location}"
    |
    +---> Twilio REST API:
    |     POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json
    |     { To, From, Body }
    |
    +---> If delivery fails:
          Log error, continue (non-blocking)
```

---

## 8. Email Flow (SendGrid)

```
Email trigger (receipt, password reset, weekly report)
    |
    +---> EmailService::send(to, subject, template, data)
    |
    +---> Render HTML template
    |
    +---> SendGrid v3 API:
    |     POST https://api.sendgrid.com/v3/mail/send
    |     {
    |       personalizations: [{ to: [{ email }] }],
    |       from: { email: "noreply@easyryde.co.za" },
    |       subject,
    |       content: [{ type: "text/html", value: html }]
    |     }
    |
    +---> If delivery fails:
          Log error, continue (non-blocking)
```

---

## 9. Deduplication

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| notification:{userId}:{type}:{hash} | 1 hour | Prevent duplicate push |
| notification:sms:{phone}:{type} | 5 min | Prevent duplicate SMS |
| notification:email:{to}:{type} | 1 hour | Prevent duplicate email |

---

## 10. Error Handling

| Failure | Impact | Recovery |
|---------|--------|----------|
| FCM down | Push notifications lost | In-app still works |
| Twilio down | SMS not delivered | Email/push still work |
| SendGrid down | Emails not sent | Push/SMS still work |
| Invalid FCM token | Notification not delivered | Auto-deactivate token |
| User unregistered | No notifications | Check token validity |

---

## 11. Known Gaps

1. No notification preferences (can't opt out of specific types)
2. No notification history beyond in-app (no push history)
3. No scheduled notifications (except weekly earnings)
4. No notification batching (multiple rides = multiple pushes)
5. Admin app doesn't receive push notifications for SOS alerts
