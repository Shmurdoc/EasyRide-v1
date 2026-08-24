# Load Testing Plan — EasyRyde

**Version:** 1.0.0
**Date:** 2026-07-02
**Status:** Pre-launch testing plan

---

## 1. Overview

Load testing strategy for EasyRyde production launch. Target: Phalaborwa market with 200 concurrent users, 50 concurrent rides, 1000 daily rides.

---

## 2. Testing Environment

| Component | Production Spec | Test Spec |
|-----------|----------------|-----------|
| Laravel API | 2 vCPU, 4GB RAM | Same |
| Socket.IO | 2 vCPU, 2GB RAM | Same |
| PostgreSQL | 2 vCPU, 4GB RAM | Same |
| Redis | 1 vCPU, 2GB RAM | Same |
| Nginx | 1 vCPU, 1GB RAM | Same |
| Queue Worker | 2 vCPU, 2GB RAM | Same |

---

## 3. Test Scenarios

### 3.1 Scenario: Normal Operations (Baseline)

**Goal:** Establish baseline performance under normal load.

| Metric | Target | Fail Criteria |
|--------|--------|---------------|
| API response time (p95) | <200ms | >500ms |
| API response time (p99) | <500ms | >1000ms |
| Socket.IO connection time | <500ms | >2000ms |
| Ride creation time | <1s | >3s |
| Payment processing time | <3s | >5s |
| Error rate | <0.1% | >1% |

**Load Profile:**
```
Duration: 30 minutes
Concurrent users: 50
Rides per minute: 5
Location updates per second: 10
Payment requests per minute: 5
```

### 3.2 Scenario: Peak Load

**Goal:** Test system under Phalaborwa peak demand (Friday evening, month-end).

| Metric | Target | Fail Criteria |
|--------|--------|---------------|
| API response time (p95) | <500ms | >1000ms |
| API response time (p99) | <1000ms | >2000ms |
| Socket.IO connections | 200 concurrent | Connection failures |
| Ride matching time | <15s | >30s |
| Payment success rate | >99% | <98% |
| Error rate | <0.5% | >2% |

**Load Profile:**
```
Duration: 60 minutes
Concurrent users: 200
Rides per minute: 20
Location updates per second: 50
Payment requests per minute: 20
Food orders per minute: 10
```

### 3.3 Scenario: Stress Test

**Goal:** Find breaking point.

| Metric | Target | Fail Criteria |
|--------|--------|---------------|
| Concurrent users | 500 | System crash |
| Database connections | 100 | Connection pool exhausted |
| Redis memory | 256MB | OOM kill |
| Queue depth | 1000 | Job failures |
| Socket.IO connections | 1000 | Server restart |

**Load Profile:**
```
Duration: 30 minutes
Concurrent users: 500 (ramp up from 0 over 10 minutes)
Rides per minute: 50
Location updates per second: 100
Payment requests per minute: 50
```

### 3.4 Scenario: Location Tracking Stress

**Goal:** Test GPS update handling under load.

| Metric | Target | Fail Criteria |
|--------|--------|---------------|
| Location update latency | <100ms | >500ms |
| Redis GEO query time | <50ms | >200ms |
| Nearby driver search | <500ms | >2s |
| Location broadcast delay | <200ms | >1s |
| Stale location cleanup | <1s | >5s |

**Load Profile:**
```
Duration: 30 minutes
Concurrent drivers: 100
Location updates per driver: every 5s
Total updates/second: 20
```

### 3.5 Scenario: Payment Processing Under Load

**Goal:** Test payment system under concurrent load.

| Metric | Target | Fail Criteria |
|--------|--------|---------------|
| Payment success rate | >99% | <98% |
| Duplicate payment rate | 0% | >0% |
| Wallet balance accuracy | 100% | Any discrepancy |
| Escrow processing time | <1s | >5s |
| Payment rollback success | 100% | Any failure |

**Load Profile:**
```
Duration: 30 minutes
Concurrent payments: 20
Payment methods: 40% wallet, 30% cash, 20% Stripe, 10% PayFast
Ride completion rate: 10/minute
```

### 3.6 Scenario: Socket.IO Reconnection Storm

**Goal:** Test behavior when many clients reconnect simultaneously.

| Metric | Target | Fail Criteria |
|--------|--------|---------------|
| Reconnection success rate | >95% | <90% |
| Reconnection time | <5s | >30s |
| Event loss during reconnect | <1% | >5% |
| Duplicate events | 0% | >0% |
| Memory leak | 0% | Growing usage |

**Load Profile:**
```
Duration: 15 minutes
Connected clients: 200
Simulate network drop: All clients disconnect at t=5min
Reconnection window: 10 minutes
```

---

## 4. Load Testing Tools

### 4.1 k6 (Primary)

