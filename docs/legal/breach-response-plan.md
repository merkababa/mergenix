# Data Breach Response Plan (L11)

**Version:** 1.0
**Date:** 2026-02-20
**Status:** Draft / Pending Board Approval
**Next Review:** 2027-02-20 (Annual)

---

## 1. Incident Response Team (IRT)

The IRT is responsible for executing this plan. In the event of a suspected breach, the **Incident Commander** assumes full authority.

| Role                              | Responsibility                                                                   | Primary Contact                    | Secondary Contact     |
| :-------------------------------- | :------------------------------------------------------------------------------- | :--------------------------------- | :-------------------- |
| **Incident Commander (IC)**       | Overall coordination, final decision on notification, legal liaison.             | CTO / Head of Engineering          | CEO                   |
| **Lead Investigator**             | Technical forensics, root cause analysis, evidence preservation.                 | Senior Security Engineer           | Lead Backend Engineer |
| **Data Protection Officer (DPO)** | GDPR compliance, regulatory communication (DPA), subject notification oversight. | Designated DPO (External/Internal) | Legal Counsel         |
| **Communications Lead**           | Public relations, drafting notifications, media handling (if >500 users).        | Head of Marketing                  | CEO                   |
| **Legal Counsel**                 | Legal privilege, liability assessment, insurance notification.                   | External Counsel                   | COO                   |

---

## 2. Detection & Classification

### Detection Channels

- **Automated Alerts:** Infrastructure monitoring (CPU/RAM spikes), IDS/IPS alerts, database anomaly detection (e.g., mass `SELECT` on `users` table).
- **Internal Reports:** Employee reports via internal ticketing/Slack (`#security-incidents`).
- **External Reports:** Bug bounty submissions, user support tickets, law enforcement inquiries.
- **Audit Anomalies:** Spikes in `login_failed` or `result_viewed` events in `audit_log` table.

### Severity Classification

| Level                | Description                                                                           | Examples                                                                | Response Time                    |
| :------------------- | :------------------------------------------------------------------------------------ | :---------------------------------------------------------------------- | :------------------------------- |
| **SEV-3 (Low)**      | Non-sensitive data exposure; internal policy violation; no customer impact.           | Employee laptop lost (encrypted); minor misconfiguration.               | Investigate within 24h.          |
| **SEV-2 (Medium)**   | Potential exposure of limited PII (e.g., email addresses); no genetic/financial data. | Phishing attempt targeting staff; accidentally public S3 bucket (logs). | **IMMEDIATE** (Start 72h clock). |
| **SEV-1 (Critical)** | Confirmed exposure of Special Category Data (genetic), secrets, or payment info.      | SQL injection; Admin key leak; Stripe API key exposure; ZKE bypass.     | **IMMEDIATE** (War Room).        |

---

## 3. Containment (Immediate Actions)

_Goal: Stop the bleeding. Do not destroy evidence._

1.  **Isolate Affected Systems:**
    - Take affected services offline if necessary (Maintenance Mode).
    - Rotate compromised credentials (AWS keys, DB passwords, Stripe API keys).
    - Block malicious IP addresses at WAF/Cloudflare level.
    - Revoke active user sessions (`DELETE FROM sessions WHERE ...`).

2.  **Preserve Evidence:**
    - **Do not reboot** servers unless absolutely necessary.
    - Snapshot disk volumes (EBS snapshots) of affected instances.
    - Preserve logs (access logs, audit logs, database logs) to a secure, write-once location (e.g., S3 Object Lock).

3.  **Mobilize:**
    - IC declares incident level.
    - Open secure communication channel (e.g., Signal group or dedicated distinct Slack workspace) to prevent attacker monitoring.

---

## 4. Assessment (The "High Risk" Determination)

_Requirement: Determine if GDPR Art 33/34 or FTC Rules apply._

The IRT must answer:

1.  **What data was accessed?**
    - _User Data:_ Emails, names, hashed passwords (Argon2id), DOB.
    - _Genetic Data:_ Encrypted blobs (ZKE)? Summary JSON (plaintext)?
    - _Payment Data:_ Stripe Customer IDs, transaction history.
2.  **Was the data encrypted?**
    - If **ZKE** (Zero-Knowledge Encryption) held, and the _client_ password was NOT compromised, the genetic data is unintelligible. **This may negate "High Risk" status under GDPR Art 34.**
3.  **Who is affected?**
    - Count distinct `user_id`s from audit logs.
    - Determine geographic distribution (EU vs. US users).

**Risk Assessment Matrix:**

- **Genetic Data (Encrypted):** Moderate Risk (Metadata leak).
- **Genetic Data (Decrypted/Key Compromise):** **EXTREME RISK** (Permanent harm, unchangeable biometric).
- **Emails/Passwords:** High Risk (Credential stuffing).

---

