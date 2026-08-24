# Launch Checklist — EasyRyde

**Version:** 1.0.0
**Date:** 2026-07-02
**Status:** Pre-launch final checklist

---

## 1. Overview

The definitive checklist before going live. Every item must be verified. No "it should be fine." No "we'll fix it later." If it's not checked, we don't launch.

**Rule:** If you can't prove it works, it doesn't work.

---

## 2. Pre-Launch: CRITICAL (Must Pass)

### 2.1 Security

- [ ] All demo credentials removed from source code
- [ ] No secrets in git history (trufflehog scan clean)
- [ ] Refresh token rotation implemented and tested
- [ ] Certificate pinning on mobile apps
- [ ] All security headers configured (Nginx)
- [ ] CORS restricted to known origins
- [ ] Rate limiting on all auth endpoints
- [ ] SQL injection testing passed (all endpoints)
- [ ] XSS testing passed (all inputs)
- [ ] IDOR testing passed (all resources)
- [ ] Webhook signature verification working (Stripe, PayFast, Ozow)
- [ ] npm audit / composer audit clean (no high/critical)
- [ ] No hardcoded values in payment logic
- [ ] Admin TOTP 2FA working
- [ ] Session management implemented

### 2.2 Payment Processing

- [ ] Fare calculation implemented (not hardcoded R50)
- [ ] Unit tests for fare calculation (100+ scenarios)
- [ ] Integration tests with OSRM
- [ ] Wallet debiting with row-level locking
- [ ] Payment idempotency working
- [ ] Escrow system tested
- [ ] Cash payment flow tested
- [ ] Stripe payment flow tested (card success + failure)
- [ ] PayFast payment flow tested (redirect + webhook)
- [ ] Ozow payment flow tested (redirect + webhook)
- [ ] Refund flow tested
- [ ] Financial reconciliation working
- [ ] No negative wallet balances possible
- [ ] Payment velocity checks working
- [ ] Duplicate payment prevention verified

### 2.3 Core Ride Flow

- [ ] Ride creation working
- [ ] Ride matching (Lua atomic claim) working
- [ ] Driver acceptance working
- [ ] Driver arrived working
- [ ] Trip start working
- [ ] Trip completion working
- [ ] Ride cancellation working
- [ ] Rating system working
- [ ] Receipt generation working
- [ ] Ride state transitions validated
- [ ] Concurrent ride acceptance prevented
- [ ] Ride timeout (60s expiry) working

### 2.4 Real-Time Communication

- [ ] Socket.IO authentication working
- [ ] Socket.IO reconnection working
- [ ] Location updates flowing
- [ ] Ride events flowing
- [ ] Chat messages flowing
- [ ] No event loss under normal conditions
- [ ] Token expiry handling on socket

### 2.5 Database

- [ ] All migrations running cleanly
- [ ] No migration errors
- [ ] Database backups configured
- [ ] Backup restoration tested
- [ ] Connection pooling configured (PgBouncer)
- [ ] Indexes optimized for common queries
- [ ] No N+1 queries in hot paths

---

## 3. Pre-Launch: HIGH (Should Pass)

### 3.1 Monitoring

- [ ] Sentry configured for all services
- [ ] Prometheus metrics collection working
- [ ] Grafana dashboards created
- [ ] PagerDuty alerts configured
- [ ] Uptime monitoring configured (Pingdom)
- [ ] Error rate alerts configured
- [ ] Payment failure alerts configured
- [ ] API latency alerts configured
- [ ] Database connection alerts configured
- [ ] Redis memory alerts configured

### 3.2 Performance

- [ ] API p95 latency <200ms under normal load
- [ ] API p95 latency <500ms under peak load
- [ ] Socket.IO handling 500+ connections
- [ ] Location updates processing <100ms
- [ ] Ride matching completing in <15s
- [ ] Payment processing <3s average
- [ ] Database queries <50ms average
- [ ] Redis operations <10ms average

### 3.3 Infrastructure

- [ ] Docker Compose production config tested
- [ ] SSL certificates configured and valid
- [ ] Domain names configured (api.easyryde.co.za, socket.easyryde.co.za)
- [ ] Nginx reverse proxy configured
- [ ] Firewall rules configured
- [ ] Log rotation configured
- [ ] Disk space monitoring configured
- [ ] Auto-restart on crash configured

### 3.4 Mobile Apps

- [ ] Rider app builds for iOS and Android
- [ ] Driver app builds for iOS and Android
- [ ] Admin app builds for iOS and Android
- [ ] App store metadata prepared
- [ ] App store screenshots taken
- [ ] App store descriptions written
- [ ] Privacy policy URL configured
- [ ] Terms of service URL configured

### 3.5 Testing

- [ ] Unit tests passing (backend)
- [ ] Unit tests passing (mobile)
- [ ] Integration tests passing
- [ ] E2E tests passing (critical paths)
- [ ] Load testing completed (50 concurrent rides)
- [ ] Security testing completed
- [ ] Payment testing completed (all methods)
- [ ] Socket.IO testing completed
- [ ] Location tracking testing completed
- [ ] Offline mode testing completed

---

## 4. Pre-Launch: MEDIUM (Nice to Have)

### 4.1 Documentation

- [ ] API documentation generated (Swagger/OpenAPI)
- [ ] Admin user guide written
- [ ] Driver onboarding guide written
- [ ] Restaurant partner guide written
- [ ] Incident response runbook reviewed
- [ ] SLA commitments documented
- [ ] Support escalation matrix defined

### 4.2 Operational

- [ ] On-call rotation defined
- [ ] Monitoring alerts tested (fire drill)
- [ ] Backup restoration tested
- [ ] Disaster recovery tested
- [ ] Incident communication templates ready
- [ ] Customer support process defined
- [ ] Refund policy documented

