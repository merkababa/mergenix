# PRD Option 2: Tiered Subscription Model

## "Tortit Essential / Plus / Pro"

---

## 1. Product Vision

**Mission:** Provide a clear value ladder for genetic family planning, where each tier unlocks meaningfully more capability for different user segments.

**Vision:** Become the subscription service that couples turn to when they're ready to start a family, with predictable pricing and continuous value delivery.

**Target Segments:**
- **Essential:** Curious couples, early relationship stage
- **Plus:** Active family planners, pre-conception phase
- **Pro:** Health-conscious families, fertility clinic patients, providers

---

## 2. Tier Structure Overview

| Feature | Essential | Plus | Pro |
|---------|-----------|------|-----|
| **Price (Monthly)** | $9.99 | $24.99 | $49.99 |
| **Price (Annual)** | $79.99 | $199.99 | $399.99 |
| **Diseases** | 100 | 500 | 1,211 |
| **Traits** | 25 | 79 | 79+ |
| **Analyses/Month** | 5 | Unlimited | Unlimited |
| **Partner Profiles** | 2 | 5 | Unlimited |
| **Reports** | Basic | Detailed | Clinical-Grade |
| **Support** | Email | Priority Email | Phone + Email |
| **Genetic Counselor** | No | No | 1/month included |

---

## 3. Essential Tier ($9.99/month)

### 3.1 Target User

*"We're thinking about having kids someday and want to know if there's anything to worry about."*

- Early-stage couples
- Curious individuals
- Price-sensitive users
- First-time genetic test users

### 3.2 Disease Selection (100 Conditions)

Curated list of 100 most impactful conditions:

**Selection Criteria:**
- High severity OR high carrier frequency
- Well-established genetic testing
- Actionable (treatable or preventable)
- Relevant across ethnic groups

**Category Distribution:**

| Category | Count | Examples |
|----------|-------|----------|
| Metabolic | 20 | PKU, Gaucher, MCAD Deficiency |
| Neurological | 18 | SMA, Tay-Sachs, Fragile X |
| Hematological | 12 | Sickle Cell, Thalassemia, Hemophilia |
| Pulmonary | 8 | Cystic Fibrosis, AAT Deficiency |
| Cardiovascular | 10 | Long QT, HCM, Familial Hypercholesterolemia |
| Cancer Predisposition | 10 | BRCA1/2, Lynch Syndrome, Li-Fraumeni |
| Immunodeficiency | 8 | SCID variants, CGD |
| Endocrine | 6 | CAH, MODY types |
| Sensory | 5 | Usher Syndrome, RP |
| Other | 3 | Various |

### 3.3 Trait Selection (25 Traits)

| Category | Traits |
|----------|--------|
| **Appearance** | Eye color, Hair color, Hair texture, Freckling, Skin pigmentation, Cleft chin, Widow's peak, Dimples |
| **Sensory** | Bitter taste, Cilantro aversion, Asparagus smell, Earwax type |
| **Physical** | Height tendency, Lactose tolerance, Caffeine metabolism, Alcohol flush |
| **Other** | Photic sneeze, Attached earlobes, Thumb hyperextension, Morning person tendency |

### 3.4 Essential-Only Features

| Feature | Description |
|---------|-------------|
| **Quick Match Score** | Single compatibility percentage (0-100) |
| **Traffic Light Risk** | Red/Yellow/Green for each condition |
| **60-Second Summary** | Ultra-fast overview of key findings |
| **Social Share Cards** | Non-medical, shareable graphics |
| **Basic PDF** | 3-page summary report |

### 3.5 Essential Limitations

| Limitation | Reason |
|------------|--------|
| 5 analyses/month | Encourages upgrade for power users |
| 2 partner profiles | Basic comparison capability |
| 30-day result retention | Creates urgency to upgrade |
| No OMIM deep links | Keeps reports simple |
| Email-only support | Cost management |

---

## 4. Plus Tier ($24.99/month)

### 4.1 Target User

*"We're actively planning to have children and want comprehensive genetic information."*

- Engaged/married couples
- Pre-conception planning stage
- Users who've outgrown Essential
- Health-conscious individuals

### 4.2 Disease Selection (500 Conditions)

All high and moderate severity conditions:

| Category | Count |
|----------|-------|
| Metabolic | 95 |
| Neurological | 73 |
| Cardiovascular | 57 |
| Cancer Predisposition | 51 |
| Immunodeficiency | 51 |
| Pharmacogenomics | 50 |
| Connective Tissue | 47 |
| Renal | 40 |
| Sensory | 36 |
| Endocrine | 32 |
| Skeletal | 25 |
| Hematological | 23 |
| Pulmonary | 18 |
| Other | 6 |

### 4.3 Full Trait Access (79 Traits)

All trait predictions including:
- Physical appearance (25)
- Sensory abilities (12)
- Metabolism (18)
- Athletic potential (10)
- Behavioral tendencies (14)

### 4.4 Plus-Only Features

| Feature | Description |
|---------|-------------|
| **"What If" Scenarios** | Model multiple potential partners |
| **Detailed Reports** | 15-page PDF with inheritance diagrams |
| **OMIM Deep Links** | Direct links to authoritative sources |
| **Carrier Matrix** | Side-by-side comparison table |
| **Offspring Probability Cards** | Visual Punnett squares |
| **Extended Family Tracking** | Note carrier status of relatives |
| **Quarterly Newsletter** | Genetics research updates |
| **Priority Email Support** | 24-hour response guarantee |

### 4.5 "What If" Scenario Feature

```
Scenario Manager
├── Partner A (Primary) ─── Saved Results
├── Partner B (Alternative) ─── Saved Results
├── Partner C (Donor Option) ─── Saved Results
└── Comparison View
    ├── Risk Overlap Matrix
    ├── Best Compatibility Score
    └── Detailed Breakdown
```

Use cases:
- Comparing potential partners
- Evaluating sperm/egg donor options
- Academic curiosity

---

## 5. Pro Tier ($49.99/month)

### 5.1 Target User

*"We need clinical-grade genetic analysis and professional guidance."*

- Fertility clinic patients
- Couples with known family history
- Healthcare providers
- Users with concerning findings

### 5.2 Full Disease Access (1,211 Conditions)

Complete panel including:
- All 500 from Plus tier
- Rare conditions (700+)
- Pharmacogenomics deep dive (100)
- Research-grade variants

### 5.3 Pro-Only Features

| Feature | Description |
|---------|-------------|
| **Genetic Counselor Session** | 1x 30-min video call/month |
| **Clinical-Grade Reports** | HIPAA-compliant, provider-ready |
| **Multi-Gen Pedigree** | 3+ generation family tree |
| **Pharmacogenomics Panel** | Drug response predictions |
| **IVF/PGT Guidance** | Pre-implantation testing prep |
| **API Access** | REST API for integrations |
| **White-Label Reports** | Custom branding for clinics |
| **Bulk Upload** | Process 10+ files at once |
| **Phone Support** | Direct line, business hours |
| **Early Access** | Beta features 60 days early |

### 5.4 Genetic Counselor Integration

**Session Structure:**

```
Pre-Session (Automated):
├── Risk summary generated
├── Flagged conditions highlighted
├── Family history questionnaire
└── Appointment scheduling

Session (30 minutes):
├── GC reviews findings
├── Explains inheritance patterns
├── Discusses family planning options
├── Answers patient questions
└── Creates action plan

Post-Session:
├── Session notes in dashboard
├── Recommended next steps
├── Follow-up scheduling option
└── Resource library access
```

**GC Network:**
- 50+ certified genetic counselors
- Coverage across time zones
- Specialty matching (prenatal, pediatric, oncology)
- Overflow to telemedicine partners

### 5.5 Multi-Generational Pedigree

```
Generation -2:  [GGM] [GGF]    [GGM] [GGF]
                  │     │        │     │
Generation -1:  [GM]──[GF]    [GM]──[GF]
                    │              │
                [Mother]────────[Father]
                        │
                    [User]────[Partner]
                           │
                       [Child]

Legend:
■ Affected    ◐ Carrier    □ Unaffected    ? Unknown
```

Features:
- Import genetic data for any node
- Auto-calculate carrier probabilities
- Identify inheritance patterns
- Export for clinical use

### 5.6 Pharmacogenomics Panel

| Drug Category | Genes | Clinical Relevance |
|---------------|-------|-------------------|
| Cardiovascular | CYP2C19, VKORC1 | Clopidogrel, Warfarin dosing |
| Psychiatry | CYP2D6, CYP2C9 | Antidepressant selection |
| Pain | CYP2D6, OPRM1 | Opioid metabolism |
| Oncology | DPYD, TPMT | Chemotherapy toxicity |
| Anesthesia | RYR1, CACNA1S | Malignant hyperthermia risk |

