# Mergenix Execution Plan

## Executive Summary

**Product:** Genetic offspring analysis tool for couples planning families
**Timeline:** 6-month full launch
**Team:** 2-3 people
**Model:** Freemium with 3 tiers

---

## Confirmed Business Model

| Tier | Price | Annual | Diseases | Traits | Offspring | Extras |
|------|-------|--------|----------|--------|-----------|--------|
| **Free** | $0 | - | 25 | 10 | Yes (limited) | - |
| **Premium** | $19.99/mo | $159.99/yr | 500 | 79 | Full | PDF reports |
| **Pro** | $49.99/mo | $399.99/yr | 1,211 | 79 | Full | PDF + GC (1/mo) |

**Key Decisions:**
- Offspring analysis available FREE (viral hook)
- 33% annual discount to reduce churn
- GC access in Pro tier only (high perceived value)
- Stripe + PayPal for payments
- B2C first, B2B clinics in Year 2

---

## Phase 1: Foundation (Weeks 1-4)

### Goal: Core infrastructure ready for development

#### Week 1-2: Infrastructure Setup

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Choose hosting platform (Vercel/Railway/Render) | Dev | Critical | [ ] |
| Set up production database (PostgreSQL) | Dev | Critical | [ ] |
| Configure CI/CD pipeline (GitHub Actions) | Dev | High | [ ] |
| Set up staging environment | Dev | High | [ ] |
| Domain registration + SSL | Dev | High | [ ] |
| Set up error monitoring (Sentry) | Dev | Medium | [ ] |
| Set up analytics (Plausible/PostHog) | Dev | Medium | [ ] |

#### Week 3-4: Authentication & Payments

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Implement user authentication (Auth0/Clerk) | Dev | Critical | [ ] |
| Set up Stripe account + products | Dev | Critical | [ ] |
| Set up PayPal business account | Dev | Critical | [ ] |
| Create subscription tiers in Stripe | Dev | Critical | [ ] |
| Implement payment webhook handlers | Dev | Critical | [ ] |
| Build subscription management UI | Dev | High | [ ] |
| Implement free tier limits logic | Dev | High | [ ] |
| Test payment flows end-to-end | QA | High | [ ] |

### Phase 1 Deliverables
- [ ] App deployed to staging environment
- [ ] Users can register/login
- [ ] Payment processing working (test mode)
- [ ] Tier-based feature flags implemented

---

## Phase 2: Core Product (Weeks 5-10)

### Goal: Full analysis engine with tier restrictions

#### Week 5-6: Disease Tier System

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Curate "Top 25" free diseases (highest impact) | Product | Critical | [ ] |
| Curate "Top 500" premium diseases | Product | Critical | [ ] |
| Implement disease filtering by tier | Dev | Critical | [ ] |
| Update carrier analysis for tier limits | Dev | Critical | [ ] |
| Show "Upgrade to unlock X more" prompts | Dev | High | [ ] |
| Create disease tier documentation | Product | Medium | [ ] |

**Top 25 Free Diseases (Recommendation):**
1. Cystic Fibrosis
2. Sickle Cell Disease
3. Tay-Sachs Disease
4. Spinal Muscular Atrophy (SMA)
5. Phenylketonuria (PKU)
6. Beta Thalassemia
7. Fragile X Syndrome
8. Duchenne Muscular Dystrophy
9. Canavan Disease
10. Gaucher Disease
11. Familial Dysautonomia
12. Fanconi Anemia
13. Bloom Syndrome
14. MCAD Deficiency
15. Galactosemia
16. Maple Syrup Urine Disease
17. Glycogen Storage Disease Type 1a
18. Congenital Adrenal Hyperplasia
19. G6PD Deficiency
20. Alpha-1 Antitrypsin Deficiency
21. Hereditary Hemochromatosis
22. Niemann-Pick Disease
23. Biotinidase Deficiency
24. Hemophilia A
25. Huntington's Disease

#### Week 7-8: Trait Tier System

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Curate "Top 10" free traits | Product | Critical | [ ] |
| Implement trait filtering by tier | Dev | Critical | [ ] |
| Update trait prediction for tier limits | Dev | High | [ ] |
| Show locked traits with preview | Dev | High | [ ] |

