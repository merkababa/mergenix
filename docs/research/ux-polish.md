# Mergenix UX Polish & User Experience Research Report

**Date:** 2026-02-08
**Researcher:** UX Research Agent
**Scope:** Comprehensive UX audit across all 9 pages, user flows, emotional design, and competitive positioning

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Audit](#2-current-state-audit)
3. [User Journey Maps](#3-user-journey-maps)
4. [User Onboarding](#4-user-onboarding)
5. [Error Handling UX](#5-error-handling-ux)
6. [Results Presentation](#6-results-presentation)
7. [Progress Indicators](#7-progress-indicators)
8. [Educational Content](#8-educational-content)
9. [Navigation Flow](#9-navigation-flow)
10. [Mobile Experience](#10-mobile-experience)
11. [Emotional Design](#11-emotional-design)
12. [Competitive Analysis](#12-competitive-analysis)
13. [Gamification & Engagement](#13-gamification--engagement)
14. [Prioritized Recommendations](#14-prioritized-recommendations)

---

## 1. Executive Summary

Mergenix has a strong visual foundation (Bioluminescent Laboratory theme, dark/light mode) and solid core functionality (2,715 diseases, 79 traits, 4 file formats). However, significant UX gaps exist in **user onboarding, emotional sensitivity around high-risk results, educational scaffolding for non-scientists, mobile responsiveness, and progressive disclosure of complex genetic information**.

The most critical improvements, ranked by user impact:

| Priority | Area                                     | Impact   | Effort |
| -------- | ---------------------------------------- | -------- | ------ |
| P0       | Emotional design for high-risk results   | Critical | Medium |
| P0       | First-time user onboarding & sample data | Critical | Medium |
| P1       | Plain-language result explanations       | High     | Medium |
| P1       | Genetic glossary & tooltips              | High     | Low    |
| P1       | File upload validation feedback          | High     | Low    |
| P2       | Multi-step progress indicators           | Medium   | Low    |
| P2       | Mobile responsive layouts                | Medium   | High   |
| P2       | Interactive guided tour                  | Medium   | Medium |
| P3       | Dashboard & analysis history             | Medium   | High   |
| P3       | Shareable/exportable reports             | Medium   | High   |

---

## 2. Current State Audit

### Page-by-Page Analysis

#### `pages/home.py` (238 LOC)

**Strengths:**

- Clear hero section with animated DNA dots
- Strong value proposition ("2,715 diseases, 79 traits")
- Trust signals (encryption, no data stored, HIPAA)
- How-It-Works section with 3 steps
- FAQ section with common questions
- Two CTAs (Get Started Free + See How It Works)

**Weaknesses:**

- "See How It Works" button does nothing (L88: `pass` -- scroll anchor comment but no implementation)
- No sample data demo for first-time visitors
- No social proof (testimonials, user count, case studies)
- Pricing preview shows 3 tiers but "Most Popular" is marked on Pro (L138) -- Premium would be more strategic
- No video or interactive demo
- No explanation of what genetic data IS for newcomers

#### `pages/analysis.py` (637 LOC)

**Strengths:**

- Auth guard redirects to sign-in with return URL
- Supports single-parent carrier screening (partial analysis)
- Progress bar during analysis (10% -> 50% -> 100%)
- Results organized in tabs (Risk Factors, Predicted Traits, Individual Reports)
- ClinVar "Learn More" buttons for each variant
- Probability bars with color-coding
- Trait categories with icons

**Weaknesses:**

- No explanation of what users should expect before uploading
- No sample file download or demo mode
- File upload area has no drag-and-drop visual indicator
- Error messages for invalid files show raw exception text (L282: `st.error(f"... {err}")`)
- No file format detection feedback until after full parse attempt
- No "What does this mean?" context for risk results
- High-risk results use alarming language ("High Risk -- Both Parents Carry Variant") without reassuring context
- No guidance on next steps (consult genetic counselor)
- No explanation of carrier vs. affected vs. normal for lay users
- Missing data tab shows raw technical info without explanation
- Trait confidence levels (high/medium/low) unexplained
- No result summary or "key takeaways" section
- Long scrolling page with no jump-to-section navigation
- Individual Reports tab re-runs full carrier screening (performance issue)

#### `pages/disease_catalog.py` (446 LOC)

**Strengths:**

- Rich filtering (search, severity, inheritance, category, frequency slider)
- Interactive dataframe with sorting
- Paginated disease detail cards
- Four Plotly charts (inheritance donut, severity bar, category bar, top 15)
- Insights section with fun facts

**Weaknesses:**

- Filters are collapsed by default -- users may not discover them
- No "popular diseases" or "common questions" quick-filter
- OMIM links open externally with no warning
- Disease cards show technical genetic terms without explanations
- No comparison between conditions
- Carrier frequency slider is confusing ("1 in X" -- lower = more common but slider goes left-to-right)

#### `pages/auth.py` (271 LOC)

**Strengths:**

- Clean tabbed interface (Sign In / Create Account)
- Google OAuth with CSRF protection
- Password strength indicator
- Remember me checkbox
- Trust signals footer
- Auto-redirect after login

**Weaknesses:**

- Apple Sign-In shows "Coming Soon" but button is fully visible and clickable -- frustrating
- "Forgot password?" link goes nowhere (`href="#"`)
- No email validation feedback (format check) before form submit
- Password requirements only shown in tooltip, not inline
- No progressive disclosure -- all fields shown at once
- Terms of Service and Privacy Policy links go nowhere (`onclick="return false;"`)
- 2-second sleep after registration (L253) -- blocks UI without explanation
- No email verification flow

#### `pages/account.py` (144 LOC)

**Strengths:**

- Clean profile card with avatar initial
- Current plan display with disease/trait limits
- Password change form with validation
- Logout and account deletion section

**Weaknesses:**

- No edit profile functionality (name change)
- Account deletion requires emailing support -- no in-app flow
- No activity history or analysis count
- No connected accounts management (Google OAuth status)
- No data export option (GDPR compliance)

#### `pages/subscription.py` (226 LOC)

**Strengths:**

- Current plan display with features
- Side-by-side tier comparison
- Stripe + PayPal payment options
- Feature comparison dataframe
- Pricing FAQ

**Weaknesses:**

- Payment flow opens external link in same tab -- could lose session state
- No money-back guarantee messaging
- No testimonials on pricing page
- "Most Popular" is on Pro (highest price) -- may seem like upselling
- Cancel button after payment selection requires rerun -- flash of content
- No savings calculation or value framing

#### `pages/products.py` (90 LOC)

**Strengths:**

- Clean pricing card layout
- Feature comparison table

**Weaknesses:**

- Nearly identical to subscription page -- confusing redundancy
- No product descriptions beyond features list
- No use cases or personas ("Best for couples planning...")

#### `pages/about.py` (116 LOC)

**Strengths:**

- Clear methodology explanation (Mendelian, Punnett, Variant Classification)
- Data sources with descriptions
- Important Limitations section (educational tool disclaimer)
- Supported file formats

**Weaknesses:**

- No team information despite page description mentioning it
- No contact form
- No scientific advisory board or credentials
- Limitations section feels buried at the bottom

#### `pages/legal.py` (129 LOC)

**Strengths:**

- Privacy policy, ToS, HIPAA, Data Handling all covered
- "What We DO / DON'T Do" visual comparison
- Last updated date

**Weaknesses:**

- Static content with no search
- No cookie consent banner
- HIPAA section should be more prominent (trust builder)
- No downloadable PDF of policies

---

## 3. User Journey Maps

### Journey 1: First-Time Visitor (No Account)

```
[Landing Page] --> [Reads Hero + How It Works] --> [Scrolls to Pricing]
     |                                                    |
     |--- "See How It Works" button --> DEAD END (does nothing)
     |
     v
[Gets Curious] --> [Clicks "Disease Catalog"] --> [Browses diseases]
     |                                                    |
     v                                                    |
[Clicks "Get Started Free"] --> [Auth Page]               |
     |                                                    |
     v                                                    |
[Signs Up] --> [Redirected to Analysis] --> [?? Now what?]
     |
     v
[Sees file upload] --> [Doesn't have genetic data] --> STUCK / BOUNCES
```

**Problems Identified:**

1. No sample data or demo mode -- users without genetic data files bounce immediately
2. "See How It Works" button is non-functional
3. No guided tour after first sign-up
4. No explanation of how to get genetic data files
5. Analysis page immediately asks for file upload -- no warm-up or context

### Journey 2: Returning User (Has Files)

```
[Home] --> [Sign In] --> [Analysis Page]
     |
     v
[Upload File A] --> [Sees validation: "45,291 SNPs loaded"]
[Upload File B] --> [Sees validation: "45,291 SNPs loaded"]
     |
     v
[Click "Run Offspring Analysis"] --> [Progress bar 10%...50%...100%]
     |
     v
[Results Dashboard] --> [Risk Factors Tab] --> [Sees "High Risk" items]
                               |                      |
                               |                      v
                               |              [User panics -- "HIGH RISK"??]
                               |              [No reassurance or context]
                               |              [No "what to do next"]
                               |
                               v
                        [Predicted Traits Tab] --> [Fun, engaging]
                               |
                               v
                        [Individual Reports Tab] --> [Technical, dry]
```

**Problems Identified:**

1. High-risk results shown with alarming styling (red borders, "High Risk" labels) but no emotional context
2. No "What does this mean for us?" plain-language summary
3. No recommendation to consult a genetic counselor
4. No distinction between "high risk but manageable" vs "high risk and serious"
5. Trait predictions are fun; disease results are scary -- tonal whiplash

### Journey 3: Single-Parent Analysis

```
[Upload only File A] --> [Single Parent Carrier Screening]
     |
     v
[Sees carrier/affected variants for one parent]
     |
     v
[Info box: "Upload second parent to unlock offspring analysis"]
     |
     v
[User thinks: "Wait, can I get useful info from just my data?"]
[Page doesn't explain the value of single-parent screening]
```

**Problems Identified:**

1. Single-parent mode works but feels like a half-feature
2. No explanation of what carrier status means for an individual
3. Missing "share with partner" or "invite second parent" flow

---

## 4. User Onboarding

### Current State

- No onboarding whatsoever
- After registration, user is dumped onto the analysis page
- No welcome flow, guided tour, or orientation
- No sample data or demo mode

### Recommended Improvements

#### 4.1 Welcome Flow After Registration

**Implementation:** After successful registration (auth.py L254), redirect to a new welcome interstitial instead of directly to analysis.

**Copy suggestions:**

```
Welcome to Mergenix, [Name]!

Here's what you can do:

1. UPLOAD YOUR GENETIC DATA
   Upload raw DNA data from 23andMe, AncestryDNA, MyHeritage, or VCF files.
   [Don't have genetic data? Try our demo with sample files ->]

2. SCREEN FOR GENETIC DISEASES
   We'll check for carrier status across 2,715 genetic conditions.

3. PREDICT OFFSPRING TRAITS
   See what eye color, hair color, and 77 other traits your offspring might have.

[Start with Demo Data]  [Upload My Files]  [Learn More]
```

#### 4.2 Sample Data Demo Mode

**Implementation:** Provide a "Try Demo" button that loads pre-generated sample parent files (already exist in `data/sample_files/`) without requiring sign-up.

**Benefits:**

- Lets visitors see results before committing to registration
- Demonstrates value proposition immediately
- Reduces bounce rate from analysis page

#### 4.3 Progressive Disclosure on Analysis Page

**Current:** All upload instructions, settings, and results on one page
**Proposed:** Step-by-step wizard:

```
Step 1: Upload Files  -->  Step 2: Review Data  -->  Step 3: Run Analysis  -->  Step 4: View Results
     [active]                [locked]                  [locked]                  [locked]
```

#### 4.4 "How to Get Your DNA Data" Guide

Many users may not know how to download their raw DNA data. Add an expandable guide:

```
How to Download Your Raw DNA Data:

23andMe:  Settings -> Raw Data -> Download
AncestryDNA:  Settings -> DNA Settings -> Download Raw DNA Data
MyHeritage:  DNA -> DNA Kit -> Download Raw Data
VCF:  From your sequencing provider (Nebula, Dante, etc.)
```

---

## 5. Error Handling UX

### Current Issues

#### 5.1 File Upload Errors

**Current (analysis.py L282):**

```python
st.error(f"... {label}: Invalid file -- {err}")
```

This shows raw Python exception text, which is meaningless to users.

**Proposed:**

```
We couldn't read this file. Here's what might help:

- Make sure it's a raw DNA data file (not a PDF or processed report)
- Supported formats: .txt (23andMe, AncestryDNA), .csv (MyHeritage), .vcf
- The file should contain SNP data with rsIDs (e.g., rs12345)
- File size should be between 1 MB and 100 MB

[See supported file formats ->]  [Download a sample file to test ->]
```

#### 5.2 Analysis Failure

**Current (analysis.py L369):**

```python
st.error(f"Carrier analysis failed: {exc}")
```

**Proposed:**

```
Analysis encountered an issue.

This can happen if:
- The DNA data file is from an unsupported platform
- The file was corrupted during download
- There aren't enough overlapping SNPs between the two files

Try re-downloading your raw data file and uploading again.
[Contact Support ->]
```

#### 5.3 Empty States

**Current:** When no traits are predicted, shows generic `st.warning("No traits could be predicted.")`

**Proposed:**

```
No traits could be predicted from the uploaded data.

This usually means the DNA files don't contain the specific SNP markers
our trait analysis looks for. This is normal -- different testing
platforms cover different SNPs.

Your carrier risk analysis above is still valid!

Covered platforms: 23andMe typically provides the best SNP overlap.
```

#### 5.4 Auth Failures

- "Invalid email or password" -- no guidance on password reset
- OAuth failures show raw exception text
- No rate limiting feedback for repeated login attempts

---

## 6. Results Presentation

### 6.1 Current Problems

The results are presented in a technically accurate but emotionally detached way. For a product dealing with genetic health information, this is a critical gap.

**Key issues:**

1. **No result summary** -- Users see metrics and tabs but no plain-language "Here's what we found"
2. **Alarming high-risk language** without context or reassurance
3. **No "what to do next" guidance** after viewing results
4. **Technical terminology** (autosomal recessive, pathogenic allele, heterozygous) without definitions
5. **No risk contextualization** -- "1 in 25 carriers" means nothing without context ("that's about 1 in every classroom")

### 6.2 Recommended Result Summary Section

Add a summary card above the tabs:

```
YOUR RESULTS AT A GLANCE

We screened [Parent A] and [Parent B]'s DNA across 2,715 genetic conditions
and 79 traits.

KEY FINDINGS:
- [3] conditions where both parents carry a variant (details in Risk Factors tab)
- [12] conditions where one parent is a carrier (low offspring risk)
- [47] trait predictions with probabilities

IMPORTANT CONTEXT:
Being a carrier is common -- about 1 in 4 people carry at least one
pathogenic variant. Carrier status alone does NOT mean your offspring
will be affected. For conditions where both parents carry a variant,
there is typically a 25% chance an offspring would be affected.

[Learn what these results mean ->]
[Find a genetic counselor near you ->]
```

### 6.3 Plain-Language Risk Explanations

For each high-risk result, add a "What does this mean?" section:

**Current:**

```
Cystic Fibrosis  [HIGH]
Gene: CFTR | rsID: rs121908769
Both parents carry at least one copy of the pathogenic allele.
Parent A: carrier | Parent B: carrier
Affected: 25.0%  |  Carrier: 50.0%  |  Normal: 25.0%
```

**Proposed addition:**

```
WHAT THIS MEANS FOR YOUR FAMILY:
Both you and your partner carry one copy of the CFTR gene variant
associated with Cystic Fibrosis. This means:

- Neither of you has the condition (carriers are healthy)
- For each pregnancy, there is a 1 in 4 (25%) chance your child
  could inherit both copies and be affected
- There is a 2 in 4 (50%) chance your child will be a carrier like you
- There is a 1 in 4 (25%) chance your child will not carry the variant

WHAT YOU CAN DO:
- Discuss these results with a genetic counselor
- Additional testing (like CVS or amniocentesis) can determine
  fetal carrier status during pregnancy
- This is one of the most commonly screened conditions in carrier
  panels, and many treatments exist

[Learn more about Cystic Fibrosis ->]
[Find a genetic counselor ->]
```

### 6.4 Visual Risk Communication

Replace raw percentage bars with more intuitive visualizations:

**Option A: Punnett Square Visual**

```
         Parent B
          C    c
     +----+----+
  C  | CC | Cc |  (Affected | Carrier)
     +----+----+
  c  | Cc | cc |  (Carrier  | Normal)
     +----+----+

CC = 25% chance affected
Cc = 50% chance carrier (healthy)
cc = 25% chance normal
```

**Option B: Icon Array (pictogram)**
Show 4 figures: 1 red (affected), 2 yellow (carrier), 1 green (normal)
More intuitive than percentage bars for lay users.

### 6.5 Trait Results Enhancement

Trait results are the "fun" part. Enhance engagement:

- Add comparison context ("Most common eye color worldwide: Brown")
- Show confidence level with explanation ("High confidence: based on single well-studied gene")
- Add "fun facts" for each trait
- Group by "likely" vs "possible" outcomes

---

## 7. Progress Indicators

### Current State

- Single progress bar during analysis: 10% -> 50% -> 100%
- Three text updates: "Screening carrier risk" -> "Predicting offspring traits" -> "Analysis complete"

### Recommended Improvements

#### 7.1 Detailed Analysis Steps

```
Step 1/4: Validating genetic data files...          [=====     ] 25%
          - Checking file format and integrity
          - Counting SNP markers

Step 2/4: Screening carrier risk variants...        [========  ] 50%
          - Comparing against 2,715 disease panel
          - Cross-referencing ClinVar database

Step 3/4: Computing offspring trait predictions...  [==========] 75%
          - Analyzing 79 trait markers
          - Building Punnett square probabilities

Step 4/4: Generating your report...                 [==========] 100%
          - Organizing results by risk level
          - Preparing visualization data
```

#### 7.2 File Upload Validation Steps

After upload, show validation steps:

```
Validating Parent A file...
  [done] File format detected: 23andMe
  [done] SNPs loaded: 45,291
  [done] Genotype quality: 98.7% valid calls
  [done] Panel overlap: 2,412 of 2,715 disease SNPs found (88.8%)
```

This gives users confidence their file was properly processed and sets expectations for analysis coverage.

---

## 8. Educational Content

### 8.1 Genetic Glossary

Add an in-app glossary accessible from any page. Terms to define:

| Term                | Plain Language                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Carrier             | Someone who has one copy of a gene variant. They're healthy but can pass it to children. |
| Autosomal Recessive | A condition that requires two copies (one from each parent) to be affected.              |
| Autosomal Dominant  | A condition that requires only one copy to be affected.                                  |
| X-linked            | A condition linked to the X chromosome, more commonly affecting males.                   |
| SNP                 | A single spot in DNA where people commonly differ (like a "typo" in the genetic code).   |
| Pathogenic Allele   | The gene variant known to cause or contribute to a condition.                            |
| Genotype            | The specific combination of gene variants a person has at a particular location.         |
| Phenotype           | The observable trait or condition that results from a genotype.                          |
| Heterozygous        | Having two different versions of a gene (one from each parent).                          |
| Homozygous          | Having two identical versions of a gene (one from each parent).                          |
| Punnett Square      | A grid used to predict the probability of offspring genotypes.                           |
| Carrier Frequency   | How common it is to carry one copy of a variant in the general population.               |

### 8.2 Contextual Tooltips

Add `st.help()` or custom tooltip icons next to technical terms throughout results:

```python
# Instead of:
st.markdown(f"**Inheritance:** {format_inheritance(d['inheritance'])}")

# Use:
st.markdown(f"**Inheritance:** {format_inheritance(d['inheritance'])} "
            f"<span title='Autosomal Recessive means both parents must "
            f"carry the variant for a child to be affected.'>(?)</span>")
```

### 8.3 "Learn More" Expandable Sections

For each disease in results, add collapsible educational content:

- What is this condition?
- How common is it?
- What are the symptoms?
- Is there treatment?
- What does carrier status mean?
- Link to OMIM, ClinVar, and MedlinePlus

### 8.4 Landing Page Education

The home page assumes users understand genetic testing. Add a section:

```
NEW TO GENETIC TESTING?

Genetic carrier screening checks if you carry gene variants that
could affect your children. Most carriers are completely healthy --
they just have one copy of a gene variant that could cause a condition
if their partner also carries the same variant.

Think of it like a hidden "spelling error" in your DNA. You have two
copies of every gene -- one from each parent. If one copy has the
"error," the other copy usually compensates. But if both parents
pass on the "error," their child could be affected.

[Watch a 2-min explainer video ->]
```

---

## 9. Navigation Flow

### Current Architecture

```
Home -> Products -> Disease Catalog -> Sign In -> Analysis -> Subscription -> About -> Legal -> Account
```

### Issues

1. **Products and Subscription are nearly identical** -- confusing redundancy
2. **Account page** is only reachable if logged in but not in main nav
3. **Disease Catalog** is browsable without auth but Analysis requires auth -- inconsistent
4. **No breadcrumbs or "where am I" indicator** beyond navbar active state
5. **Legal page buried** -- should be accessible from footer, not main nav
6. **About page** doesn't include team info despite description

### Proposed Navigation Architecture

**Primary Nav (always visible):**

```
[Logo] Home | Disease Catalog | Analysis | About  [Theme Toggle]  [Auth/Profile]
```

**Secondary Nav (logged in, in dropdown or account menu):**

```
Account | Subscription | Logout
```

**Footer Nav:**

```
Products & Pricing | Legal | Privacy Policy | Terms of Service | Contact
```

**Changes:**

1. Merge Products into Subscription (or vice versa) -- one pricing page
2. Move Legal to footer-only nav
3. Add Account to user dropdown menu
4. Keep Disease Catalog in primary nav (it's a strong engagement hook)
5. Add "Pricing" as a footer link pointing to subscription

### User Journey Optimization

```
First-time visitor:
  Home -> Disease Catalog (browse) -> Products (see value) -> Sign Up -> Demo/Analysis

Returning user:
  Home -> Sign In -> Analysis -> Results -> (optional) Upgrade
```

---

## 10. Mobile Experience

### Streamlit Mobile Limitations

Streamlit has known limitations on mobile:

- `st.columns()` does not automatically stack on narrow screens
- Multi-column layouts (3-4 cols) become horizontally scrollable on mobile
- `st.dataframe()` requires horizontal scrolling for wide tables
- File upload widgets work but are small touch targets
- Sidebar behavior is inconsistent

### Current Mobile Issues in Mergenix

1. **Home page:** 3-column "How It Works" cards don't stack vertically
2. **Analysis page:** 2-column file upload doesn't stack
3. **Disease Catalog:** 4-column metrics row overflows; dataframe requires scroll
4. **Pricing cards:** 3-column layout doesn't stack
5. **Navbar:** Custom HTML navbar may not collapse into hamburger menu

### Recommended Mobile Improvements

#### 10.1 Responsive Column Strategy

Use CSS media queries in the global theme to override column layouts:

```css
@media (max-width: 768px) {
  /* Force single-column on mobile */
  [data-testid='stHorizontalBlock'] {
    flex-direction: column !important;
  }

  /* Reduce hero text size */
  .hero-section h1 {
    font-size: 2rem !important;
  }

  /* Stack pricing cards */
  .pricing-card {
    margin-bottom: 1rem;
  }

  /* Simplify metrics */
  .catalog-metric {
    padding: 12px !important;
  }
}
```

#### 10.2 Touch Target Sizes

Ensure all interactive elements meet WCAG minimum of 44x44px:

- File upload areas should be larger on mobile
- Buttons should have adequate padding
- Expander headers should have touch-friendly hit areas

#### 10.3 Mobile-First Content Strategy

- Collapse "How It Works" into a vertical stepper on mobile
- Show key metrics as a scrollable horizontal strip
- Use `st.tabs()` instead of `st.columns()` for multi-card layouts on mobile
- Simplify disease catalog to list view (not dataframe) on mobile

---

## 11. Emotional Design

### 11.1 The Anxiety Problem

Genetic test results can be deeply anxiety-inducing. Research from ACOG and NCBI shows:

> "Test results may be deeply troubling for those who receive a diagnosis of a genetic disorder or carrier status, raising fundamental questions of medical vulnerability, as well as personal and social image and identity."

> "Discovery of results without concomitant counseling has the potential to cause considerable patient anxiety."

### 11.2 Current Emotional Issues in Mergenix

1. **Red/alarming styling** for high-risk results (red border, "High Risk" header) without any calming context
2. **No reassurance language** -- results are purely clinical
3. **No "next steps" guidance** -- user gets scary information and is left alone
4. **No genetic counselor referral** -- critical missing feature for a genetic health tool
5. **"Affected" terminology** without explaining what "affected" means in context
6. **Severity badges** (HIGH/MODERATE/LOW) can feel like grades or verdicts

### 11.3 Recommended Emotional Design Patterns

#### A. Result Framing

**Before showing results, set expectations:**

```
BEFORE YOU VIEW YOUR RESULTS

Genetic carrier screening often identifies carrier variants --
this is completely normal. About 1 in 4 people carry at least
one pathogenic variant.

- Being a carrier does NOT mean you or your children will develop
  the condition
- Most carrier results require BOTH parents to carry the same
  variant for offspring risk
- These results are meant to inform, not alarm
- We recommend discussing results with a genetic counselor

[I understand, show my results ->]
```

#### B. High-Risk Result Presentation

Instead of:

```
RED BORDER | HIGH RISK -- Both Parents Carry Variant
```

Use:

```
IMPORTANT FINDING | Both Parents Carry a CFTR Variant

This finding is significant but manageable. Here's what it means
for your family planning, and what steps you can take.
```

**Design changes:**

- Replace red (#ef4444) borders with a softer amber/orange for "needs attention"
- Reserve red only for truly critical, life-threatening findings
- Add a blue "information" icon instead of a red "alert" icon
- Include reassurance text in every high-risk card

#### C. Sensitive Language Guidelines

| Instead of              | Use                                               |
| ----------------------- | ------------------------------------------------- |
| "High Risk"             | "Important Finding" or "Needs Attention"          |
| "Affected" (as a label) | "Both Copies Present" or "Homozygous for Variant" |
| "Carrier Detected"      | "One Copy Found"                                  |
| "Normal"                | "No Variant Detected"                             |
| "Pathogenic allele"     | "Disease-associated variant"                      |
| "Low Risk"              | "No Significant Findings"                         |

#### D. Post-Result Support

After results are displayed, always show:

```
NEXT STEPS FOR YOUR FAMILY

1. REVIEW with a professional
   We recommend discussing these results with a certified
   genetic counselor.
   [Find a genetic counselor near you ->]  (link to NSGC.org)

2. UNDERSTAND the context
   Carrier screening provides probability estimates, not certainties.
   Many factors influence genetic expression.
   [Read our genetic counseling FAQ ->]

3. SAVE your results
   Download a PDF summary to share with your healthcare provider.
   [Download PDF Report ->]

4. ASK questions
   Our support team is here to help.
   [Contact us ->]
```

#### E. Anxiety-Reducing Visual Design

- Use warmer, softer color palette for risk results (amber instead of red)
- Add breathing room (whitespace) between high-risk cards
- Use progressive disclosure (show summary first, details on expand)
- Add gentle transitions (no sudden jarring red blocks)
- Include a small "heart" or "care" icon alongside medical information
- Use sentence case instead of ALL CAPS for severity labels

---

## 12. Competitive Analysis

### 12.1 How 23andMe Presents Results

**Strengths to emulate:**

- Results are presented with extensive educational context
- Each genetic health report includes "What is [condition]?" section
- Risk levels are contextualized ("Typical Risk" vs "Slightly Increased" vs "Increased")
- Results are delivered progressively -- ancestry first (fun), health later (serious)
- Pre-test education is required before viewing health results
- Clear disclaimers about limitations
- Links to scientific studies supporting each result

**Differences to note:**

- 23andMe tests 3 specific BRCA variants; Mergenix screens full panel
- 23andMe uses genotyping; provides instructional language about limitations
- 23andMe separates "Health Predispositions" from "Carrier Status" -- clear taxonomoy

### 12.2 How Color Health Presents Results

**Strengths to emulate:**

- Physician-mediated testing model (more trusted)
- Post-test genetic counseling included for positive results
- Results are actionable: "work with your healthcare provider to create a personalized screening and prevention plan"
- Results clearly distinguish between "clinically actionable" and "informational"

### 12.3 Key Competitive Gaps for Mergenix

| Feature                    | 23andMe       | Color Health       | Mergenix        |
| -------------------------- | ------------- | ------------------ | --------------- |
| Pre-test education         | Required      | Physician explains | None            |
| Result context             | Extensive     | Counselor-provided | Minimal         |
| Plain language             | Excellent     | Excellent          | Technical       |
| Next steps guidance        | Good          | Excellent          | None            |
| Genetic counselor referral | Link provided | Built-in           | None            |
| PDF report                 | Available     | Available          | Not implemented |
| Mobile app                 | Yes           | Yes                | No (web only)   |
| Progressive result reveal  | Yes           | N/A                | No              |

---

## 13. Gamification & Engagement

### 13.1 Current Engagement Features

- None. Users run analysis and leave.

### 13.2 Recommended Engagement Features

#### A. Analysis Dashboard (Priority: P3)

After first analysis, show a persistent dashboard:

```
YOUR ANALYSIS HISTORY

Analysis #1 - Feb 8, 2026
  Parents: Parent A + Parent B
  Diseases Screened: 2,715
  Risk Factors: 3 high, 12 carrier
  Traits Predicted: 47

[View Full Results]  [Share Report]  [Download PDF]
```

#### B. Shareable Reports (Priority: P3)

Generate a shareable link or PDF:

- Summary page with key findings
- Visual trait prediction cards (shareable on social media)
- Punnett square diagrams
- Doctor-ready PDF with full results

#### C. Trait Comparison Cards (Priority: P3)

Fun, shareable cards for trait predictions:

```
+----------------------------------+
|   YOUR OFFSPRING'S EYE COLOR     |
|                                  |
|   [eye icon]                     |
|                                  |
|   Most likely: Brown (75%)       |
|   Possible: Green (18.75%)       |
|   Unlikely: Blue (6.25%)         |
|                                  |
|   Based on: OCA2 gene (rs12913832)|
|   Confidence: HIGH               |
|                                  |
|   [Share]  [Learn More]          |
+----------------------------------+
```

#### D. "What If?" Exploration (Priority: P3)

Allow users to explore hypothetical scenarios:

- "What if only one parent were a carrier?"
- "What's the population carrier frequency?"
- Compare risk with general population averages

#### E. Updates & Notifications (Priority: P3)

For Pro users:

- Email when new diseases are added to the panel
- "Re-analyze" button to run updated analysis with expanded panel
- Newsletter with genetics education content

---

## 14. Prioritized Recommendations

### P0 -- Critical (Must-Have for Launch Quality)

| #   | Recommendation                                                                            | Page(s)                    | Effort | Impact   |
| --- | ----------------------------------------------------------------------------------------- | -------------------------- | ------ | -------- |
| 1   | Add emotional framing before showing high-risk results (pre-result context card)          | analysis.py                | Low    | Critical |
| 2   | Add "What does this mean?" plain-language explanations for each high-risk result          | analysis.py                | Medium | Critical |
| 3   | Add "Next Steps" guidance with genetic counselor referral link after results              | analysis.py                | Low    | Critical |
| 4   | Replace alarming language ("HIGH RISK") with sensitive alternatives ("Important Finding") | analysis.py, components.py | Low    | Critical |
| 5   | Add sample data demo mode so visitors can see results without real genetic data           | analysis.py, home.py       | Medium | Critical |
| 6   | Fix non-functional buttons ("See How It Works", "Forgot password?", ToS links)            | home.py, auth.py           | Low    | Critical |

### P1 -- High Priority (Should-Have)

| #   | Recommendation                                                        | Page(s)                      | Effort | Impact |
| --- | --------------------------------------------------------------------- | ---------------------------- | ------ | ------ |
| 7   | Add inline genetic glossary with tooltips for technical terms         | all result pages             | Medium | High   |
| 8   | Improve file upload error messages with friendly, actionable guidance | analysis.py                  | Low    | High   |
| 9   | Add file format detection and validation step with visual feedback    | analysis.py                  | Medium | High   |
| 10  | Add result summary card ("Key Takeaways") above tabs                  | analysis.py                  | Low    | High   |
| 11  | Add "How to get your DNA data" expandable guide on analysis page      | analysis.py                  | Low    | High   |
| 12  | Merge Products and Subscription pages (reduce redundancy)             | products.py, subscription.py | Low    | Medium |
| 13  | Add welcome flow after first registration                             | auth.py                      | Medium | High   |

### P2 -- Medium Priority (Nice-to-Have)

| #   | Recommendation                                                       | Page(s)            | Effort | Impact |
| --- | -------------------------------------------------------------------- | ------------------ | ------ | ------ |
| 14  | Detailed multi-step progress indicator during analysis               | analysis.py        | Low    | Medium |
| 15  | Mobile responsive CSS overrides for column stacking                  | theme.py           | Medium | Medium |
| 16  | Punnett square visual diagrams for risk results                      | analysis.py        | Medium | Medium |
| 17  | Progressive disclosure wizard for analysis (Step 1/2/3/4)            | analysis.py        | High   | Medium |
| 18  | Add interactive guided tour for first-time users                     | analysis.py        | Medium | Medium |
| 19  | Carrier frequency context ("1 in 25 -- about one per classroom")     | analysis.py        | Low    | Medium |
| 20  | Disease catalog quick-filters ("Common Conditions", "High Severity") | disease_catalog.py | Low    | Medium |

### P3 -- Low Priority (Future Enhancement)

| #   | Recommendation                                | Page(s)          | Effort | Impact |
| --- | --------------------------------------------- | ---------------- | ------ | ------ |
| 21  | Analysis history dashboard with saved results | new page         | High   | Medium |
| 22  | PDF report generation                         | new module       | High   | Medium |
| 23  | Shareable trait prediction cards              | new feature      | Medium | Low    |
| 24  | "What If?" exploration mode                   | analysis.py      | High   | Low    |
| 25  | Team information on About page                | about.py         | Low    | Low    |
| 26  | Cookie consent banner                         | legal.py, app.py | Low    | Low    |
| 27  | In-app account deletion flow                  | account.py       | Medium | Low    |
| 28  | Data export option (GDPR)                     | account.py       | Medium | Low    |
| 29  | Email verification after registration         | auth.py          | Medium | Low    |
| 30  | Video/interactive demo on home page           | home.py          | High   | Medium |

---

## Appendix A: Key Research Sources

- [ACOG - Counseling About Genetic Testing](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/04/counseling-about-genetic-testing-and-communication-of-genetic-test-results) -- Guidelines for sensitive communication of genetic results
- [NCBI - Issues in Genetic Counseling](https://www.ncbi.nlm.nih.gov/books/NBK236049/) -- Emotional impact of carrier status disclosure
- [UXMatters - Designing Calm](https://www.uxmatters.com/mt/archives/2025/05/designing-calm-ux-principles-for-reducing-users-anxiety.php) -- Anxiety-reducing UX patterns
- [23andMe Genetic Health Reports](https://www.23andme.com/test-info/genetic-health/) -- Industry leader result presentation
- [Streamlit Mobile Responsiveness Discussion](https://discuss.streamlit.io/t/streamlit-responsive-ui/34879) -- Known limitations and workarounds
- [IxDF - Progressive Disclosure](https://www.interaction-design.org/literature/topics/progressive-disclosure) -- Best practices for complex information

## Appendix B: Specific Copy Recommendations

### High-Risk Result Card Header

```
Before: "HIGH RISK -- Both Parents Carry Variant"
After:  "Important Finding: Both Parents Carry a [Condition] Variant"
```

### Carrier Result Card Header

```
Before: "Carrier Detected -- One Parent Carries Variant"
After:  "Carrier Status: One Parent Has a [Condition] Variant"
```

### Post-Result CTA

```
Before: (nothing)
After:  "We recommend discussing these results with a genetic counselor.
         Find one near you at findageneticcounselor.com"
```

### Empty State (No Results)

```
Before: "No traits could be predicted."
After:  "Your DNA files don't contain the specific markers for trait prediction.
         This is normal -- different platforms test different SNPs. Your disease
         screening results above are unaffected."
```

### File Upload Error

```
Before: "Invalid file -- KeyError: 'rsid'"
After:  "This file doesn't appear to be a raw DNA data file.
         Please upload the raw data download from your testing provider.
         Need help? See our supported formats guide."
```
