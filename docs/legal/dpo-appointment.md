# DPO Appointment Checklist & Template (L14)

**Version:** 1.0
**Date:** 2026-02-20
**Status:** Draft

## Part 1: DPO Requirement Analysis

### Why Mergenix Requires a DPO (GDPR Art 37(1)(c))

Under the General Data Protection Regulation (GDPR), the appointment of a Data Protection Officer (DPO) is mandatory for organizations in specific circumstances. Mergenix falls under the requirement stipulated in **Article 37(1)(c)**:

> "The core activities of the controller or the processor consist of processing on a large scale of special categories of data pursuant to Article 9..."

**Analysis for Mergenix:**
1.  **Core Activities:** Mergenix's primary service is genetic analysis. The processing of genetic data is not ancillary; it is the central function of the business.
2.  **Special Categories of Data (Article 9):** Genetic data is explicitly defined as a special category of personal data under Article 9(1) GDPR, requiring higher protection.
3.  **Large Scale:** As a B2C platform aiming for a wide user base, Mergenix processes genetic data at a scale that likely exceeds the "individual" or "small local" exemption.

**Conclusion:**
Mergenix **must** appoint a DPO. This role can be filled by a staff member (internal) or fulfilled by a service provider based on a service contract (external/outsourced), as permitted by **Article 37(6)**.

---

## Part 2: DPO Role Requirements (Art 38-39)

The DPO plays a critical role in ensuring GDPR compliance. The position must meet specific legal standards:

### 1. Expertise (Art 37(5))
*   Must have expert knowledge of data protection law and practices.
*   Must have a deep understanding of the specific risks associated with genetic data processing.

### 2. Independence (Art 38(3))
*   **No Conflict of Interest:** The DPO cannot hold a position that determines the *means and purposes* of processing (e.g., CEO, CTO, Head of Marketing, Head of HR).
*   **Protection from Dismissal:** The DPO cannot be dismissed or penalized for performing their tasks.

### 3. Reporting Line (Art 38(3))
*   The DPO must report directly to the highest management level of the controller (e.g., the Board of Directors or CEO).

### 4. Resources (Art 38(2))
*   Mergenix must provide necessary resources (budget, time, access to staff/data) for the DPO to maintain their expert knowledge and perform their duties.

### 5. Tasks (Art 39)
*   **Inform and Advise:** Guide the organization and employees on GDPR obligations.
*   **Monitor Compliance:** Audit processes, awareness-raising, and training of staff involved in processing operations.
*   **Advice on DPIA:** Provide advice regarding the Data Protection Impact Assessment (DPIA) and monitor its performance.
*   **Cooperate with Supervisory Authority:** Act as the contact point for the Data Protection Authority (DPA).
*   **Contact Point for Data Subjects:** Handle inquiries from users regarding their data rights.

---

## Part 3: Appointment Checklist

Use this checklist to track the appointment process.

- [ ] **Identify DPO Candidate**
    - [ ] Determine if Internal (existing employee with no conflict) or External (outsourced DPO service).
    - [ ] *Recommendation for Startups:* External DPO is often more cost-effective and ensures independence.

- [ ] **Verify Qualifications**
    - [ ] Confirm expert knowledge of GDPR.
    - [ ] **Critical:** Verify experience with **Article 9 (Special Category/Genetic Data)** processing.
    - [ ] Check professional certifications (e.g., CIPP/E, CIPM).

- [ ] **Confirm No Conflict of Interest**
    - [ ] Ensure the candidate does not define *how* or *why* data is processed (e.g., not a decision-maker in Marketing, IT, or HR).

- [ ] **Draft Appointment Letter/Contract**
    - [ ] Use the template in Part 4 below.
    - [ ] Define term, duties, and resources.

- [ ] **Formal Appointment**
    - [ ] Sign the appointment letter/contract.
    - [ ] Announce the appointment internally to all staff.

- [ ] **Define Reporting Line**
    - [ ] Establish a direct communication channel to the CEO/Board.

- [ ] **Allocate Budget and Resources**
    - [ ] Approve budget for DPO activities (training, tools, external counsel if needed).

- [ ] **Update Documentation**
    - [ ] Update **Privacy Policy** with DPO contact details (done in `privacy-content.tsx`, verify email `privacy@mergenix.com` is routed correctly).
    - [ ] Update **Internal Data Protection Policy**.

