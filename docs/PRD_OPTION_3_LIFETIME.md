# PRD Option 3: One-Time Purchase + Marketplace

## "Tortit Lifetime + Add-Ons"

---

## 1. Product Vision

**Mission:** Offer a premium, privacy-first genetic analysis tool that users own forever, with an ecosystem of specialized add-ons for those who want more.

**Vision:** Become the "buy once, own forever" alternative in a market saturated with subscriptions, appealing to privacy-conscious users who value data ownership.

**Target Users:**
- Privacy-conscious individuals
- Subscription-fatigued consumers
- One-time planners (having kids soon)
- Tech-savvy users who prefer ownership
- Users in regions with recurring payment challenges

---

## 2. Core Product: Tortit Personal License

### 2.1 Pricing

| License Type | Price | Use Case |
|--------------|-------|----------|
| **Personal** | $149 | Individual/couple use |
| **Family** | $249 | Up to 5 family members |
| **Clinic** | $999 | Healthcare provider, unlimited patients |

### 2.2 What's Included (Forever)

| Feature | Description |
|---------|-------------|
| **Full Disease Panel** | All 1,211 diseases, all categories |
| **Full Trait Panel** | All 79 trait predictions |
| **Unlimited Analyses** | No monthly limits, ever |
| **Unlimited Partners** | Compare as many as you want |
| **PDF Report Generation** | Download anytime |
| **Lifetime Updates** | New diseases added quarterly |
| **Local Processing Option** | Keep data on your machine |
| **No Account Required** | Use offline if preferred |
| **Email Support** | Included for 1 year |

### 2.3 Technical Delivery

**Option A: Web App with License Key**
```
Purchase → Receive License Key → Enter on Web App → Unlocked Forever
```

**Option B: Downloadable Desktop App**
```
Purchase → Download Installer → Activate with Key → Runs Locally
```

**Option C: Both (Recommended)**
- Web app for convenience
- Desktop app for privacy purists
- Same license works for both
- Sync between them optional

### 2.4 Privacy-First Features

| Feature | Description |
|---------|-------------|
| **Local Processing** | Analysis runs entirely on your device |
| **No Cloud Storage** | Data never leaves your machine |
| **Zero Telemetry** | No usage tracking |
| **Encrypted Exports** | Password-protected reports |
| **Data Deletion** | One-click wipe all data |
| **Open Algorithms** | Published methodology |

---

## 3. Add-On Marketplace

### 3.1 Analysis Packs (One-Time Purchase)

| Pack | Price | Contents |
|------|-------|----------|
| **Pharmacogenomics Pro** | $29 | 100+ drug response genes, medication guidance, drug interaction warnings |
| **Ethnic Heritage Pack** | $19 | 15 population-specific carrier frequencies, ancestry-adjusted risks |
| **Athletic Potential** | $14 | 40 sports genes, muscle fiber type, endurance vs power, injury risk |
| **Nutrition & Metabolism** | $19 | Lactose, gluten, caffeine, vitamin absorption, obesity risk genes |
| **Longevity Markers** | $24 | Telomere-related genes, aging markers, disease prevention insights |
| **Mental Wellness** | $29 | Mood regulation, sleep patterns, stress response, addiction risk |
| **Skin & Beauty** | $14 | Skin aging, sun sensitivity, hair loss prediction |
| **Pregnancy Health** | $24 | Prenatal vitamin needs, morning sickness, preeclampsia risk |

### 3.2 Pack Details

#### Pharmacogenomics Pro ($29)

| Category | Genes | Drugs Covered |
|----------|-------|---------------|
| Cardiovascular | CYP2C19, VKORC1, SLCO1B1 | Warfarin, Clopidogrel, Statins |
| Psychiatry | CYP2D6, CYP2C9, CYP1A2 | SSRIs, SNRIs, Antipsychotics |
| Pain Management | OPRM1, COMT, CYP2D6 | Opioids, NSAIDs |
| Oncology | DPYD, TPMT, UGT1A1 | 5-FU, Thiopurines, Irinotecan |
| Anesthesia | RYR1, CACNA1S, BCHE | General anesthetics, Succinylcholine |
| Infectious Disease | HLA-B*57:01, HLA-B*15:02 | Abacavir, Carbamazepine |

**Report includes:**
- Drug response predictions
- Dosage adjustment recommendations
- Alternative medication suggestions
- Drug interaction warnings
- Printable card for pharmacist

#### Athletic Potential Pack ($14)

