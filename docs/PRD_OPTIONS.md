# Mergenix Product Requirements Document (PRD) Options

## Executive Summary

Mergenix is a genetic offspring analysis tool that compares two parents' DNA to predict disease risk and traits in potential children. This document presents three distinct product strategies with different monetization approaches.

**Current State:**

- 1,211 genetic diseases across 15 categories
- 79 trait SNPs
- Supports 4 file formats (23andMe, AncestryDNA, MyHeritage, VCF)
- Mendelian inheritance calculations with Punnett squares

---

## Competitive Landscape Analysis

### Direct-to-Consumer Genetic Testing

| Competitor          | Pricing     | Key Features                                                   | Weaknesses                                                 |
| ------------------- | ----------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| **23andMe**         | $119-$499   | Health + Ancestry, FDA-approved reports, 55+ health conditions | No offspring prediction, declining stock, privacy concerns |
| **AncestryDNA**     | $99-$199    | Largest database (20M+), family matching                       | Limited health features, no carrier screening              |
| **Nebula Genomics** | $99-$999    | Whole genome sequencing, privacy-focused, blockchain           | Complex for average users, no partner matching             |
| **Color Genomics**  | $249        | Clinical-grade, genetic counseling included                    | B2B focus, limited consumer features                       |
| **Invitae**         | $250+       | 280+ genes, clinical reports                                   | Requires physician order, not consumer-friendly            |
| **SelfDecode**      | $97-$297/yr | AI recommendations, wellness focus                             | Subscription fatigue, less clinical validity               |
| **Promethease**     | $12         | Cheap, comprehensive SNP analysis                              | No guidance, overwhelming for users                        |

### Key Market Gaps Identified

1. **No Offspring-Focused Product**: Zero competitors focus specifically on potential children's genetic outcomes
2. **Partner Matching Desert**: No service helps couples understand combined genetic compatibility
3. **Family Planning Void**: Pre-conception genetic analysis requires expensive clinical visits
4. **Price Gap**: Either $12 (Promethease) or $250+ (clinical) - nothing in between with guidance

---

## PRD Option 1: Freemium Model

### "Mergenix Free + Premium"

**Philosophy:** Maximize user acquisition with generous free tier, convert power users to premium.

### Free Tier Features

| Feature               | Limit           | Description                                        |
| --------------------- | --------------- | -------------------------------------------------- |
| **Disease Screening** | 25 most common  | Cystic Fibrosis, Sickle Cell, Tay-Sachs, PKU, etc. |
| **Trait Prediction**  | 10 basic traits | Eye color, hair color, earwax type, etc.           |
| **Basic Report**      | PDF summary     | High-level risk overview                           |
| **File Formats**      | All 4 formats   | Full format support                                |
| **Analysis Runs**     | 3 per month     | Re-run with different partners                     |

### Premium Tier ($29/month or $199/year)

| Feature                 | Description                                 |
| ----------------------- | ------------------------------------------- |
| **Full Disease Panel**  | All 1,211 diseases, 15 categories           |
| **All 79 Traits**       | Complete trait prediction                   |
| **Detailed Reports**    | Exportable PDF with genetic counselor notes |
| **Partner Comparison**  | Side-by-side carrier status                 |
| **Historical Analysis** | Unlimited saved analyses                    |
| **Priority Processing** | Faster analysis times                       |
| **Email Support**       | Dedicated support channel                   |

### Premium+ Tier ($49/month or $349/year)

| Feature                      | Description                             |
| ---------------------------- | --------------------------------------- |
| **Everything in Premium**    | Full feature access                     |
| **Genetic Counselor Chat**   | 1 session/month with certified GC       |
| **Family Tree Integration**  | Multi-generational risk assessment      |
| **Ethnicity-Adjusted Risks** | Population-specific carrier frequencies |
| **API Access**               | For healthcare providers                |
| **White-Label Reports**      | Branded reports for clinics             |

### Revenue Projections

| Scenario     | Free Users | Premium (5%) | Premium+ (1%) | Annual Revenue |
| ------------ | ---------- | ------------ | ------------- | -------------- |
| Conservative | 10,000     | 500          | 100           | $134,400       |
| Moderate     | 50,000     | 2,500        | 500           | $672,000       |
| Optimistic   | 200,000    | 10,000       | 2,000         | $2,688,000     |

### Pros & Cons

**Pros:**

- Low barrier to entry drives viral growth
- Word-of-mouth from free users
- Upsell path is natural (want more diseases)
- Competitive with Promethease ($12) on value

**Cons:**

- High server costs for free users
- 95% may never convert
- Support burden from non-paying users

---

## PRD Option 2: Tiered Subscription Model

### "Mergenix Essential / Plus / Pro"

**Philosophy:** Clear value tiers for different user segments, recurring revenue focus.

### Tier Structure

#### Essential ($9.99/month)

_For curious couples_

- 100 most impactful diseases
- 25 trait predictions
- Basic compatibility score
- Monthly analysis limit: 5
- Email support

#### Plus ($24.99/month)

_For family planners_

