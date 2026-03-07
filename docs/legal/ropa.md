# Record of Processing Activities (ROPA)

**Document Status:** DRAFT  
**Version:** 1.0  
**Date:** 2026-02-20  
**Review Schedule:** Annually or upon significant change in processing activities.

---

## 1. Controller Details

| Role                              | Details                                             |
| :-------------------------------- | :-------------------------------------------------- |
| **Name of Controller**            | Mergenix                                            |
| **Address**                       | [To be completed before GA launch]                  |
| **Contact Email**                 | privacy@mergenix.com                                |
| **Data Protection Officer (DPO)** | Designation Pending (Contact: privacy@mergenix.com) |
| **EU Representative (Art. 27)**   | Designation Pending (Pre-GA)                        |

---

## 2. Processing Activities (Article 30(1))

### 2.1 User Registration & Account Management

| Element                          | Description                                                                                                                                                                                                                                    |
| :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose of Processing**        | Creation and management of user accounts, identity verification (age gating), and service provision.                                                                                                                                           |
| **Categories of Data Subjects**  | Registered Users.                                                                                                                                                                                                                              |
| **Categories of Personal Data**  | - **Identity:** Name, Email Address.<br>- **Authentication:** Password Hash (Bcrypt), OAuth Provider/ID.<br>- **Demographics:** Date of Birth (for Age Verification).<br>- **Account Status:** Tier (Free/Premium/Pro), Email Verified status. |
| **Categories of Recipients**     | - Internal authorised personnel (DevOps/Support).<br>- **Transactional Email Provider:** Resend (Processor).                                                                                                                                   |
| **Transfers to Third Countries** | **USA (Resend):** Covered by EU-U.S. Data Privacy Framework (DPF) or Standard Contractual Clauses (SCCs).                                                                                                                                      |
| **Retention Period**             | Duration of active account + 30 days grace period after closure. Inactive free-tier accounts scheduled for deletion after 3 years of inactivity.                                                                                               |
| **Legal Basis**                  | - **Art 6(1)(b) Contract:** Service provision.<br>- **Art 6(1)(c) Legal Obligation:** Age verification (GDPR Art 8).                                                                                                                           |
| **Security Measures**            | - Hashed passwords.<br>- TLS 1.3 encryption in transit.<br>- Strict access controls.                                                                                                                                                           |

### 2.2 Authentication & Session Security

| Element                          | Description                                                                                                                                                                                          |
| :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose of Processing**        | Securing access to accounts, preventing unauthorized access, and maintaining session state.                                                                                                          |
| **Categories of Data Subjects**  | Registered Users.                                                                                                                                                                                    |
| **Categories of Personal Data**  | - **Credentials:** TOTP Secret (encrypted), Backup Codes (hashed).<br>- **Session Data:** Refresh Token Hash, IP Address, User Agent.<br>- **Security Logs:** Failed login attempts, lockout status. |
| **Categories of Recipients**     | - Internal system logs (Audit).                                                                                                                                                                      |
| **Transfers to Third Countries** | None (Processed internally).                                                                                                                                                                         |
| **Retention Period**             | - **Sessions:** Until expiration (refresh token validity).<br>- **Security Logs:** 2 years (730 days).                                                                                               |
| **Legal Basis**                  | - **Art 6(1)(f) Legitimate Interest:** Network and information security.<br>- **Art 6(1)(b) Contract:** Secure access to service.                                                                    |
| **Security Measures**            | - HttpOnly/Secure Cookies.<br>- Rate limiting.<br>- Token hashing.<br>- 2FA enforcement capabilities.                                                                                                |

### 2.3 Genetic Analysis & Storage (Zero-Knowledge)

| Element                          | Description                                                                                                                                                                                             |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Purpose of Processing**        | Storing analysis results for user access. Analysis logic runs client-side; server stores encrypted blobs.                                                                                               |
| **Categories of Data Subjects**  | Registered Users.                                                                                                                                                                                       |
| **Categories of Personal Data**  | - **Genetic Data:** Encrypted Analysis Result (AES-256-GCM Blob - Opaque to Controller).<br>- **Metadata:** Label, Parent Filenames, Summary Statistics (JSON - Count/Stats only, no raw genetic data). |
| **Categories of Recipients**     | None. The Controller stores the encrypted blob but cannot decrypt it.                                                                                                                                   |
| **Transfers to Third Countries** | None.                                                                                                                                                                                                   |
| **Retention Period**             | Until user deletes the result or closes the account.                                                                                                                                                    |
| **Legal Basis**                  | **Art 9(2)(a) Explicit Consent:** Processing of special category data (Genetic).                                                                                                                        |
| **Security Measures**            | - **Zero-Knowledge Encryption:** Data encrypted client-side; server never sees the key.<br>- AES-256-GCM encryption.<br>- Database access controls.                                                     |

### 2.4 Payment Processing

| Element                          | Description                                                                                                                                                                              |
| :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose of Processing**        | Processing payments for tier upgrades (Premium/Pro).                                                                                                                                     |
| **Categories of Data Subjects**  | Customers (Registered Users).                                                                                                                                                            |
| **Categories of Personal Data**  | - **Transaction:** Stripe Customer ID, Payment Intent ID, Amount, Currency, Status, Tier Granted.<br>- **Note:** Full credit card numbers are **never** processed or stored by Mergenix. |
| **Categories of Recipients**     | - **Payment Processor:** Stripe (Processor).                                                                                                                                             |
| **Transfers to Third Countries** | **USA (Stripe):** Covered by EU-U.S. Data Privacy Framework (DPF).                                                                                                                       |
| **Retention Period**             | 7-10 years (Tax and Financial Statutory Limitation Periods).                                                                                                                             |
| **Legal Basis**                  | - **Art 6(1)(b) Contract:** Processing payment.<br>- **Art 6(1)(c) Legal Obligation:** Tax reporting.                                                                                    |
| **Security Measures**            | - PCI-DSS Compliance (via Stripe Elements).<br>- TLS 1.3.<br>- Webhook signature verification.                                                                                           |