**Top 10 Free Traits (Recommendation):**
1. Eye Color
2. Hair Color
3. Lactose Intolerance
4. Bitter Taste Perception
5. Earwax Type
6. Freckling
7. Cleft Chin
8. Widow's Peak
9. Caffeine Metabolism
10. Asparagus Smell Detection

#### Week 9-10: PDF Reports

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Design PDF report template | Design | High | [ ] |
| Implement PDF generation (react-pdf) | Dev | High | [ ] |
| Create summary report (2 pages) | Dev | High | [ ] |
| Create detailed report (10+ pages) | Dev | Medium | [ ] |
| Add clinic-ready format option | Dev | Medium | [ ] |
| Implement email delivery of reports | Dev | Medium | [ ] |

### Phase 2 Deliverables
- [ ] Tier-based disease filtering working
- [ ] Tier-based trait filtering working
- [ ] Upgrade prompts showing at paywall
- [ ] PDF reports generating correctly
- [ ] Email delivery working

---

## Phase 3: User Experience (Weeks 11-16)

### Goal: Polished UX with accessibility compliance

#### Week 11-12: UX Improvements (Based on Research)

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Implement red-BLUE-gray color scheme (colorblind safe) | Dev | Critical | [ ] |
| Add icons to all risk indicators | Dev | Critical | [ ] |
| Implement progressive disclosure for results | Dev | High | [ ] |
| Add 100-dot pictographic risk visualization | Dev | High | [ ] |
| Ensure 8th-grade reading level copy | Product | High | [ ] |
| Add contextual help tooltips | Dev | Medium | [ ] |

#### Week 13-14: Mobile Optimization

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Responsive design audit | Design | High | [ ] |
| Mobile-first results display | Dev | High | [ ] |
| Touch-friendly file upload | Dev | High | [ ] |
| Mobile navigation improvements | Dev | Medium | [ ] |
| Test on iOS + Android devices | QA | High | [ ] |

#### Week 15-16: Onboarding & Education

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Create welcome/onboarding flow | Dev | High | [ ] |
| Build interactive Punnett square explainer | Dev | Medium | [ ] |
| Add condition-specific deep dive pages | Dev | Medium | [ ] |
| Create "How it works" video | Product | Medium | [ ] |
| Add FAQ section | Product | Medium | [ ] |
| Implement glossary with hover definitions | Dev | Low | [ ] |

### Phase 3 Deliverables
- [ ] WCAG 2.1 AA compliant
- [ ] Mobile experience polished
- [ ] Onboarding flow complete
- [ ] Educational content in place

---

## Phase 4: Genetic Counselor Integration (Weeks 17-20)

### Goal: GC marketplace for Pro tier

#### Week 17-18: GC Platform Backend

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Design GC matching system | Product | High | [ ] |
| Build GC profile management | Dev | High | [ ] |
| Implement scheduling system (Calendly API or custom) | Dev | High | [ ] |
| Set up video call integration (Daily.co/Twilio) | Dev | High | [ ] |
| Build session notes system | Dev | Medium | [ ] |

#### Week 19-20: GC Recruitment & Launch

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Create GC partner pitch deck | Product | High | [ ] |
| Recruit initial 5-10 GCs | Product | Critical | [ ] |
| Set up GC payment system (Stripe Connect) | Dev | High | [ ] |
| Create GC dashboard | Dev | High | [ ] |
| Test end-to-end GC booking flow | QA | High | [ ] |
| Soft launch GC feature to Pro users | Product | High | [ ] |

**GC Revenue Model:**
- User pays: $49.99/mo Pro (includes 1 session)
- Additional sessions: $75 each
- GC receives: 70% ($52.50)
- Mergenix keeps: 30% ($22.50)

### Phase 4 Deliverables
- [ ] GC scheduling system working
- [ ] Video calls functional
- [ ] 5-10 GCs onboarded
- [ ] Pro users can book sessions

---

## Phase 5: Launch Preparation (Weeks 21-24)

### Goal: Production-ready for public launch

#### Week 21-22: Security & Compliance

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Security audit (OWASP top 10) | Dev | Critical | [ ] |
| Implement rate limiting | Dev | High | [ ] |
| Add CAPTCHA to prevent abuse | Dev | High | [ ] |
| Create privacy policy (genetic data specific) | Legal | Critical | [ ] |
| Create terms of service | Legal | Critical | [ ] |
| Add cookie consent banner | Dev | High | [ ] |
| Implement data deletion flow (GDPR) | Dev | High | [ ] |
| Add genetic disclaimer on all results | Dev | Critical | [ ] |