### 5.7 B2B Features

| Feature | Description |
|---------|-------------|
| **Clinic Dashboard** | Manage multiple patients |
| **Bulk Invite** | Send patient signup links |
| **White-Label** | Custom branding, domain |
| **SSO Integration** | SAML/OAuth for enterprise |
| **Audit Logs** | HIPAA compliance |
| **SLA** | 99.9% uptime guarantee |

---

## 6. Pricing & Promotions

### 6.1 Pricing Matrix

| Tier | Monthly | Annual | Per-Month (Annual) | Savings |
|------|---------|--------|-------------------|---------|
| Essential | $9.99 | $79.99 | $6.67 | 33% |
| Plus | $24.99 | $199.99 | $16.67 | 33% |
| Pro | $49.99 | $399.99 | $33.33 | 33% |

### 6.2 Promotional Offers

| Promotion | Discount | Terms |
|-----------|----------|-------|
| **Launch Special** | 50% off Year 1 | First 1,000 users |
| **Couples Bundle** | 25% off both | Two subscriptions |
| **Student Discount** | 40% off | Valid .edu email |
| **Referral Program** | 1 month free | Per successful referral |
| **Annual Commitment** | 33% off | Pay upfront |
| **Clinic Partnership** | Custom | 10+ Pro seats |

### 6.3 Free Trial Strategy

| Tier | Trial Length | Credit Card Required |
|------|--------------|---------------------|
| Essential | 7 days | No |
| Plus | 14 days | Yes |
| Pro | 30 days | Yes (refundable) |

---

## 7. User Journey Maps

### 7.1 Essential User Journey

```
Discovery:
├── Searches "genetic test before pregnancy"
├── Finds Tortit via SEO
├── Signs up for 7-day Essential trial
└── Uploads genetic file

Trial Period:
├── Runs first analysis
├── Views 100-disease results
├── Generates Quick Match score
└── Shares social card with partner

Conversion:
├── Trial ending notification
├── "Keep your results" prompt
├── Subscribes to Essential
└── Continues monthly

Upgrade Trigger:
├── Wants to see more diseases
├── Hits 5-analysis limit
├── Needs detailed report for doctor
└── Upgrades to Plus
```

### 7.2 Plus User Journey

```
Upgrade from Essential:
├── Clicks "See all 500 diseases"
├── Compares Essential vs Plus
├── Upgrades via 1-click
└── Immediately sees full results

Active Use:
├── Creates "What If" scenarios
├── Adds second partner profile
├── Downloads detailed PDF
├── Shares with healthcare provider

Family Planning:
├── Uses offspring probability cards
├── Reviews inheritance patterns
├── Considers genetic counselor
└── Upgrades to Pro
```

### 7.3 Pro User Journey

```
Clinical Referral:
├── OB/GYN recommends genetic screening
├── Patient given Tortit Pro code
├── 30-day trial begins
└── Full analysis completed

Genetic Counselor Session:
├── Flags concerning findings
├── Schedules GC appointment
├── 30-min video consultation
├── Action plan created

Ongoing:
├── Family pedigree built
├── Pharmacogenomics reviewed
├── Report shared with clinic
└── Retained as Pro subscriber
```

---

## 8. Technical Implementation

### 8.1 Subscription Management

**Stack:**
- Stripe Subscriptions
- Stripe Customer Portal
- Webhook handlers for lifecycle events

**Subscription States:**

```
trialing → active → past_due → canceled
              ↓
          paused (optional)
```

### 8.2 Feature Flag Configuration

```json
{
  "essential": {
    "disease_limit": 100,
    "trait_limit": 25,
    "monthly_analyses": 5,
    "partner_profiles": 2,
    "result_retention_days": 30,
    "report_type": "basic",
    "support_level": "email",
    "gc_sessions": 0,
    "api_access": false
  },
  "plus": {
    "disease_limit": 500,
    "trait_limit": 79,
    "monthly_analyses": -1,
    "partner_profiles": 5,
    "result_retention_days": -1,
    "report_type": "detailed",
    "support_level": "priority_email",
    "gc_sessions": 0,
    "api_access": false,
    "what_if_scenarios": true
  },
  "pro": {
    "disease_limit": 1211,
    "trait_limit": 79,
    "monthly_analyses": -1,
    "partner_profiles": -1,
    "result_retention_days": -1,
    "report_type": "clinical",
    "support_level": "phone",
    "gc_sessions": 1,
    "api_access": true,
    "pharmacogenomics": true,
    "family_pedigree": true,
    "white_label": true
  }
}
```