| Gene | Trait | Sport Relevance |
|------|-------|-----------------|
| ACTN3 | Muscle fiber type | Sprinting vs endurance |
| ACE | Endurance capacity | Marathon, cycling |
| PPARGC1A | Aerobic capacity | Cardiovascular sports |
| COL5A1 | Tendon flexibility | Gymnastics, dance |
| VEGFA | Oxygen delivery | High-altitude sports |
| MSTN | Muscle growth | Strength sports |

**Report includes:**
- Sport suitability scores
- Training recommendations
- Injury risk assessment
- Recovery speed prediction
- Nutrition timing suggestions

#### Pregnancy Health Pack ($24)

| Gene | Relevance |
|------|-----------|
| MTHFR | Folate metabolism, neural tube defects |
| Factor V Leiden | Blood clot risk during pregnancy |
| HLA-DQA1 | Celiac disease risk for baby |
| GDF15 | Morning sickness severity |
| ACE | Preeclampsia risk |
| SLC6A4 | Postpartum depression risk |

**Report includes:**
- Prenatal vitamin recommendations
- Risk factors to discuss with OB
- Genetic conditions to screen for
- Newborn screening preparation

### 3.3 Services (Per-Use)

| Service | Price | Description |
|---------|-------|-------------|
| **Genetic Counselor Session** | $75/30min | Video call with certified GC |
| **Clinical Report Generation** | $25 | HIPAA-compliant, provider-ready PDF |
| **Family Pedigree Analysis** | $49 | 3+ generation risk chart with narrative |
| **Second Opinion Review** | $99 | Board-certified geneticist letter |
| **Priority Processing** | $5 | Skip queue, instant results |
| **Rush Report** | $15 | PDF generated within 1 hour |

### 3.4 Optional Subscriptions

| Service | Price | Description |
|---------|-------|-------------|
| **Research Updates** | $4.99/mo | Monthly digest of new discoveries |
| **Counselor On-Call** | $29/mo | Unlimited text-based GC access |
| **Family Plan** | $19/mo | Up to 5 additional family members |
| **Clinic Dashboard** | $99/mo | Provider tools, patient management |

---

## 4. Partner Match Product

### 4.1 Standalone Offering

**Tortit Partner Match - $49**

A focused product for couples:

| Feature | Description |
|---------|-------------|
| **Combined Analysis** | Both partners' carrier status |
| **Compatibility Score** | 0-100 genetic compatibility |
| **Risk Matrix** | Side-by-side disease comparison |
| **Offspring Predictions** | Punnett squares for each condition |
| **Conversation Guide** | How to discuss results |
| **Anonymous Mode** | No partner data stored after analysis |

### 4.2 Anonymous Partner Mode

For couples not ready to share raw genetic data:

```
Partner A:                     Partner B:
├── Uploads file locally       ├── Uploads file locally
├── Generates secure hash      ├── Generates secure hash
└── Sends hash to server       └── Sends hash to server
              │                            │
              └──────────┬─────────────────┘
                         │
              Server-side comparison
              (hashes only, no raw data)
                         │
                    Combined Result
                         │
         Both partners see same result
```

**Privacy guarantees:**
- Raw genetic data never uploaded
- Only cryptographic hashes compared
- Cannot reverse-engineer partner's data
- Results expire after 24 hours

### 4.3 Bundle Options

| Bundle | Contents | Price | Savings |
|--------|----------|-------|---------|
| **Couple Starter** | 2x Personal License + Partner Match | $299 | $48 (14%) |
| **Family Planning** | 2x Personal + Partner + Pregnancy Pack | $369 | $52 (12%) |
| **Complete Couple** | 2x Personal + All Packs + Partner Match | $449 | $131 (23%) |

---

## 5. Pricing Strategy

### 5.1 Core Pricing Philosophy

**"Pay once, own forever"** appeals to:
- Subscription fatigue (avg person has 12 subscriptions)
- Privacy concerns (one-time = less data retention)
- Budget planning (known cost, no surprises)
- Gift-giving (can purchase for others)

### 5.2 Price Anchoring

| Competitor | Model | Annual Cost | Tortit Comparison |
|------------|-------|-------------|-------------------|
| 23andMe Health | One-time | $229 | Tortit Personal cheaper, more focused |
| Nebula WGS | One-time | $249-999 | Tortit cheaper, carrier-focused |
| Color | One-time | $249 | Tortit comparable, no physician needed |
| SelfDecode | Subscription | $297/yr | Tortit = 6 months of SelfDecode |
| Promethease | One-time | $12 | Tortit has guidance, offspring focus |