**Required Disclaimers:**
- "This is not a clinical diagnosis"
- "Results are for educational purposes only"
- "Consult a genetic counselor for medical decisions"
- "Detection is limited to tested variants"

#### Week 23-24: Final QA & Launch

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| End-to-end testing all user flows | QA | Critical | [ ] |
| Load testing (100+ concurrent users) | Dev | High | [ ] |
| Cross-browser testing | QA | High | [ ] |
| Final copy review | Product | High | [ ] |
| Prepare launch announcement | Marketing | High | [ ] |
| Set up customer support system | Product | High | [ ] |
| Create launch day checklist | Product | High | [ ] |
| Soft launch to beta users (100) | Product | High | [ ] |
| Fix critical issues from beta | Dev | Critical | [ ] |
| **PUBLIC LAUNCH** | All | Critical | [ ] |

### Phase 5 Deliverables
- [ ] Security audit passed
- [ ] Legal documents in place
- [ ] Beta tested with 100 users
- [ ] Launch announcement ready
- [ ] Support system operational

---

## Phase 6: Post-Launch Growth (Months 7-12)

### Goal: Grow user base, optimize conversion

#### Month 7-8: SEO & Content

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| SEO audit and optimization | Marketing | High | [ ] |
| Create blog with genetic education content | Marketing | High | [ ] |
| Target keywords: "genetic compatibility", "carrier screening", "family planning genetics" | Marketing | High | [ ] |
| Build backlinks from health/parenting sites | Marketing | Medium | [ ] |
| Create shareable infographics | Marketing | Medium | [ ] |

#### Month 9-10: Conversion Optimization

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| A/B test pricing ($19.99 vs $24.99) | Product | High | [ ] |
| A/B test upgrade prompts | Product | High | [ ] |
| Implement email drip campaigns | Marketing | High | [ ] |
| Add exit-intent upgrade offers | Dev | Medium | [ ] |
| Analyze user drop-off points | Product | High | [ ] |

#### Month 11-12: B2B Preparation

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Create fertility clinic pitch deck | Product | High | [ ] |
| Build white-label demo | Dev | High | [ ] |
| Identify 10 target clinics | Sales | High | [ ] |
| Begin clinic outreach | Sales | High | [ ] |
| Design clinic pricing model | Product | High | [ ] |

---

## Key Metrics to Track

### Product Metrics

| Metric | Target (Month 1) | Target (Month 6) | Target (Month 12) |
|--------|------------------|------------------|-------------------|
| Registered Users | 500 | 5,000 | 20,000 |
| Free-to-Premium Conversion | 3% | 5% | 8% |
| Premium-to-Pro Upgrade | 10% | 15% | 20% |
| Monthly Churn (Premium) | <10% | <7% | <5% |
| Monthly Churn (Pro) | <5% | <4% | <3% |
| NPS Score | 30 | 40 | 50 |

### Revenue Projections

| Month | Free Users | Premium | Pro | MRR |
|-------|------------|---------|-----|-----|
| 1 | 500 | 15 | 2 | $400 |
| 3 | 2,000 | 80 | 10 | $2,100 |
| 6 | 5,000 | 250 | 40 | $7,000 |
| 12 | 20,000 | 1,000 | 150 | $27,500 |

**Year 1 Revenue Estimate:** $150,000 - $200,000

### Marketing Metrics

| Metric | Target |
|--------|--------|
| Organic Traffic (Monthly) | 10,000 visitors by Month 6 |
| Email List | 5,000 subscribers by Month 6 |
| Social Followers | 2,000 across platforms |
| Domain Authority | 30+ by Month 12 |

---

## Technology Stack (Recommended)

| Layer | Technology | Reason |
|-------|------------|--------|
| **Frontend** | React + TypeScript | Already using Streamlit, consider migration |
| **Backend** | Python (FastAPI) or Node.js | Depends on team preference |
| **Database** | PostgreSQL | Reliable, scalable |
| **Hosting** | Vercel (frontend) + Railway (backend) | Easy deployment, good free tiers |
| **Auth** | Clerk or Auth0 | Quick setup, secure |
| **Payments** | Stripe + PayPal | As confirmed |
| **Email** | Resend or SendGrid | Transactional + marketing |
| **PDF** | react-pdf or Puppeteer | Report generation |
| **Video Calls** | Daily.co | GC sessions |
| **Analytics** | PostHog | Privacy-friendly |
| **Error Tracking** | Sentry | Essential for debugging |