## 5. Notification Templates

### A. Supervisory Authority (GDPR Art 33)

_To be sent within 72 hours to the relevant DPA (e.g., ICO in UK, DPC in Ireland)._

> **Subject:** Preliminary Data Breach Notification - Mergenix
>
> **To:** [Supervisory Authority Contact]
>
> Pursuant to Article 33 of the GDPR, Mergenix is notifying you of a personal data breach detected on [Date].
>
> **Nature of Breach:** [e.g., Unauthorized access to database backup]
> **Categories of Data:** [e.g., User emails, encrypted genetic analysis metadata]
> **Approx. Number of Subjects:** [Number]
> **Consequences:** [e.g., Risk of phishing, no exposure of raw genetic data due to client-side encryption]
> **Measures Taken:** [e.g., Vulnerability patched, keys rotated, forced password reset]
> **DPO Contact:** privacy@mergenix.com
>
> We will provide a follow-up report within 30 days as investigation continues.

### B. Data Subjects (GDPR Art 34 / FTC)

_To be sent if "High Risk" (GDPR) or generally required (FTC)._

> **Subject:** IMPORTANT: Security Notice Regarding Your Mergenix Account
>
> Dear [Name],
>
> We are writing to inform you of a security incident that may have involved your personal information.
>
> **What Happened?**
> On [Date], we detected unauthorized access to...
>
> **What Information Was Involved?**
>
> - Email address and name.
> - [IF APPLICABLE]: Encrypted analysis results (Note: These remain encrypted with your password, which was NOT compromised).
> - **We do not store raw DNA files, so your genetic source data was NOT exposed.**
>
> **What We Are Doing:**
> We have patched the vulnerability, alerted law enforcement, and...
>
> **What You Can Do:**
>
> - Change your password immediately.
> - Enable 2FA if you haven't already.
> - Be vigilant against phishing emails.
>
> **For More Information:**
> Visit [Status Page Link] or contact privacy@mergenix.com.

_Per GDPR Art 33(4), if not all information is available at the time of notification, it may be provided in phases without undue delay._

### C. FTC Notification (Health Breach Notification Rule)

_Required if >500 records. Web form submission usually required._

> [Standard Form Fields]
> **Entity:** Mergenix
> **Breach Type:** Hacking/IT Incident
> **Location of Breached Information:** Server/Cloud
> **Number of People Affected:** [Number]
> **Brief Description:** Unauthorized access to cloud storage containing user records...

---

## 6. Timeline (First 72 Hours)

| Time      | Action                                                                                | Owner             |
| :-------- | :------------------------------------------------------------------------------------ | :---------------- |
| **T+0h**  | Breach detected/reported. Ticket opened.                                              | Discoverer        |
| **T+1h**  | IC declares SEV-1. IRT assembled. Containment begins.                                 | IC                |
| **T+4h**  | Forensic copy of logs secured. Vulnerability patched.                                 | Lead Investigator |
| **T+12h** | Preliminary scope assessment (How many users? What data?). Legal consultation.        | DPO / Legal       |
| **T+24h** | **Draft DPA Notification (GDPR).** Even if incomplete, prep for 72h deadline.         | DPO               |
| **T+48h** | Finalize affected user list. Prepare communications strategy.                         | Comms Lead        |
| **T+72h** | **SUBMIT DPA NOTIFICATION** (if applicable). Launch user notification (if high risk). | IC / DPO          |

---

## 7. Post-Incident

1.  **Post-Mortem Review:** Conducted within 5 business days.
    - Root cause analysis (5 Whys).
    - What went well? What failed?
2.  **Report:** Formal "Incident Report" written and stored.
3.  **Policy Updates:** Update this plan, Privacy Policy, or Engineering Guidelines based on lessons learned.
4.  **Audit:** If significant, engage 3rd party security firm for penetration test.

---

## 8. Special Considerations for Genetic Data

- **Lifetime Sensitivity:** Unlike a credit card, a genome cannot be changed. Breach of decrypted genetic data is catastrophic.
- **Familial Impact:** Re-identification of one user can impact their biological relatives.
- **Zero-Knowledge Defense:** In all communications, emphasize **Zero-Knowledge Encryption (ZKE)**. If the server was breached but not the client (user), the genetic data is mathematically inaccessible. This is our primary defense against "High Risk" classification under GDPR.
- **Sub-processors:** If the breach originated at **Stripe** or **Resend**, coordination with their security teams is mandatory.

---

## 9. Contact List

- **Supervisory Authority (Lead):** [Insert Country DPA Info]
- **US FTC:** [FTC Complaint Assistant Link]
- **Cyber Insurance:** [Provider Name / Policy # / Hotline]
- **External Counsel:** [Firm Name / Partner Phone]
- **Forensic Firm:** [Retainer Firm Name / Hotline]
