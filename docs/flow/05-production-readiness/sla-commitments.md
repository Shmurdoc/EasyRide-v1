# SLA Commitments — EasyRyde

**Version:** 1.0.0
**Date:** 2026-07-02
**Status:** Pre-launch SLA definitions

---

## 1. Overview

Service Level Agreements for EasyRyde platform. These are the commitments we make to riders, drivers, restaurants, and internal stakeholders. Every SLA has a measurement method, monitoring, and consequence for breach.

**Brutal truth:** If you can't measure it, you can't guarantee it. These SLAs are only as good as the monitoring behind them.

---

## 2. Platform SLA (Internal)

### 2.1 Availability

| Metric | Commitment | Measurement | Consequence |
|--------|------------|-------------|-------------|
| API uptime | 99.5% monthly | Pingdom/health check | Credit 10% on next invoice |
| Socket.IO uptime | 99.0% monthly | Custom health endpoint | Credit 5% on next invoice |
| Database uptime | 99.9% monthly | PostgreSQL health check | Credit 15% on next invoice |
| Redis uptime | 99.5% monthly | Redis PING | Credit 10% on next invoice |

**Calculation:**
```
Uptime % = (Total minutes - Downtime minutes) / Total minutes × 100

99.5% uptime = 21.6 minutes downtime per month maximum
99.0% uptime = 43.2 minutes downtime per month maximum
99.9% uptime = 4.3 minutes downtime per month maximum
```

**Exclusions:**
- Scheduled maintenance windows (announced 48h in advance)
- Force majeure events
- Third-party provider outages (PayFast, Stripe, Google Maps)
- Customer-caused incidents

### 2.2 Performance

| Metric | Target | P95 | P99 | Measurement |
|--------|--------|-----|-----|-------------|
| API response time | <200ms | <500ms | <1000ms | Prometheus |
| Ride creation | <1s | <2s | <3s | Custom metric |
| Payment processing | <3s | <5s | <10s | Custom metric |
| Ride matching | <10s | <15s | <30s | Custom metric |
| Socket.IO connect | <500ms | <1s | <2s | Custom metric |
| Location update | <100ms | <200ms | <500ms | Custom metric |

### 2.3 Scalability

| Metric | Minimum | Target | Maximum |
|--------|---------|--------|---------|
| Concurrent users | 100 | 500 | 1000 |
| Concurrent rides | 20 | 50 | 100 |
| API requests/second | 50 | 200 | 500 |
| Socket.IO connections | 100 | 500 | 1000 |
| Location updates/second | 10 | 50 | 100 |
| Payment requests/minute | 10 | 50 | 100 |

---

## 3. Rider SLA (External)

### 3.1 Ride Availability

| Metric | Commitment | Measurement |
|--------|------------|-------------|
| Driver search success | >90% during operating hours | Ride completion rate |
| Driver arrival time | <15 minutes average | Ride timestamps |
| Ride completion rate | >95% of started rides | Ride status tracking |

### 3.2 Booking Experience

| Metric | Commitment | Measurement |
|--------|------------|-------------|
| Booking time | <30 seconds from tap to confirmation | App analytics |
| Fare estimate accuracy | Within 10% of final fare | Fare comparison |
| Payment success rate | >99% | Payment logs |
| Receipt delivery | <1 minute after ride completion | Notification logs |

### 3.3 Safety

| Metric | Commitment | Measurement |
|--------|------------|-------------|
| SOS alert response | <5 minutes | Admin dashboard |
| Driver verification | 100% KYC before going online | Compliance logs |
| Trip sharing | Real-time tracking available | Feature usage |

### 3.4 Support

| Metric | Commitment | Measurement |
|--------|------------|-------------|
| Response time (critical) | <1 hour | Support ticket system |
| Response time (non-critical) | <24 hours | Support ticket system |
| Resolution time (critical) | <4 hours | Support ticket system |
| Resolution time (non-critical) | <72 hours | Support ticket system |

---

## 4. Driver SLA (External)

### 4.1 Earnings