**Alternative: Keep Streamlit**
If staying with Streamlit:
- Use Streamlit Cloud for hosting
- Add Stripe via custom components
- Simpler but less flexible

---

## Budget Estimate (6 Months)

| Category | Monthly | 6-Month Total |
|----------|---------|---------------|
| Hosting (Vercel + Railway) | $50 | $300 |
| Database (Railway/Supabase) | $25 | $150 |
| Auth (Clerk free tier) | $0 | $0 |
| Stripe fees (2.9% + 30¢) | ~$50 | $300 |
| Domain + SSL | $2 | $12 |
| Email service | $20 | $120 |
| Error tracking (Sentry) | $0 | $0 |
| Analytics (PostHog free) | $0 | $0 |
| Video calls (Daily.co) | $0-50 | $0-300 |
| Legal (privacy policy review) | - | $500 |
| **TOTAL** | ~$150 | **$1,400 - $1,700** |

*Note: This assumes free/starter tiers. Costs increase with scale.*

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low conversion rate | Medium | High | A/B test pricing, improve upgrade prompts |
| GC recruitment difficulty | Medium | Medium | Start recruitment early, offer competitive rates |
| Competitor launches similar | Low | Medium | Move fast, focus on offspring analysis differentiator |
| Regulatory concerns | Low | High | Clear disclaimers, no medical advice claims |
| Security breach | Low | Critical | Security audit, encryption, minimal data storage |
| Payment processing issues | Low | High | Support both Stripe + PayPal |

---

## Team Responsibilities

### Assuming 3-Person Team

| Role | Primary Responsibilities |
|------|-------------------------|
| **Dev Lead** | Infrastructure, backend, payments, security |
| **Frontend Dev** | UI/UX, mobile, PDF reports, accessibility |
| **Product/Marketing** | Roadmap, content, GC recruitment, launch |

### Week-by-Week Owner Assignments

| Phase | Dev Lead | Frontend Dev | Product |
|-------|----------|--------------|---------|
| Phase 1 (Weeks 1-4) | Infrastructure, Auth, Payments | Payment UI | Tier curation |
| Phase 2 (Weeks 5-10) | Tier logic, API | PDF reports | Disease/trait selection |
| Phase 3 (Weeks 11-16) | - | UX improvements, mobile | Onboarding content |
| Phase 4 (Weeks 17-20) | GC backend, video | GC dashboard | GC recruitment |
| Phase 5 (Weeks 21-24) | Security audit | Final QA | Launch prep |

---

## Launch Checklist

### 1 Week Before Launch
- [ ] All critical bugs fixed
- [ ] Payment processing tested with real cards
- [ ] Privacy policy and ToS published
- [ ] Support email/system ready
- [ ] Analytics tracking verified
- [ ] Social media accounts ready
- [ ] Launch announcement drafted
- [ ] Beta tester feedback incorporated

### Launch Day
- [ ] Deploy to production
- [ ] Verify all systems operational
- [ ] Post launch announcement (social, email)
- [ ] Monitor error logs closely
- [ ] Respond to first user feedback
- [ ] Celebrate! 🎉

### Week 1 Post-Launch
- [ ] Daily monitoring of metrics
- [ ] Respond to all support requests within 24h
- [ ] Fix any critical bugs immediately
- [ ] Gather user feedback
- [ ] First conversion rate analysis

---

## Success Criteria

### MVP Success (Month 1)
- [ ] 500+ registered users
- [ ] 10+ paying customers
- [ ] <5 critical bugs
- [ ] Positive user feedback

### Growth Success (Month 6)
- [ ] 5,000+ registered users
- [ ] 250+ Premium subscribers
- [ ] 40+ Pro subscribers
- [ ] $5,000+ MRR
- [ ] 5+ GCs active on platform

### Scale Success (Month 12)
- [ ] 20,000+ registered users
- [ ] 1,000+ Premium subscribers
- [ ] 150+ Pro subscribers
- [ ] $25,000+ MRR
- [ ] First B2B clinic deal signed
- [ ] Break-even or profitable

---

*Document Version: 1.0*
*Created: February 2026*
*Last Updated: February 2026*