**Positioning:** More than Promethease, less than clinical. The "Goldilocks" option.

### 5.3 Promotional Pricing

| Promotion | Discount | Trigger |
|-----------|----------|---------|
| **Launch Sale** | 30% off | First 500 customers |
| **Holiday Bundle** | 25% off bundles | Black Friday, Valentine's |
| **Referral Reward** | $20 credit | Per successful referral |
| **Education Discount** | 25% off | .edu email |
| **Healthcare Worker** | 20% off | Verified credentials |

---

## 6. User Journey

### 6.1 Core Product Journey

```
Awareness:
├── Google: "one-time genetic test buy"
├── Reddit: r/genetics recommendations
├── Podcast sponsorship
└── Landing page visit

Consideration:
├── Compare to subscription alternatives
├── Read privacy policy
├── Watch demo video
└── Check sample report

Purchase:
├── Select Personal License ($149)
├── Add Pharmacogenomics Pack ($29)
├── Checkout via Stripe
└── Receive license key via email

Onboarding:
├── Download desktop app (or use web)
├── Enter license key
├── Upload genetic file
└── Run first analysis

Active Use:
├── Generate PDF report
├── Add partner for comparison
├── Explore all 1,211 diseases
└── Download detailed breakdowns

Expansion:
├── Receive quarterly update email
├── Browse add-on marketplace
├── Purchase Mental Wellness pack
└── Book GC session
```

### 6.2 Partner Match Journey

```
Discovery:
├── Couple discussing family planning
├── One partner finds Tortit
├── Shares Partner Match link
└── Both create accounts

Anonymous Analysis:
├── Partner A uploads locally
├── Partner B uploads locally
├── System compares (hashes only)
└── Results delivered to both

Next Steps:
├── Review combined risk matrix
├── Discuss using conversation guide
├── Decide on full licenses
└── Upgrade to Personal + Personal bundle
```

---

## 7. Technical Architecture

### 7.1 License Key System

```
License Key Format: TRTT-XXXX-XXXX-XXXX-XXXX

Validation:
├── Check signature (RSA-2048)
├── Verify not revoked
├── Check activation count
└── Grant access

Activation Limits:
├── Personal: 3 devices
├── Family: 10 devices
├── Clinic: Unlimited
```

### 7.2 Desktop App Architecture

```
Tortit Desktop App
├── Electron wrapper
├── Local SQLite database
├── Offline analysis engine
├── Encrypted storage
└── Optional cloud sync

Analysis Pipeline (Local):
├── Parse genetic file
├── Match against local disease DB
├── Calculate Mendelian risks
├── Generate report
└── Store encrypted results
```

### 7.3 Add-On Delivery

```
Purchase Add-On:
├── Payment processed
├── License key extended with capability
├── App checks for updates
├── New analysis pack downloaded
└── UI unlocks new features
```

### 7.4 Database Schema