| Metric | Commitment | Measurement |
|--------|------------|-------------|
| Payment processing | Within 24 hours of ride completion | Payment logs |
| Earnings accuracy | 100% of agreed fare minus platform fee | Financial reconciliation |
| Wallet withdrawal | <24 hours processing | Withdrawal logs |

### 4.2 Platform Support

| Metric | Commitment | Measurement |
|--------|------------|-------------|
| App availability | >99% during driver's online hours | App analytics |
| Ride request delivery | <5 seconds from broadcast | Socket.IO logs |
| GPS accuracy | Within 50 meters | Location accuracy logs |
| Earnings transparency | Real-time balance updates | App feature |

### 4.3 Communication

| Metric | Commitment | Measurement |
|--------|------------|-------------|
| Notification delivery | <30 seconds | Notification logs |
| Chat message delivery | <2 seconds | Socket.IO logs |
| Support response | <4 hours | Support ticket system |

---

## 5. Restaurant SLA (External)

### 5.1 Order Management

| Metric | Commitment | Measurement |
|--------|------------|-------------|
| Order notification | <10 seconds from placement | Webhook logs |
| Order accuracy | >98% correct items | Dispute rate |
| Preparation time estimate | Within 10 minutes of actual | Time tracking |

### 5.2 Payment

| Metric | Commitment | Measurement |
|--------|------------|-------------|
| Payment processing | Within 48 hours | Payment logs |
| Commission accuracy | 15% of order total | Financial reconciliation |
| Refund processing | <24 hours | Refund logs |

---

## 6. Financial SLA

### 6.1 Payment Processing

| Metric | Commitment | Measurement |
|--------|------------|-------------|
| Payment success rate | >99.5% | Payment logs |
| Duplicate payment rate | 0% | Financial reconciliation |
| Wallet balance accuracy | 100% | Daily reconciliation |
| Escrow processing | <1 second | Payment logs |
| Refund processing | <24 hours | Refund logs |

### 6.2 Financial Reporting

| Metric | Commitment | Measurement |
|--------|------------|-------------|
| Daily revenue report | By 6am next day | Automated report |
| Driver payout report | Weekly (Monday) | Automated report |
| Financial reconciliation | Daily | Automated job |
| Tax reporting | Monthly | Manual report |

---

## 7. Compliance SLA

### 7.1 Data Protection (POPIA)

| Metric | Commitment | Measurement |
|--------|------------|-------------|
| Data export request | <72 hours | Request logs |
| Account deletion | <30 days | Deletion logs |
| Data breach notification | <72 hours | Incident logs |
| Privacy policy update | <30 days of change | Document versioning |

### 7.2 Financial Compliance (FICA)

| Metric | Commitment | Measurement |
|--------|------------|-------------|
| KYC verification | <48 hours of submission | Compliance logs |
| Suspicious activity report | <24 hours of detection | Compliance logs |
| Transaction monitoring | Real-time | Automated system |
| Record retention | 5 years minimum | Database archival |

---

## 8. Monitoring & Measurement

### 8.1 Monitoring Stack

| Tool | Purpose | Metric |
|------|---------|--------|
| Prometheus | Metrics collection | All quantitative metrics |
| Grafana | Visualization | Dashboards |
| Sentry | Error tracking | Error rates, performance |
| PagerDuty | Alerting | Incident response |
| Pingdom | Uptime monitoring | Availability |
| Custom dashboards | Business metrics | Revenue, rides, users |

### 8.2 SLA Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  EasyRyde SLA Dashboard                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Platform Availability: 99.7%  ████████████████████░  ✓     │
│  API Response Time: 156ms     ████████████████████░  ✓     │
│  Ride Completion: 96.2%       ███████████████████░░  ✓     │
│  Payment Success: 99.8%       ████████████████████░  ✓     │
│  Socket.IO Uptime: 99.1%      ███████████████████░░  ✓     │
│                                                              │
│  Current Status: ✅ ALL SLAs MET                             │
│                                                              │
│  Incidents This Month: 2                                     │
│  Average Response Time: 12 minutes                           │
│  SLA Breaches: 0                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Alerting Rules