- [ ] **Notify Supervisory Authority (Art 37(7))**
    - [ ] Register the DPO with the relevant Data Protection Authority (e.g., CNIL in France, ICO in UK, DPC in Ireland). *This is a strict legal requirement.*

- [ ] **Publish Contact Details**
    - [ ] Ensure DPO contact info is easily accessible to users (already in Privacy Policy).

- [ ] **Onboarding**
    - [ ] Provide DPO with the **Record of Processing Activities (ROPA)** (from `docs/legal/ropa.md`).
    - [ ] Brief DPO on the **DPIA** (from `docs/legal/dpia.md`).
    - [ ] Integrate DPO into the **Product Development Lifecycle** (Privacy by Design).

---

## Part 4: Appointment Letter Template

**[Company Letterhead]**

**Date:** [Date]

**To:** [Name of DPO / Service Provider]
**Address:** [Address]

**Re: Formal Appointment as Data Protection Officer (DPO)**

Dear [Name],

We are pleased to confirm your appointment as the **Data Protection Officer (DPO)** for **Mergenix** (the "Company"), effective from **[Start Date]**.

This appointment is made pursuant to **Article 37 of the General Data Protection Regulation (GDPR)**.

### 1. Position and Status
You are designated as the DPO for Mergenix. In this capacity, you will operate independently and report directly to the **[highest management level, e.g., Board of Directors / CEO]**.

### 2. Responsibilities (Article 39 GDPR)
Your primary tasks include:
*   Informing and advising the Company and its employees about their obligations under the GDPR and other data protection laws.
*   Monitoring compliance with the GDPR and with the Company’s policies in relation to the protection of personal data, including the assignment of responsibilities, awareness-raising, and training of staff involved in processing operations.
*   Providing advice where requested as regards the Data Protection Impact Assessment (DPIA) and monitoring its performance.
*   Cooperating with the supervisory authority.
*   Acting as the contact point for the supervisory authority on issues relating to processing.
*   Acting as the contact point for data subjects with regard to all issues related to processing of their personal data and to the exercise of their rights.

### 3. Independence and Conflict of Interest
The Company guarantees that:
*   You shall receive no instructions regarding the exercise of these tasks.
*   You shall not be dismissed or penalized by the Company for performing your tasks.
*   You will be involved, properly and in a timely manner, in all issues which relate to the protection of personal data.

You confirm that you currently hold no position and participate in no activity that could create a conflict of interest with your duties as DPO of Mergenix.

### 4. Resources
The Company commits to providing you with the necessary resources and access to personal data and processing operations to maintain your expert knowledge and to carry out the tasks referred to in Article 39.

### 5. Term
This appointment is for an initial term of **[Number]** months/years, subject to the terms of your [Employment Contract / Service Agreement].

Please sign below to accept this appointment.

Sincerely,

_________________________
**[Name of CEO/Director]**
[Title]
Mergenix

**Accepted by:**

_________________________
**[Name of DPO]**
Date: _______________

---

## Part 5: Outsourced DPO Options

For a startup like Mergenix, outsourcing the DPO role ("DPO-as-a-Service") is often the most practical solution. It avoids conflicts of interest inherent in dual roles and provides access to a team of experts.

### Why Outsource?
*   **Cost Efficiency:** Cheaper than a full-time senior hire.
*   **Expertise:** Access to legal and technical privacy experts.
*   **Independence:** Clear separation from business decision-making.
*   **Continuity:** No risk of the DPO leaving and leaving a vacancy.

### Estimated Costs (Startup / Scale-up)
*   **Monthly Retainer:** €500 - €2,000 per month.
    *   *Includes:* Ongoing advice, ROPA maintenance, breach notification support, DPA correspondence.
*   **Hourly Rates (Ad-hoc):** €150 - €300 per hour for specific projects (e.g., deep-dive DPIA review).

### Selection Criteria for Mergenix
When selecting an external DPO, prioritize:
1.  **Genetic Data Experience:** Have they worked with healthtech, biotech, or medtech clients?
2.  **EU Presence:** Ideally located in the EU to interface effectively with DPAs.
3.  **Technical Understanding:** Ability to understand "client-side encryption" and "zero-knowledge architecture."
4.  **Liability Insurance:** Ensure they carry professional indemnity insurance.

### Potential Service Providers (Examples - Non-Endorsement)
*   *Regional law firms with privacy practices.*
*   *Specialized privacy consultancy firms (e.g., DataGuard, VeraSafe, Spirion - verify current offerings).*