```javascript
// ride-booking-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const rideDuration = new Trend('ride_booking_duration');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up
    { duration: '5m', target: 50 },   // Stay at 50
    { duration: '2m', target: 100 },  // Ramp up to 100
    { duration: '5m', target: 100 },  // Stay at 100
    { duration: '2m', target: 200 },  // Peak load
    { duration: '10m', target: 200 }, // Stay at peak
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.01'],
    ride_booking_duration: ['p(95)<2000'],
  },
};

const BASE_URL = 'https://api.easyryde.co.za';

export default function () {
  // Login
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: `loadtest rider${__VU}@test.com`,
    password: 'testpassword123',
  }), { headers: { 'Content-Type': 'application/json' } });
  
  check(loginRes, { 'login successful': (r) => r.status === 200 });
  const token = loginRes.json('data.token');
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  // Create ride
  const rideStart = Date.now();
  const rideRes = http.post(`${BASE_URL}/rides`, JSON.stringify({
    pickup_latitude: -23.9045 + (Math.random() * 0.01),
    pickup_longitude: 29.4688 + (Math.random() * 0.01),
    dropoff_latitude: -23.8900 + (Math.random() * 0.01),
    dropoff_longitude: 29.4500 + (Math.random() * 0.01),
    pickup_address: 'Load Test Pickup',
    dropoff_address: 'Load Test Dropoff',
    category: 'economy',
    payment_method: 'wallet',
  }), { headers });
  
  const rideSuccess = check(rideRes, { 'ride created': (r) => r.status === 201 });
  errorRate.add(!rideSuccess);
  rideDuration.add(Date.now() - rideStart);
  
  sleep(Math.random() * 10 + 5); // 5-15 second think time
}

// socket-io-load.js
import ws from 'k6/ws';

export default function () {
  const url = 'wss://socket.easyryde.co.za/socket.io/?EIO=4&transport=websocket';
  
  const res = ws.connect(url, {}, (socket) => {
    socket.on('open', () => {
      // Authenticate
      socket.send(`42["auth",{"token":"${TOKEN}"}]`);
    });
    
    socket.on('message', (message) => {
      // Handle ride requests
      if (message.includes('ride:request')) {
        // Accept ride after random delay
        setTimeout(() => {
          socket.send(`42["driver:accept-ride",{"rideId":"${RIDE_ID}"}]`);
        }, Math.random() * 3000);
      }
    });
    
    // Send location updates every 5 seconds
    setInterval(() => {
      const lat = -23.9045 + (Math.random() * 0.01);
      const lng = 29.4688 + (Math.random() * 0.01);
      socket.send(`42["driver:location-update",{"lat":${lat},"lng":${lng}}]`);
    }, 5000);
  });
  
  check(res, { 'socket connected': (r) => r.status === 101 });
}
```

### 4.2 Apache JMeter (Alternative)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan>
  <TestPlan>
    <elementProp name="HTTP_Request" elementType="HTTPSampler">
      <stringProp name="HTTPSampler.domain">api.easyryde.co.za</stringProp>
      <stringProp name="HTTPSampler.path">/rides</stringProp>
      <stringProp name="HTTPSampler.method">POST</stringProp>
    </elementProp>
  </TestPlan>