### 8.3 Database Schema

```sql
-- Subscription tiers
CREATE TABLE subscription_tiers (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(50),
    monthly_price_cents INT,
    annual_price_cents INT,
    disease_limit INT,
    trait_limit INT,
    monthly_analyses INT,
    features JSONB
);

-- User subscriptions
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    tier_id VARCHAR(20) REFERENCES subscription_tiers(id),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(20),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- GC Sessions
CREATE TABLE gc_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    counselor_id UUID,
    scheduled_at TIMESTAMP,
    duration_minutes INT,
    status VARCHAR(20),
    notes TEXT,
    recording_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 9. Revenue Projections

### 9.1 Year 1 Projections

| Metric | Q1 | Q2 | Q3 | Q4 | Total |
|--------|----|----|----|----|-------|
| Essential Subscribers | 500 | 1,500 | 3,000 | 5,000 | - |
| Plus Subscribers | 100 | 400 | 800 | 1,500 | - |
| Pro Subscribers | 20 | 80 | 150 | 300 | - |
| Monthly Revenue | $8K | $28K | $55K | $95K | - |
| Annual Revenue | - | - | - | - | **$558K** |

### 9.2 Year 2 Projections

| Metric | Target |
|--------|--------|
| Essential Subscribers | 20,000 |
| Plus Subscribers | 6,000 |
| Pro Subscribers | 1,200 |
| Annual Revenue | **$2.4M** |

### 9.3 Unit Economics

| Metric | Essential | Plus | Pro |
|--------|-----------|------|-----|
| Monthly Price | $9.99 | $24.99 | $49.99 |
| Gross Margin | 85% | 80% | 70% |
| CAC | $15 | $40 | $100 |
| LTV (12-mo churn) | $90 | $225 | $450 |
| LTV:CAC | 6:1 | 5.6:1 | 4.5:1 |

---

## 10. Success Metrics

### 10.1 Subscription Metrics

| Metric | Target |
|--------|--------|
| Trial-to-Paid Conversion | 25% |
| Monthly Churn (Essential) | <8% |
| Monthly Churn (Plus) | <5% |
| Monthly Churn (Pro) | <3% |
| Upgrade Rate (Ess→Plus) | 15%/year |
| Upgrade Rate (Plus→Pro) | 10%/year |

### 10.2 Engagement Metrics

| Metric | Essential | Plus | Pro |
|--------|-----------|------|-----|
| Monthly Active Rate | 40% | 60% | 80% |
| Analyses per User/Month | 1.5 | 3 | 5 |
| Report Downloads/Month | 0.5 | 2 | 4 |
| Partner Profiles Added | 1.2 | 2.5 | 4 |

---

## 11. Competitive Positioning

### 11.1 Value Proposition by Tier

| Tier | vs. Promethease ($12) | vs. 23andMe ($229) | vs. Invitae ($250+) |
|------|----------------------|--------------------|--------------------|
| Essential | More guidance, offspring focus | Cheaper, specialized | Much cheaper, self-serve |
| Plus | Way more features | Cheaper annually, more diseases | Cheaper, no physician needed |
| Pro | Counselor included | Counselor included, more diseases | Comparable, more accessible |

### 11.2 Differentiation

**Only Tortit offers:**
1. Offspring-focused genetic analysis
2. Partner matching and comparison
3. "What If" scenario modeling
4. Tiered pricing for different needs
5. Integrated genetic counseling

---

## 12. Launch Plan

### Phase 1: Essential Launch (Month 1-2)
- Essential tier only
- 7-day free trial
- Core analysis features
- Basic PDF reports

### Phase 2: Plus Launch (Month 3-4)
- Plus tier release
- What-If scenarios
- Detailed reports
- Upgrade prompts

### Phase 3: Pro Launch (Month 5-6)
- Pro tier release
- GC network integration
- API access
- B2B features

### Phase 4: Optimization (Month 7-12)
- A/B test pricing
- Refine upgrade triggers
- Add annual plans
- Launch referral program

---

*Document Version: 1.0*
*Model: Tiered Subscription*
*Last Updated: February 2026*