| Metric | Warning | Critical | Alert Channel |
|--------|---------|----------|---------------|
| API uptime | <99.5% | <99.0% | PagerDuty |
| API latency p95 | >500ms | >1000ms | Slack |
| Error rate | >0.5% | >2% | PagerDuty |
| Payment success | <99% | <98% | PagerDuty + SMS |
| Ride completion | <95% | <90% | Slack |
| Database connections | >80 | >95 | PagerDuty |
| Redis memory | >80% | >90% | PagerDuty |
| Queue depth | >50 | >200 | Slack |

---

## 9. SLA Breach Response

### 9.1 Breach Categories

| Category | Severity | Response |
|----------|----------|----------|
| Single metric miss | LOW | Investigate, no penalty |
| Multiple metric miss | MEDIUM | Root cause analysis, report |
| Availability <99% | HIGH | Credit affected customers |
| Data breach | CRITICAL | Legal, regulatory notification |
| Financial discrepancy | CRITICAL | Immediate investigation |

### 9.2 Credit Policy

| SLA Breach | Credit |
|------------|--------|
| API downtime >30 min | 10% monthly fee |
| API downtime >2 hours | 25% monthly fee |
| Payment failure >2% | 15% transaction fee |
| Data breach | Case-by-case (up to 100%) |
| Multiple breaches in month | 2x credit |

### 9.3 Communication

**Internal:**
- SLA breach detected → Alert on-call engineer
- SLA breach confirmed → Notify management
- SLA breach resolved → Write postmortem

**External (if applicable):**
- Minor breach: No notification (internal tracking)
- Major breach: Email notification within 24 hours
- Critical breach: Public statement within 48 hours

---

## 10. SLA Review Process

### Monthly Review

1. Collect all SLA metrics
2. Calculate compliance percentage
3. Identify any breaches
4. Document root causes
5. Create improvement action items
6. Update SLAs if needed

### Quarterly Review

1. Review SLA targets vs actuals
2. Adjust targets based on capacity
3. Add new SLAs for new features
4. Remove obsolete SLAs
5. Update credit policy if needed

### Annual Review

1. Full SLA audit
2. Benchmark against industry
3. Update all SLAs
4. Negotiate with stakeholders
5. Plan capacity for next year

---

## 11. Capacity Planning

### Growth Projections

| Metric | Month 1 | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|----------|
| Daily rides | 50 | 150 | 300 | 500 |
| Active users | 200 | 500 | 1000 | 2000 |
| Active drivers | 20 | 50 | 100 | 150 |
| Revenue | R50,000 | R150,000 | R300,000 | R500,000 |

### Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| API p95 >500ms | 3 times in 1 hour | Add API server |
| DB connections >80 | Sustained 10 min | Add PgBouncer |
| Redis memory >80% | Sustained 5 min | Add Redis node |
| Queue depth >100 | Sustained 10 min | Add worker |
| Disk >80% | Any |扩容 storage |

---

## 12. SLA Definitions Glossary

| Term | Definition |
|------|------------|
| **Uptime** | Percentage of time service is available and responding |
| **Response Time** | Time from request received to response sent |
| **Latency** | Time for a request to travel from client to server |
| **Throughput** | Number of requests processed per unit time |
| **Error Rate** | Percentage of requests resulting in errors |
| **P95/P99** | 95th/99th percentile of response times |
| **MTTR** | Mean Time To Recovery |
| **MTBF** | Mean Time Between Failures |
| **RPO** | Recovery Point Objective (max data loss) |
| **RTO** | Recovery Time Objective (max downtime) |

---

## 13. SLA Commitment Summary

| Category | Key SLA | Commitment | Status |
|----------|---------|------------|--------|
| **Availability** | Platform uptime | 99.5% monthly | MONITORING |
| **Performance** | API response | <200ms p95 | MONITORING |
| **Payments** | Success rate | >99.5% | MONITORING |
| **Rides** | Completion rate | >95% | MONITORING |
| **Safety** | SOS response | <5 minutes | MONITORING |
| **Support** | Critical response | <1 hour | MONITORING |
| **Compliance** | Data export | <72 hours | MONITORING |
| **Financial** | Reconciliation | Daily | MONITORING |

**Current Status:** SLAs defined. Monitoring in progress. First review after 30 days of operation.