### 4.3 Business

- [ ] Pricing model validated
- [ ] Revenue projections realistic
- [ ] Driver recruitment plan in place
- [ ] Marketing launch plan ready
- [ ] Customer support team trained
- [ ] Legal review completed
- [ ] Insurance coverage verified

---

## 5. Launch Day Checklist

### 5.1 Morning (2 hours before launch)

- [ ] All services running
- [ ] All health checks passing
- [ ] Monitoring dashboards green
- [ ] No active incidents
- [ ] Backup completed
- [ ] Team notified of launch

### 5.2 Launch (Go time)

- [ ] DNS updated (if switching domains)
- [ ] SSL certificates valid
- [ ] API responding correctly
- [ ] Socket.IO accepting connections
- [ ] Database accepting connections
- [ ] Redis accepting connections
- [ ] Queue processing jobs
- [ ] Payments processing correctly
- [ ] Push notifications sending
- [ ] SMS sending correctly
- [ ] Email sending correctly

### 5.3 Post-Launch (First hour)

- [ ] Monitor error rates
- [ ] Monitor API latency
- [ ] Monitor payment success rate
- [ ] Monitor Socket.IO connections
- [ ] Check for user reports
- [ ] Check for driver reports
- [ ] Check for admin reports

### 5.4 Post-Launch (First 24 hours)

- [ ] All SLAs met
- [ ] No critical incidents
- [ ] User feedback positive
- [ ] Driver feedback positive
- [ ] Payment reconciliation clean
- [ ] No security issues reported
- [ ] Monitoring alerts reviewed

---

## 6. Post-Launch: Week 1

- [ ] Daily SLA review
- [ ] Daily revenue review
- [ ] Daily incident review
- [ ] User feedback triaged
- [ ] Driver feedback triaged
- [ ] Bug fixes prioritized
- [ ] Performance optimization
- [ ] Load testing at higher scale
- [ ] Security audit review
- [ ] Compliance checklist review

---

## 7. Rollback Plan

### 7.1 When to Rollback

| Trigger | Action |
|---------|--------|
| Error rate >5% for 10 minutes | Rollback |
| Payment failures >5% | Rollback |
| Database connection failures | Rollback |
| Security breach detected | Rollback + investigate |
| Data loss suspected | Rollback + investigate |

### 7.2 Rollback Steps

```bash
# 1. Stop new traffic
docker stop easyryde-nginx

# 2. Scale down API servers
docker-compose -f docker-compose.prod.yml up -d --scale backend=0

# 3. Restore database from backup
docker exec easyryde-database pg_restore -U postgres -d easyryde /backups/latest.dump

# 4. Restart with previous version
docker-compose -f docker-compose.prod.yml -f docker-compose.prev.yml up -d

# 5. Verify services
curl http://localhost/health
curl http://localhost:3001/health

# 6. Resume traffic
docker start easyryde-nginx
```

### 7.3 Communication During Rollback

**Internal:**
```
🔴 ROLLBACK INITIATED
- Reason: [reason]
- Status: Rolling back to [version]
- ETA: [time]
- Impact: [what's affected]
```

**External:**
```
We're experiencing technical difficulties.
Service will be restored shortly.
We apologize for the inconvenience.
```

---

## 8. Launch Criteria Summary

| Category | Required | Status |
|----------|----------|--------|
| Security (Critical) | 15/15 | ⬜ |
| Payments (Critical) | 15/15 | ⬜ |
| Core Ride Flow | 12/12 | ⬜ |
| Real-Time Communication | 7/7 | ⬜ |
| Database | 7/7 | ⬜ |
| Monitoring (High) | 10/10 | ⬜ |
| Performance (High) | 8/8 | ⬜ |
| Infrastructure (High) | 8/8 | ⬜ |
| Mobile Apps (High) | 10/10 | ⬜ |
| Testing (High) | 10/10 | ⬜ |
| Documentation (Medium) | 7/7 | ⬜ |
| Operational (Medium) | 7/7 | ⬜ |
| Business (Medium) | 7/7 | ⬜ |
| **TOTAL** | **123/123** | ⬜ |

**Launch Decision:**
- [ ] **GO** — All critical items checked, all high items checked
- [ ] **CONDITIONAL GO** — All critical items checked, some high items pending
- [ ] **NO-GO** — Any critical item unchecked

---

## 9. Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | _____________ | _____________ | ________ |
| Backend Lead | _____________ | _____________ | ________ |
| Mobile Lead | _____________ | _____________ | ________ |
| DevOps Lead | _____________ | _____________ | ________ |
| QA Lead | _____________ | _____________ | ________ |
| Security Lead | _____________ | _____________ | ________ |
| CEO | _____________ | _____________ | ________ |

---

## 10. Post-Launch Review (1 week after)

### Metrics Review

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Uptime | 99.5% | _____% | ⬜ |
| API latency p95 | <200ms | _____ms | ⬜ |
| Payment success | >99.5% | _____% | ⬜ |
| Ride completion | >95% | _____% | ⬜ |
| Error rate | <0.1% | _____% | ⬜ |
| Incidents | 0 | _____ | ⬜ |

### Lessons Learned

| What Went Well | What Went Wrong | What to Improve |
|----------------|-----------------|-----------------|
| 1. ____________ | 1. ____________ | 1. ____________ |
| 2. ____________ | 2. ____________ | 2. ____________ |
| 3. ____________ | 3. ____________ | 3. ____________ |

### Action Items

| # | Action | Owner | Deadline | Status |
|---|--------|-------|----------|--------|
| 1 | ____________ | _______ | ________ | ⬜ |
| 2 | ____________ | _______ | ________ | ⬜ |
| 3 | ____________ | _______ | ________ | ⬜ |