### 2.5 Audit Logging & Accountability

| Element                          | Description                                                                                                                                                                                     |
| :------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose of Processing**        | Monitoring system security, investigating incidents, and demonstrating GDPR compliance.                                                                                                         |
| **Categories of Data Subjects**  | Registered Users.                                                                                                                                                                               |
| **Categories of Personal Data**  | - **Log Data:** User ID, Event Type (e.g., login, consent, export), IP Address, User Agent, Timestamp, Metadata (e.g., "password_change").                                                      |
| **Categories of Recipients**     | - Internal Security/Compliance Team.                                                                                                                                                            |
| **Transfers to Third Countries** | None.                                                                                                                                                                                           |
| **Retention Period**             | - **Orphaned Records** (no linked user): 90 days.<br>- **General Audit Events:** 1 year (365 days).<br>- **Security Events** (login, 2FA, password changes, result access): 2 years (730 days). |
| **Legal Basis**                  | - **Art 6(1)(f) Legitimate Interest:** Security monitoring.<br>- **Art 6(1)(c) Legal Obligation:** Accountability principle (GDPR Art 5(2)).                                                    |
| **Security Measures**            | - Immutable append-only logs.<br>- Access restricted to security admin.                                                                                                                         |

### 2.6 Consent Management

| Element                          | Description                                                                                                                       |
| :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose of Processing**        | Recording and managing user consent for legal compliance.                                                                         |
| **Categories of Data Subjects**  | All Users (Site Visitors & Registered).                                                                                           |
| **Categories of Personal Data**  | - **Consent Record:** User ID (if auth), Consent Type (Terms, Privacy, Cookies, Age), Version, IP Address, User Agent, Timestamp. |
| **Categories of Recipients**     | - Internal Compliance Team.                                                                                                       |
| **Transfers to Third Countries** | None.                                                                                                                             |
| **Retention Period**             | 7 years (Statute of limitations for legal claims / Accountability).                                                               |
| **Legal Basis**                  | **Art 6(1)(c) Legal Obligation:** Demonstrating consent (GDPR Art 7(1)).                                                          |
| **Security Measures**            | - Immutable records.<br>- Database integrity checks.                                                                              |

### 2.7 Transactional Communication

| Element                          | Description                                                                                       |
| :------------------------------- | :------------------------------------------------------------------------------------------------ |
| **Purpose of Processing**        | Sending essential service emails (Verify Email, Reset Password, Receipts, Deletion Confirmation). |
| **Categories of Data Subjects**  | Registered Users.                                                                                 |
| **Categories of Personal Data**  | - **Contact:** Email Address, Name.                                                               |
| **Categories of Recipients**     | - **Email Provider:** Resend (Processor).                                                         |
| **Transfers to Third Countries** | **USA (Resend):** Covered by EU-U.S. DPF or SCCs.                                                 |
| **Retention Period**             | Retained in email provider logs for 30 days; Audit logs for 90 days.                              |
| **Legal Basis**                  | **Art 6(1)(b) Contract:** Necessary for service administration.                                   |
| **Security Measures**            | - TLS encryption.<br>- SPF/DKIM/DMARC email authentication.                                       |

### 2.8 Anonymous Analytics

| Element                          | Description                                                                                              |
| :------------------------------- | :------------------------------------------------------------------------------------------------------- |
| **Purpose of Processing**        | Analyzing platform usage trends to improve service.                                                      |
| **Categories of Data Subjects**  | All Users.                                                                                               |
| **Categories of Personal Data**  | **None.** Data is anonymized at source. (Event Type, Date, Count). No IP, User ID, or Session ID stored. |
| **Categories of Recipients**     | Internal Product Team.                                                                                   |
| **Transfers to Third Countries** | None.                                                                                                    |
| **Retention Period**             | 24 months.                                                                                               |
| **Legal Basis**                  | **Art 6(1)(f) Legitimate Interest:** Business intelligence (using non-personal data).                    |
| **Security Measures**            | - Aggregation.<br>- Anonymization.                                                                       |

---

## 3. Technical & Organisational Security Measures (Article 32)

Mergenix implements the following measures to ensure a level of security appropriate to the risk:

1.  **Encryption:**
    - **At Rest:** AES-256-GCM for sensitive genetic data (Zero-Knowledge Architecture).
    - **In Transit:** TLS 1.3 (HTTPS) enforced for all communications.
    - **Credentials:** Argon2id hashing for passwords; SHA-256 for token hashes.

2.  **Access Control:**
    - Role-Based Access Control (RBAC) for internal staff.
    - Multi-Factor Authentication (MFA) required for administrative access.
    - Principle of Least Privilege applied to all database and API access.

3.  **Availability & Resilience:**
    - Automated daily backups.
    - Redundant infrastructure (if applicable).
    - Rate limiting on all API endpoints to prevent DoS attacks.

4.  **Regular Testing:**
    - Automated security scanning in CI/CD pipelines.
    - Regular vulnerability assessments.
    - Annual review of security policies.

---

## 4. Sub-Processors

| Name             | Service              | Location | Transfer Mechanism |
| :--------------- | :------------------- | :------- | :----------------- | ----------------------------------------------------------- |
| **Stripe, Inc.** | Payment Processing   | USA      | EU-U.S. DPF        |
| **Resend**       | Transactional Email  | USA      | EU-U.S. DPF / SCCs |
| **Google**       | OAuth Authentication | USA      | EU-U.S. DPF        | _(pending — included if Google OAuth is enabled at launch)_ |