</jmeterTestPlan>
```

---

## 5. Monitoring During Tests

### 5.1 Metrics to Capture

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| API response time | Prometheus/Grafana | p95 > 500ms |
| Error rate | Sentry | > 1% |
| CPU usage | Node Exporter | > 80% |
| Memory usage | Node Exporter | > 85% |
| PostgreSQL connections | pg_stat_activity | > 80 of 100 |
| Redis memory | Redis INFO | > 200MB |
| Redis operations/sec | Redis INFO | > 10000 |
| Queue depth | Horizon dashboard | > 100 |
| Socket.IO connections | Custom metric | > 500 |
| Active rides | Custom metric | > 50 concurrent |

### 5.2 Grafana Dashboard Setup

```json
{
  "dashboard": {
    "title": "EasyRyde Load Testing",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [{"expr": "http_request_duration_seconds{quantile=\"0.95\"}"}]
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [{"expr": "rate(http_requests_total{status=~\"5..\"}[5m])"}]
      },
      {
        "title": "Active Connections",
        "type": "graph",
        "targets": [{"expr": "socket_io_connections"}]
      },
      {
        "title": "PostgreSQL Connections",
        "type": "graph",
        "targets": [{"expr": "pg_stat_activity_count"}]
      },
      {
        "title": "Redis Memory",
        "type": "graph",
        "targets": [{"expr": "redis_memory_used_bytes"}]
      }
    ]
  }
}
```

---

## 6. Pass/Fail Criteria

### 6.1 Go/No-Go Matrix

| Scenario | All Pass | Partial Pass | Fail |
|----------|----------|--------------|------|
| Normal Operations | GO | CONDITIONAL GO | NO-GO |
| Peak Load | GO | CONDITIONAL GO | NO-GO |
| Stress Test | INFO | INFO | INFO |
| Location Tracking | GO | CONDITIONAL GO | NO-GO |
| Payment Processing | GO | NO-GO | NO-GO |
| Reconnection Storm | GO | CONDITIONAL GO | NO-GO |

### 6.2 Detailed Criteria

| Metric | Pass | Conditional | Fail |
|--------|------|-------------|------|
| API p95 latency | <200ms | 200-500ms | >500ms |
| API p99 latency | <500ms | 500-1000ms | >1000ms |
| Error rate | <0.1% | 0.1-1% | >1% |
| Socket connection success | >99% | 95-99% | <95% |
| Ride matching time | <10s | 10-20s | >20s |
| Payment success rate | >99.5% | 98-99.5% | <98% |
| Database connections | <80 | 80-95 | >95 |
| Redis memory | <200MB | 200-250MB | >250MB |
| Queue job success | >99% | 95-99% | <95% |
| CPU usage | <70% | 70-85% | >85% |
| Memory usage | <75% | 75-85% | >85% |

---

## 7. Test Data Strategy

### 7.1 Test Users

```sql
-- Generate 1000 test riders
INSERT INTO users (id, name, email, phone_number, role, created_at)
SELECT 
    gen_random_uuid(),
    'Load Test Rider ' || i,
    'loadtest-rider' || i || '@test.com',
    '+2782' || LPAD(i::text, 7, '0'),
    'rider',
    NOW() - (random() * interval '30 days')
FROM generate_series(1, 1000) i;

-- Generate 200 test drivers
INSERT INTO users (id, name, email, phone_number, role, created_at)
SELECT 
    gen_random_uuid(),
    'Load Test Driver ' || i,
    'loadtest-driver' || i || '@test.com',
    '+2783' || LPAD(i::text, 7, '0'),
    'driver',
    NOW() - (random() * interval '30 days')
FROM generate_series(1, 200) i;

-- Create wallets with balance
INSERT INTO wallets (id, user_id, balance, currency)
SELECT gen_random_uuid(), id, 1000.00, 'ZAR'
FROM users WHERE role = 'rider';
```

### 7.2 Test Locations

```javascript
// Phalaborwa area coordinates
const testLocations = [
  { name: 'CBD', lat: -23.9045, lng: 29.4688 },
  { name: 'Mall', lat: -23.9000, lng: 29.4650 },
  { name: 'Airport', lat: -23.9300, lng: 29.4400 },
  { name: 'Residential North', lat: -23.8900, lng: 29.4700 },
  { name: 'Residential South', lat: -23.9200, lng: 29.4600 },
  { name: 'Industrial', lat: -23.9100, lng: 29.4800 },
];
```

---

## 8. Post-Test Analysis

### 8.1 Report Template

```markdown
# Load Test Report — [Date]

## Summary
- **Duration:** [X] minutes
- **Peak concurrent users:** [X]
- **Total rides created:** [X]
- **Total payments processed:** [X]

## Results
| Scenario | Pass/Fail | Notes |
|----------|-----------|-------|
| Normal Operations | [PASS/FAIL] | [notes] |
| Peak Load | [PASS/FAIL] | [notes] |
| Stress Test | [PASS/FAIL] | [notes] |

## Performance Metrics
| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| API p95 latency | [X]ms | <200ms | [PASS/FAIL] |
| Error rate | [X]% | <0.1% | [PASS/FAIL] |

## Bottlenecks Identified
1. [bottleneck 1]
2. [bottleneck 2]

## Recommendations
1. [recommendation 1]
2. [recommendation 2]

## Action Items
| # | Item | Priority | Owner |
|---|------|----------|-------|
| 1 | [item] | [P0/P1/P2] | [owner] |
```

---

## 9. Schedule

| Phase | Date | Duration | Focus |
|-------|------|----------|-------|
| Environment Setup | Day 1 | 4 hours | Test env, monitoring, test data |
| Normal Operations Test | Day 2 | 2 hours | Baseline metrics |
| Peak Load Test | Day 2 | 2 hours | Phalaborwa peak demand |
| Location Tracking Test | Day 3 | 2 hours | GPS update handling |
| Payment Processing Test | Day 3 | 2 hours | Concurrent payments |
| Stress Test | Day 4 | 2 hours | Find breaking point |
| Reconnection Storm Test | Day 4 | 2 hours | Socket.IO resilience |
| Analysis & Report | Day 5 | 4 hours | Results, recommendations |
| Remediation | Day 6-10 | 5 days | Fix identified issues |
| Re-test | Day 11-12 | 2 days | Verify fixes |

**Total time:** 12 working days