- 500 diseases (all high + moderate severity)
- All 79 traits
- Detailed carrier matching report
- Unlimited analyses
- Saved partner profiles (up to 5)
- Priority email support
- Quarterly genetic news digest

#### Pro ($49.99/month)

_For health-conscious families_

- All 1,211 diseases
- Advanced pharmacogenomics
- Genetic counselor consultation (1/month)
- Family tree disease tracking
- Multi-child scenario modeling
- API access for clinics
- White-label reporting
- Phone support

### Annual Discounts

| Tier      | Monthly | Annual  | Savings |
| --------- | ------- | ------- | ------- |
| Essential | $9.99   | $79.99  | 33%     |
| Plus      | $24.99  | $199.99 | 33%     |
| Pro       | $49.99  | $399.99 | 33%     |

### Unique Features by Tier

#### Essential Exclusive

- "Quick Match" - 60-second compatibility check
- Risk traffic light (Red/Yellow/Green)
- Shareable social cards (no medical details)

#### Plus Exclusive

- "What If" scenarios - model different partners
- Extended family carrier tracking
- Printable clinic reports
- Condition deep-dives with OMIM links

#### Pro Exclusive

- Multi-generational pedigree charts
- Sibling risk correlation
- IVF/PGT guidance integration
- HIPAA-compliant data export
- Clinic dashboard for providers

### Revenue Projections

| Scenario     | Essential | Plus   | Pro   | Annual Revenue |
| ------------ | --------- | ------ | ----- | -------------- |
| Conservative | 2,000     | 500    | 100   | $383,880       |
| Moderate     | 10,000    | 2,500  | 500   | $1,919,400     |
| Optimistic   | 40,000    | 10,000 | 2,000 | $7,677,600     |

### Pros & Cons

**Pros:**

- Predictable recurring revenue
- Clear upgrade path
- Lower churn with annual plans
- B2B potential with Pro tier

**Cons:**

- Subscription fatigue in market
- Higher barrier than freemium
- Requires constant feature development

---

## PRD Option 3: One-Time Purchase + Add-Ons

### "Mergenix Lifetime + Marketplace"

**Philosophy:** Own your genetic analysis forever, pay for specialized add-ons as needed.

### Core Product (One-Time Purchase)

#### Mergenix Personal License - $149

- All 1,211 diseases
- All 79 traits
- Unlimited partner analyses
- Lifetime updates to disease database
- PDF report generation
- Local data storage option
- No subscription required

### Add-On Marketplace

#### Analysis Packs (One-Time)

| Pack                           | Price | Contents                                     |
| ------------------------------ | ----- | -------------------------------------------- |
| **Pharmacogenomics Deep Dive** | $29   | 50+ drug response genes, medication guidance |
| **Ethnic Heritage Pack**       | $19   | Population-specific carrier frequencies      |
| **Athletic Potential**         | $14   | 30+ sports-related genetic markers           |
| **Nutrition & Metabolism**     | $19   | Lactose, caffeine, vitamin absorption        |
| **Longevity Markers**          | $24   | Aging-related genetic variants               |
| **Mental Wellness**            | $29   | Mood, sleep, stress response genes           |

#### Services (Per-Use)

| Service                        | Price     | Description                       |
| ------------------------------ | --------- | --------------------------------- |
| **Genetic Counselor Session**  | $75/30min | Video call with certified GC      |
| **Clinical Report Generation** | $25       | HIPAA-compliant provider report   |
| **Family Pedigree Analysis**   | $49       | Multi-generational risk chart     |
| **Second Opinion Review**      | $99       | Board-certified geneticist review |

#### Subscriptions (Optional)

| Service               | Price    | Description                            |
| --------------------- | -------- | -------------------------------------- |
| **Research Updates**  | $4.99/mo | New disease discoveries, updated risks |
| **Counselor On-Call** | $29/mo   | Unlimited text-based GC access         |
| **Family Plan**       | $19/mo   | Up to 5 family member analyses         |

### Partner Matching Feature - $49

_Standalone product for couples_

- Detailed compatibility report
- Combined carrier risk analysis
- Trait prediction for children
- "Conversation guide" for discussing results
- Anonymous mode (no partner data stored)

### Revenue Projections

| Scenario     | Licenses | Avg Add-Ons | Partner Match | Annual Revenue |
| ------------ | -------- | ----------- | ------------- | -------------- |
| Conservative | 1,000    | $25/user    | 300           | $188,700       |
| Moderate     | 5,000    | $40/user    | 1,500         | $1,018,500     |
| Optimistic   | 20,000   | $50/user    | 6,000         | $4,294,000     |

### Pros & Cons

**Pros:**

- Appeals to privacy-conscious users
- No subscription fatigue
- Higher perceived value (own forever)
- Marketplace creates ecosystem
- Lower support burden

**Cons:**

- Harder to predict revenue
- Must constantly create new add-ons
- Users may not return for purchases
- Higher upfront price barrier

---

## Recommended Features Across All Options

### Core Features (Must Have)