```sql
-- Licenses
CREATE TABLE licenses (
    id UUID PRIMARY KEY,
    key VARCHAR(25) UNIQUE,
    type VARCHAR(20), -- personal, family, clinic
    user_id UUID,
    activated_at TIMESTAMP,
    devices_activated INT DEFAULT 0,
    max_devices INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add-on purchases
CREATE TABLE addon_purchases (
    id UUID PRIMARY KEY,
    license_id UUID REFERENCES licenses(id),
    addon_id VARCHAR(50),
    purchased_at TIMESTAMP DEFAULT NOW()
);

-- Available add-ons
CREATE TABLE addons (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    price_cents INT,
    category VARCHAR(50),
    active BOOLEAN DEFAULT TRUE
);

-- Service bookings
CREATE TABLE service_bookings (
    id UUID PRIMARY KEY,
    user_id UUID,
    service_type VARCHAR(50),
    scheduled_at TIMESTAMP,
    status VARCHAR(20),
    provider_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 8. Revenue Model

### 8.1 Revenue Streams

| Stream | % of Revenue | Description |
|--------|--------------|-------------|
| Core Licenses | 60% | Personal, Family, Clinic |
| Add-On Packs | 25% | Analysis packs |
| Services | 10% | GC sessions, reports |
| Subscriptions | 5% | Optional recurring |

### 8.2 Projections

#### Year 1

| Product | Units | Avg Price | Revenue |
|---------|-------|-----------|---------|
| Personal License | 2,000 | $149 | $298,000 |
| Family License | 200 | $249 | $49,800 |
| Clinic License | 10 | $999 | $9,990 |
| Add-On Packs | 1,500 | $22 avg | $33,000 |
| Services | 300 | $60 avg | $18,000 |
| Subscriptions | 100 | $180/yr | $18,000 |
| **Total Year 1** | - | - | **$426,790** |

#### Year 2

| Product | Units | Revenue |
|---------|-------|---------|
| Personal License | 8,000 | $1,192,000 |
| Family License | 800 | $199,200 |
| Clinic License | 50 | $49,950 |
| Add-On Packs | 6,000 | $132,000 |
| Services | 1,200 | $72,000 |
| Subscriptions | 500 | $90,000 |
| **Total Year 2** | - | **$1,735,150** |

### 8.3 Unit Economics

| Metric | Value |
|--------|-------|
| Average Order Value | $178 |
| Add-On Attach Rate | 35% |
| Average Add-Ons/User | 1.5 |
| Service Conversion | 8% |
| Cost per Acquisition | $25 |
| Gross Margin | 88% |

---

## 9. Marketplace Ecosystem

### 9.1 Third-Party Developer Program (Future)

Allow developers to create add-on packs:

| Requirement | Description |
|-------------|-------------|
| API Access | Read user genetic data (with permission) |
| Review Process | Medical accuracy review |
| Revenue Share | 70% developer, 30% Tortit |
| Quality Standards | Peer-reviewed sources required |

**Example third-party packs:**
- Pet genetics (for breeders)
- Genealogy deep-dive
- Regional disease focus (e.g., Finland)
- Athletic training plans

### 9.2 Partner Integrations

| Partner Type | Integration | Revenue Model |
|--------------|-------------|---------------|
| **Fertility Clinics** | Patient onboarding | B2B licensing |
| **OB/GYN Offices** | Report sharing | Per-report fee |
| **Genetic Counselors** | Referral program | Revenue share |
| **Health Apps** | Data export | API fees |
| **Life Insurance** | Risk assessment | Enterprise license |

---

## 10. Competitive Advantages

### 10.1 vs. Subscription Products

| Advantage | Description |
|-----------|-------------|
| **No Recurring Costs** | Pay once, use forever |
| **No FOMO** | All core features included |
| **Budget-Friendly** | Known cost, gift-able |
| **Privacy** | Less ongoing data retention |

### 10.2 vs. Clinical Products

| Advantage | Description |
|-----------|-------------|
| **Self-Service** | No physician order needed |
| **Faster** | Instant results, no lab wait |
| **Cheaper** | 40-60% less than clinical |
| **Convenient** | Use your existing DNA data |

### 10.3 vs. Cheap Tools (Promethease)

| Advantage | Description |
|-----------|-------------|
| **Guided Experience** | Not just raw data |
| **Offspring Focus** | Unique partner matching |
| **Professional Reports** | Clinic-ready PDFs |
| **Support** | Email support included |

---

## 11. Launch Plan

### Phase 1: Core Product (Months 1-2)
- Personal License launch
- Web app + desktop app
- Basic PDF reports
- Email support

### Phase 2: Marketplace (Months 3-4)
- First 4 add-on packs
- GC session booking
- Clinical report service
- Family License tier

### Phase 3: Partner Match (Months 5-6)
- Standalone Partner Match product
- Anonymous mode
- Bundle offerings
- Referral program

### Phase 4: Expansion (Months 7-12)
- Remaining add-on packs
- Clinic License + dashboard
- Optional subscriptions
- Third-party developer program

---

## 12. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Lower recurring revenue | Strong add-on ecosystem, services |
| Users don't return | Quarterly updates, email engagement |
| Price too high upfront | Payment plans, promotional pricing |
| Piracy/key sharing | Device limits, online validation |
| Competition undercuts | Focus on privacy, offspring niche |

---

## 13. Success Metrics

### 13.1 Sales Metrics

| Metric | Year 1 Target | Year 2 Target |
|--------|---------------|---------------|
| Licenses Sold | 2,500 | 10,000 |
| Add-On Attach Rate | 30% | 45% |
| Service Conversion | 5% | 10% |
| Average Order Value | $160 | $195 |

### 13.2 Engagement Metrics

| Metric | Target |
|--------|--------|
| 30-Day Activation | 90% |
| Analyses per User | 3+ |
| Add-On Purchase (6 mo) | 40% |
| NPS Score | 50+ |
| Support Ticket Rate | <5% |

---

*Document Version: 1.0*
*Model: One-Time Purchase + Marketplace*
*Last Updated: February 2026*
