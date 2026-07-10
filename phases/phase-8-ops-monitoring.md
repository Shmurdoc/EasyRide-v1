# Phase 8: Operations & Monitoring

**Version:** 1.0.0
**Created:** 2026-07-08T21:50:00Z
**Status:** Draft
**Superpowers Phase:** 8 of 8 — Operations & Monitoring (Mandatory)
**Prepared by:** opencode
**Depends on:** Phase 1 (v1.0.0), Phase 2 (v1.0.0), Phase 3 (v1.0.0), Phase 4 (v1.0.0 Approved), Phase 5 (v1.0.0), Phase 6 (v1.0.0 Approved), Phase 7 (v1.0.0)

---

## Summary

This document defines the production operations, monitoring, alerting, logging, deployment, and incident response requirements for EasyRyde. **No deployment to production is permitted without completing the ops checklist below.**

---

## Table of Contents

1. [Logging Strategy](#1-logging-strategy)
2. [Monitoring & Metrics](#2-monitoring--metrics)
3. [Alerting Rules](#3-alerting-rules)
4. [Deployment Strategy](#4-deployment-strategy)
5. [Infrastructure](#5-infrastructure)
6. [Backup & Recovery](#6-backup--recovery)
7. [Incident Response](#7-incident-response)
8. [On-Call Runbooks](#8-on-call-runbooks)
9. [Post-Launch Operations Checklist](#9-post-launch-operations-checklist)
10. [Sign-Off](#10-sign-off)

---

## 1. Logging Strategy

### 1.1 Log Levels

| Level | Use | Example | Retention |
|-------|-----|---------|-----------|
| `emergency` | System unusable | DB connection lost, Redis down | 1 year |
| `alert` | Immediate action needed | Payment gateway failed, SOS triggered | 1 year |
| `critical` | Error affecting users | Ride creation failed, socket disconnect >1min | 90 days |
| `error` | Application errors | API exception, job failed | 90 days |
| `warning` | Unexpected but non-critical | Rate limit hit, slow query | 30 days |
| `notice` | Normal but significant | Driver approved, payout completed | 30 days |
| `info` | Normal operations | Ride completed, user logged in | 7 days |
| `debug` | Development details | SQL queries, cache hits | 1 day |

### 1.2 Structured Logging Format

```json
{
  "timestamp": "2026-07-08T21:50:00Z",
  "level": "info",
  "service": "api",
  "message": "ride.completed",
  "context": {
    "ride_id": "550e8400-e29b-41d4-a716-446655440000",
    "rider_id": 123,
    "driver_id": 456,
    "fare": 8500,
    "distance_km": 12.5,
    "duration_min": 18
  },
  "trace_id": "abc123def456",
  "span_id": "789ghi012"
}
```

### 1.3 Sensitive Data Logging Rules

| Field | Log? | Masking |
|-------|------|---------|
| Email | No | `j***@e***.co.za` |
| Phone | No | `07** ***678` |
| ID Number | No | `**************` |
| Password Hash | Never | N/A |
| Payment Card | Never | N/A |
| GPS Coordinates | Yes | Exact for drivers in service area |
| Ride ID | Yes | Full UUID |
| User ID | Yes | Full integer |
| API Key | Never | N/A |
| JWT Token | No | First 8 chars only |

### 1.4 Log Aggregation

| Component | Tool | Purpose |
|-----------|------|---------|
| Application logs | Laravel Monolog → file + stdout | Structured JSON logs |
| Socket server logs | Winston → stdout | Structured JSON logs |
| Access logs | Nginx → file | Request/response logs |
| Error tracking | Sentry (Laravel) | Exception aggregation |
| Log shipping | Filebeat → Elasticsearch (optional) | Centralized log search |
| Log visualization | Kibana (optional) | Dashboard + search |

---

## 2. Monitoring & Metrics

### 2.1 Business Metrics (Real-time Dashboard)

| Metric | Source | Frequency | Alert |
|--------|--------|-----------|-------|
| Active rides | `rides WHERE status = 'in_progress'` | Real-time | — |
| Pending ride requests | `rides WHERE status = 'requested'` | Real-time | >10 for >5min |
| Online drivers | Redis `drivers:online:*` | Real-time | <3 during peak hours |
| Completed rides (hourly) | `rides WHERE completed_at > now() - 1h` | 1 min | <5/hour in peak |
| Revenue (hourly) | `payments WHERE status = 'completed'` | 1 min | — |
| Payment success rate | `completed / (completed + failed)` | 5 min | <95% |
| Average driver response time | Matching latency | 5 min | >30s |
| SOS alerts triggered | `sos_alerts` | Real-time | Any new alert |

### 2.2 System Metrics

| Metric | Source | Frequency | Alert |
|--------|--------|-----------|-------|
| API response time (p95) | Laravel Telescope / custom middleware | 1 min | >500ms |
| API response time (p99) | Laravel Telescope / custom middleware | 1 min | >1s |
| HTTP error rate (5xx) | Nginx access logs | 1 min | >1% of requests |
| Socket connections | Socket.io admin | Real-time | <50 expected |
| Socket message rate | Socket.io admin | 1 min | <10/sec |
| Redis memory usage | `INFO memory` | 5 min | >80% |
| Redis connections | `INFO clients` | 5 min | >90% of max |
| PostgreSQL connections | `pg_stat_activity` | 1 min | >80% of max |
| PostgreSQL query latency | `pg_stat_statements` | 5 min | >100ms avg |
| CPU usage | System monitoring | 1 min | >80% for 5min |
| Memory usage | System monitoring | 1 min | >85% for 5min |
| Disk usage | System monitoring | 5 min | >80% |
| Disk I/O | System monitoring | 5 min | >80% utilization |

### 2.3 Mobile Metrics (Crashlytics)

| Metric | Source | Target | Alert |
|--------|--------|--------|-------|
| Crash-free rate | Firebase Crashlytics | >99.5% | <99% |
| ANR rate | Firebase Crashlytics | <0.5% | >1% |
| App start time | Firebase Performance | <2s cold, <1s warm | >3s |
| Screen render time | Firebase Performance | <300ms | >500ms |
| Network request latency | Firebase Performance | p95 <500ms | p95 >1s |
| Memory usage | Firebase Performance | <150MB | >200MB |
| Battery impact | Firebase Performance | <5%/hr active | >10%/hr |

### 2.4 Uptime Monitoring

| Service | Check | Frequency | Alert |
|---------|-------|-----------|-------|
| API (api.easyryde.co.za) | HTTP GET /health | 1 min | 2 consecutive failures |
| Socket (socket.easyryde.co.za) | WebSocket connect | 1 min | 2 consecutive failures |
| Admin (app.easyryde.co.za) | HTTP GET /health | 5 min | 2 consecutive failures |
| PostgreSQL | TCP connect | 1 min | 1 failure |
| Redis | TCP connect | 1 min | 1 failure |
| PayFast | HTTP GET sandbox | 5 min | 2 consecutive failures |
| Ozow | HTTP GET sandbox | 5 min | 2 consecutive failures |

---

## 3. Alerting Rules

### 3.1 Alert Severity Levels

| Level | Notification | Response Time | Example |
|-------|-------------|---------------|---------|
| P0 — Critical | PagerDuty + SMS + Slack + Phone call | 15 min | API down, DB down, data breach, SOS system failure |
| P1 — High | PagerDuty + Slack | 1 hour | Payment gateway degraded, >5% error rate, driver matching slow |
| P2 — Medium | Slack + Email | 4 hours | High memory usage, slow queries, notification delivery failures |
| P3 — Low | Email | 24 hours | Disk space warning, non-critical job failures, coverage drop |
| P4 — Info | Dashboard only | Next business day | Performance trend, usage patterns |

### 3.2 Critical Alerts

| Alert | Condition | Threshold | Action |
|-------|-----------|-----------|--------|
| API Down | HTTP status != 200 | 2 consecutive | Restart API, check logs |
| DB Connection Exhausted | pg_stat_activity count | >80% pool | Kill idle connections, scale |
| Redis Memory Critical | used_memory_rss | >80% max | Evict keys, scale |
| Payment Gateway Timeout | Stripe/PayFast response | >5s or 503 | Switch to backup gateway |
| SOS System Failure | SOS endpoint errors | Any 500 | Immediate investigation |
| Data Breach Detected | Security scan alerts | Any P0 | Immediate lockdown |
| Mass Ride Cancellation | Cancellations/hour | >20 in 10min | Investigate cause |
| Driver Mass Disconnect | Socket disconnects | >10 in 1min | Check server health |
| Database Replication Lag | Replica lag | >30s | Investigate replication |
| Certificate Expiry | TLS cert remaining | <7 days | Renew immediately |

### 3.3 Escalation Policy

| Level | Primary | Backup | Escalation |
|-------|---------|--------|------------|
| P0 | On-call engineer | Tech lead | CTO (after 30min) |
| P1 | On-call engineer | Tech lead | CTO (after 2hr) |
| P2 | Dev team | — | Tech lead (after 24hr) |
| P3 | Dev team | — | Next standup |

---

## 4. Deployment Strategy

### 4.1 Environments

| Environment | Purpose | URL | Deploy Trigger |
|-------------|---------|-----|----------------|
| Local | Development | localhost | Manual |
| Staging | Pre-production testing | staging.easyryde.co.za | Push to `staging` branch |
| Production | Live platform | api.easyryde.co.za | Push to `main` + approval |

### 4.2 Deployment Pipeline

```
Developer pushes to feature branch
  → CI runs: lint, typecheck, unit tests, feature tests
  → PR created → Code review
  → Merge to develop
  → CI runs: full test suite
  → Deploy to staging
  → QA validation on staging
  → Merge to main
  → CI runs: full test suite + security scan
  → Deploy to production (manual approval)
  → Post-deploy monitoring (5min)
  → Canary traffic (10% → 50% → 100%)
```

### 4.3 Deployment Windows

| Window | Time (SAST) | Risk Level | Allowed |
|--------|-------------|------------|---------|
| Weekday (business) | 08:00-17:00 | High | Hotfixes only |
| Weekday (off-hours) | 17:00-22:00 | Medium | Feature deploys |
| Weekday (low-traffic) | 22:00-06:00 | Low | **Preferred deploy window** |
| Weekend | All day | Low | Emergency only |
| Friday freeze | 17:00 Friday - 08:00 Monday | None | No deploys |

### 4.4 Rollback Procedure

```bash
# 1. Identify the issue
tail -f /var/log/easyryde/api-error.log

# 2. Rollback to previous version
cd /var/www/easyryde
git log --oneline -5  # Find last good commit
git checkout <good-commit-hash>

# 3. Rebuild and restart
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate:rollback --force  # Only if DB changes need rollback
sudo systemctl restart easyryde-api

# 4. Verify
curl -s https://api.easyryde.co.za/health | jq .
```

### 4.5 Zero-Downtime Deployment

| Step | Action | Verification |
|------|--------|-------------|
| 1 | Pull new code | `git status` |
| 2 | Install dependencies | `composer install --no-dev` |
| 3 | Run migrations | `php artisan migrate --force` |
| 4 | Cache config/routes/views | `php artisan optimize` |
| 5 | Restart workers | `sudo systemctl restart easyryde-workers` |
| 6 | Graceful reload API | `sudo systemctl reload easyryde-api` |
| 7 | Health check | `curl /health` returns 200 |
| 8 | Monitor errors | Check Sentry for 5min |
| 9 | Verify features | Smoke test critical paths |

---

## 5. Infrastructure

### 5.1 Server Requirements

| Service | Spec | Purpose |
|---------|------|---------|
| **API Server** | 4 vCPU, 8GB RAM, 50GB SSD | Laravel API |
| **Socket Server** | 2 vCPU, 4GB RAM, 20GB SSD | Node.js Socket.IO |
| **PostgreSQL** | 4 vCPU, 16GB RAM, 200GB SSD | Primary database |
| **Redis** | 2 vCPU, 4GB RAM, 20GB SSD | Cache + queue + sessions |
| **Nginx** | 2 vCPU, 2GB RAM, 10GB SSD | Reverse proxy + static |
| **Admin Dashboard** | Static hosting | React + TailwindCSS |

### 5.2 Network Architecture

```
Internet
  │
  ├── Cloudflare (CDN + DDoS + TLS)
  │   ├── *.easyryde.co.za
  │   │   ├── api → Nginx :443 → Laravel :8000
  │   │   ├── socket → Nginx :443 → Socket.IO :3001
  │   │   └── admin → Cloudflare Pages (static)
  │   │
  ├── VPC
  │   ├── Private Subnet
  │   │   ├── PostgreSQL :5432
  │   │   └── Redis :6379
  │   └── Public Subnet
  │       ├── Nginx (reverse proxy)
  │       ├── Laravel API
  │       └── Socket.IO server
  │
  └── External Services
      ├── Firebase (FCM + Crashlytics + Auth)
      ├── PayFast (payment processing)
      ├── Ozow (instant EFT)
      ├── Nominatim (geocoding)
      ├── OSRM (routing)
      └── Sentry (error tracking)
```

### 5.3 SSL/TLS Configuration

| Service | Provider | Renewal | Auto-Renew |
|---------|----------|---------|------------|
| *.easyryde.co.za | Cloudflare (Full Strict) | 90 days | Yes |
| PostgreSQL | Self-signed (internal) | N/A | N/A |
| Redis | N/A (internal only) | N/A | N/A |
| Socket.IO | Via Cloudflare | 90 days | Yes |

### 5.4 Firewall Rules

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 443 | TCP | 0.0.0.0/0 | HTTPS (Nginx) |
| 22 | TCP | Admin IPs only | SSH |
| 5432 | TCP | VPC internal only | PostgreSQL |
| 6379 | TCP | VPC internal only | Redis |
| 3001 | TCP | VPC internal only | Socket.IO (proxied by Nginx) |

---

## 6. Backup & Recovery

### 6.1 Backup Schedule

| Data | Method | Frequency | Retention | Storage |
|------|--------|-----------|-----------|---------|
| PostgreSQL | pg_dump + WAL archiving | Daily + continuous | 30 days | S3 + local |
| Redis | RDB snapshot | Every 6 hours | 7 days | S3 |
| Uploaded files (KYC) | S3 versioning | Continuous | 90 days | S3 |
| Application code | Git | On push | Indefinite | GitHub |
| Environment config | Encrypted in git | On change | Indefinite | GitHub |
| Logs | Filebeat → Elasticsearch | Real-time | 90 days | Elasticsearch |

### 6.2 Recovery Time Objectives

| Scenario | RPO | RTO | Method |
|----------|-----|-----|--------|
| Database corruption | 1 hour | 4 hours | pg_restore from latest backup + WAL replay |
| Server failure | 0 (replication) | 30 min | Failover to replica + DNS update |
| Full data loss | 24 hours | 8 hours | Restore from S3 backup + WAL replay |
| Code deployment failure | 0 | 5 min | Git rollback + restart |
| Redis data loss | 6 hours | 15 min | Restore from RDB snapshot |

### 6.3 Disaster Recovery Procedure

```bash
# 1. Assess damage
# Identify what's affected: DB, app, socket, redis

# 2. If DB is corrupted
# Restore from latest backup
pg_restore -U easyryde -d easyryde_production /backups/latest.dump

# 3. Apply WAL archiving for point-in-time recovery
# (if WAL archiving was configured)
pg_wal_replay --target-time "2026-07-08 21:00:00+02:00"

# 4. If server is down
# Provision new server from infrastructure-as-code
# Pull latest code from Git
# Deploy following standard deployment procedure

# 5. Verify recovery
curl -s https://api.easyryde.co.za/health | jq .
# Check all services are responding

# 6. Notify users
# Push notification: "Service has been restored. We apologize for the inconvenience."
```

---

## 7. Incident Response

### 7.1 Incident Severity Classification

| Severity | Definition | Response Time | Examples |
|----------|-----------|---------------|----------|
| SEV-1 | Complete platform outage | 15 min | API down, DB down, payment system failure |
| SEV-2 | Major feature degraded | 1 hour | Matching algorithm slow, push notifications failing |
| SEV-3 | Minor feature affected | 4 hours | Chat messages delayed, report export broken |
| SEV-4 | Cosmetic or low-impact | 24 hours | UI glitch, non-critical log errors |

### 7.2 Incident Response Flow

```
1. DETECT
   ├── Monitoring alert fires
   ├── User report (support ticket, social media)
   └── Automated health check failure

2. TRIAGE (within 15 min)
   ├── Assign severity level
   ├── Identify affected services
   ├── Check if data is at risk
   └── Page on-call engineer

3. CONTAIN (within 30 min)
   ├── Isolate affected service
   ├── Activate circuit breakers
   ├── Switch to backup systems
   └── Preserve evidence (logs, traces)

4. COMMUNICATE
   ├── Status page update (if available)
   ├── Internal Slack #incident channel
   ├── User notification (if user-facing)
   └── Stakeholder updates (hourly for SEV-1/2)

5. RESOLVE
   ├── Fix root cause
   ├── Deploy hotfix
   ├── Verify fix in production
   └── Confirm services restored

6. REVIEW (within 48 hours)
   ├── Post-incident review meeting
   ├── Root cause analysis (5 Whys)
   ├── Action items assigned
   └── Runbook updated
```

### 7.3 Communication Templates

**Internal (Slack #incidents):**
```
🔴 SEV-1: [Service] is [issue]
Impact: [User-facing impact]
Status: Investigating / Identified / Mitigating / Resolved
On-call: @[name]
Next update: [time]
```

**External (Push notification):**
```
Service Update: We're experiencing [brief description]. 
Our team is investigating. We'll update you shortly.
```

**Post-incident:**
```
Service has been fully restored. 
Duration: [X] minutes. 
Root cause: [brief explanation].
We apologize for the inconvenience.
```

### 7.4 POPIA Breach Response (from Phase 5 §12)

| Step | Action | Timeline |
|------|--------|----------|
| 1 | Contain the breach | Immediately |
| 2 | Assess scope and impact | Within 24 hours |
| 3 | Notify Information Regulator | Within 72 hours |
| 4 | Notify affected data subjects | Without undue delay |
| 5 | Document and remediate | Ongoing |

---

## 8. On-Call Runbooks

### 8.1 API Server Down

```bash
# 1. Check if process is running
sudo systemctl status easyryde-api

# 2. Check logs
tail -50 /var/log/easyryde/api-error.log

# 3. If not running, restart
sudo systemctl restart easyryde-api

# 4. If crash loop, check OOM
dmesg | grep -i "out of memory"
free -h

# 5. If OOM, scale up or fix memory leak
# Check for N+1 queries, large payloads, etc.

# 6. Verify
curl -s https://api.easyryde.co.za/health | jq .
```

### 8.2 Database Connection Exhaustion

```bash
# 1. Check active connections
psql -U easyryde -d easyryde_production -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# 2. Check for long-running queries
psql -U easyryde -d easyryde_production -c \
  "SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
   FROM pg_stat_activity
   WHERE state != 'idle' AND now() - pg_stat_activity.query_start > interval '5 minutes';"

# 3. Kill long-running queries if needed
psql -U easyryde -d easyryde_production -c "SELECT pg_terminate_backend(<pid>);"

# 4. Check pool configuration
cat /var/www/easyryde/backend/config/database.php | grep "pool"

# 5. If consistently exhausted, increase pool size or add replica
```

### 8.3 Redis Memory Full

```bash
# 1. Check memory usage
redis-cli INFO memory

# 2. Check key count by pattern
redis-cli --bigkeys

# 3. Evict expired keys
redis-cli --scan --pattern "expired:*" | xargs -L 100 redis-cli DEL

# 4. If still full, flush non-critical keys
# DO NOT flush sessions or ride data
redis-cli --scan --pattern "cache:*" | xargs -L 100 redis-cli DEL

# 5. If persistent issue, scale Redis memory
```

### 8.4 Payment Gateway Down

```bash
# 1. Check gateway status
curl -s https://sandbox.payfast.co.za/eng/process | head -1
curl -s https://pay.ozow.com/api/status | head -1

# 2. Check if wallet payments still work
# Wallet payments don't depend on external gateway
curl -X POST https://api.easyryde.co.za/api/v1/payments/wallet/pay \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ride_id":"test"}'

# 3. Notify users
# Push: "Card payments temporarily unavailable. Cash and wallet still work."

# 4. Monitor gateway recovery
# Check every 5 minutes until restored
```

### 8.5 High Error Rate

```bash
# 1. Check Sentry for error trends
# Look for new errors or spike in existing errors

# 2. Check application logs
tail -100 /var/log/easyryde/api-error.log | grep -c "ERROR"

# 3. Check for deployment
git log --oneline -5  # Was there a recent deploy?

# 4. If deploy-related, rollback
git checkout <previous-commit>
composer install --no-dev
php artisan config:cache
sudo systemctl restart easyryde-api

# 5. If not deploy-related, check dependencies
# DB, Redis, Firebase, payment gateways
```

---

## 9. Post-Launch Operations Checklist

### 9.1 Pre-Launch Ops Setup

| Task | Status |
|------|--------|
| Cloudflare configured (DDoS, WAF, CDN) | ☐ |
| SSL certificates active and auto-renewing | ☐ |
| Uptime monitoring configured | ☐ |
| Error tracking (Sentry) configured | ☐ |
| Log aggregation configured | ☐ |
| Alerting rules configured | ☐ |
| On-call rotation set up | ☐ |
| Backup procedures tested | ☐ |
| Disaster recovery tested | ☐ |
| Load balancer health checks configured | ☐ |
| Database replication configured | ☐ |
| Redis persistence configured (AOF) | ☐ |
| Nginx rate limiting configured | ☐ |
| Firewall rules applied | ☐ |
| SSH key-only authentication | ☐ |
| Unattended security updates enabled | ☐ |

### 9.2 First 24 Hours

| Task | Time | Status |
|------|------|--------|
| Monitor API error rate | Every 30 min | ☐ |
| Monitor payment success rate | Every 30 min | ☐ |
| Check driver online count | Every 30 min | ☐ |
| Review user feedback channels | Hourly | ☐ |
| Verify ride completion flow | Spot check | ☐ |
| Verify payment flow end-to-end | Spot check | ☐ |
| Check mobile app crash rates | Hourly | ☐ |
| Review security alerts | Every 2 hours | ☐ |

### 9.3 First Week

| Task | Frequency | Status |
|------|-----------|--------|
| Performance review meeting | Daily | ☐ |
| User feedback review | Daily | ☐ |
| Security scan | Daily | ☐ |
| Database performance review | Daily | ☐ |
| Mobile app stability review | Daily | ☐ |
| Payment reconciliation | Daily | ☐ |
| Driver earnings verification | Daily | ☐ |

### 9.4 Ongoing Operations

| Task | Frequency | Owner |
|------|-----------|-------|
| Security patch updates | Weekly | DevOps |
| Performance optimization review | Bi-weekly | Tech lead |
| Uptime report review | Monthly | CTO |
| Disaster recovery test | Monthly | DevOps |
| Penetration testing | Quarterly | External |
| POPIA compliance audit | Quarterly | Legal |
| Load testing | Quarterly | QA |
| Dependency security audit | Weekly (automated) | CI/CD |

---

## 10. Sign-Off

| Role | Name | Approved | Date | Notes |
|------|------|----------|------|-------|
| DevOps Lead | _____________ | ☐ | ________ | |
| Tech Lead | _____________ | ☐ | ________ | |
| Security Engineer | _____________ | ☐ | ________ | |
| On-Call Engineer | _____________ | ☐ | ________ | |

**Approval Criteria:**
- [ ] All monitoring configured and tested
- [ ] All alerting rules configured and tested
- [ ] Deployment pipeline tested end-to-end
- [ ] Backup and recovery tested
- [ ] Incident response runbooks complete
- [ ] On-call rotation established
- [ ] All infrastructure provisioned and documented
- [ ] POPIA breach response plan ready

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-08T21:50:00Z | Initial creation — logging, monitoring, alerting, deployment, infrastructure, backup, incident response, on-call runbooks, ops checklist |