1. **Smart Partner Matching**
   - Upload both partners' genetic files
   - Side-by-side carrier comparison
   - Combined offspring risk calculator
   - Visual Punnett squares for each condition

2. **Risk Visualization**
   - Traffic light system (Red/Yellow/Green)
   - Probability percentages with confidence intervals
   - Category-based disease grouping
   - Severity indicators

3. **Educational Content**
   - Plain-language condition descriptions
   - Inheritance pattern explanations
   - "What does this mean?" contextual help
   - Video explainers for complex conditions

4. **Report Generation**
   - Downloadable PDF reports
   - Shareable (non-medical) summary cards
   - Clinic-ready detailed reports
   - Print-optimized formatting

### Differentiating Features (Should Have)

1. **Anonymous Partner Mode**
   - Partner uploads their own data to a secure link
   - Analysis runs without either seeing raw data
   - Only combined results shown
   - Ideal for early relationships

2. **"What If" Scenario Modeling**
   - Compare multiple potential partners
   - Model different egg/sperm donor scenarios
   - Helpful for fertility planning

3. **Family Planning Timeline**
   - Recommendations based on age
   - IVF/PGT-M guidance when relevant
   - Genetic counselor referral triggers

4. **Ethnicity-Aware Analysis**
   - Adjust carrier frequencies by population
   - Ashkenazi Jewish panel emphasis
   - African, Asian, Hispanic specific risks

### Innovative Features (Nice to Have)

1. **AI Genetic Counselor Chat**
   - Natural language Q&A about results
   - Powered by medical LLM
   - Escalation to human GC when needed

2. **Partner Discovery (Opt-In)**
   - Anonymous genetic compatibility matching
   - For dating apps integration
   - Privacy-preserving computation

3. **Pregnancy Monitoring Mode**
   - Track relevant markers during pregnancy
   - Connect with prenatal testing results
   - Newborn screening preparation

4. **Multi-Generational Pedigree**
   - Import family genetic data
   - Build comprehensive family tree
   - Identify carrier patterns across generations

5. **Clinic/Provider Dashboard**
   - B2B offering for OB/GYNs
   - Bulk patient management
   - HIPAA-compliant infrastructure
   - Integration with EHR systems

---

## Technical Requirements (All Options)

### Security & Privacy

- End-to-end encryption for genetic data
- SOC 2 Type II compliance roadmap
- GDPR and CCPA compliant
- Option for local-only processing
- Data deletion on request
- No third-party data sharing without consent

### Performance

- Analysis completion < 30 seconds
- PDF generation < 10 seconds
- Support for files up to 50MB
- 99.9% uptime SLA

### Integrations

- OAuth for major genetic testing providers
- API for healthcare systems
- Webhook support for clinics
- Export to Apple Health (future)

---

## Go-to-Market Strategy Recommendations

### Option 1 (Freemium) GTM

- Viral social media campaign ("Check your genetic compatibility!")
- Influencer partnerships (parenting, wellness)
- SEO focus on "genetic compatibility test"
- Reddit/forum community building

### Option 2 (Subscription) GTM

- Content marketing (genetic education blog)
- Partnerships with fertility clinics
- Insurance company discussions
- Employer wellness program sales

### Option 3 (One-Time) GTM

- Product Hunt launch
- Privacy-focused marketing
- Comparison content vs. subscription competitors
- Affiliate program for genetic counselors

---

## Recommendation

**For Mergenix's current stage, we recommend Option 1 (Freemium)** with a path to Option 2.

**Rationale:**

1. Maximizes user acquisition with zero barrier
2. Builds brand awareness in underserved market
3. Free tier creates viral potential
4. Can evolve to subscription once user base established
5. Lower initial development cost (simpler billing)

**Phased Approach:**

- **Phase 1 (Months 1-6):** Launch freemium, focus on user acquisition
- **Phase 2 (Months 6-12):** Add Premium tier, optimize conversion
- **Phase 3 (Year 2):** Introduce Premium+, explore B2B clinic partnerships
- **Phase 4 (Year 2+):** Consider marketplace add-ons from Option 3

---

## Appendix: Competitive Feature Matrix

| Feature              | 23andMe | Ancestry | Nebula | Color | Invitae | **Mergenix** |
| -------------------- | ------- | -------- | ------ | ----- | ------- | ------------ |
| Carrier Screening    | 44      | No       | 30+    | 30    | 280+    | **1,211**    |
| Offspring Prediction | No      | No       | No     | No    | No      | **Yes**      |
| Partner Matching     | No      | No       | No     | No    | No      | **Yes**      |
| Trait Prediction     | 30+     | 35+      | 100+   | No    | No      | **79**       |
| Bring Your Own Data  | No      | No       | Yes    | No    | No      | **Yes**      |
| Free Tier            | No      | No       | No     | No    | No      | **Yes**      |
| No Subscription      | No      | No       | No     | No    | Yes     | **Optional** |
| Genetic Counseling   | $$      | No       | No     | Inc.  | Inc.    | **Add-on**   |

---

_Document Version: 1.0_
_Created: February 2026_
_Author: Mergenix Product Team_
