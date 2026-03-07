# Mergenix Security Audit Report

**Date:** 2026-02-08
**Auditor:** Security Auditor Agent
**Scope:** Full codebase security review -- auth, payments, file parsing, secrets management, regulatory compliance
**Risk Rating Scale:** CRITICAL / HIGH / MEDIUM / LOW / INFO

---

## Executive Summary

Mergenix is a Streamlit-based genetic offspring analysis platform that handles **highly sensitive genetic data** -- a special category under GDPR Article 9 and regulated under GINA in the US. The application has a basic authentication system, payment integration (Stripe + PayPal), and file upload/parsing for 4 genetic formats.

**Overall Security Posture: MODERATE RISK**

The application has some good security foundations (bcrypt password hashing, OAuth CSRF protection, input validation) but has several significant vulnerabilities that must be addressed before handling real genetic data in production, particularly around data storage, access control enforcement, and regulatory compliance.

### Finding Summary

| Severity | Count | Description                                                                                                                                                                              |
| -------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRITICAL | 3     | Plaintext JSON user database, no file locking (race conditions), HIPAA compliance claims without implementation                                                                          |
| HIGH     | 6     | No session token binding, tier bypass via session manipulation, no webhook signature verification (PayPal), no audit logging, no encryption at rest, resource exhaustion via file upload |
| MEDIUM   | 7     | Weak email validation, no password history, 82 unsafe_allow_html usages, no CSP headers, missing rate limiting on registration, open redirect potential, no account lockout notification |
| LOW      | 4     | Session timeout too long for health data, no special char in password requirement, missing `paypalrestsdk` in requirements.txt, no secure cookie flags                                   |
| INFO     | 3     | HIPAA compliance marketing vs reality, dependency version pinning, Streamlit security model limitations                                                                                  |

---

## CRITICAL Findings

### C1. Plaintext JSON File as User Database

**File:** `Source/auth/manager.py:40-51`
**Severity:** CRITICAL
**OWASP:** A02:2021 - Cryptographic Failures / A05:2021 - Security Misconfiguration

The user database is a plaintext JSON file (`data/users.json`) stored on the local filesystem. While password hashes use bcrypt (good), the file itself is:

- **Not encrypted at rest** -- anyone with filesystem access can read all user data
- **Not access-controlled** -- standard filesystem permissions only
- **Vulnerable to corruption** -- no file locking, no atomic writes
- **Not suitable for HIPAA** -- no audit trail for data access, no encryption

```python
# Current: plaintext JSON read/write
def _load_users(self) -> dict:
    with open(self.users_file) as f:
        return json.load(f)

def _save_users(self, users: dict) -> None:
    with open(self.users_file, 'w') as f:
        json.dump(users, f, indent=2)
```

**Impact:** Complete exposure of user emails, names, tier status, OAuth IDs, and login history if the server is compromised. The file can be read by any process on the system.

**Remediation:**

- Migrate to a proper database (PostgreSQL with Supabase, or SQLite with encryption at minimum)
- If JSON must remain for MVP, encrypt the file at rest using `cryptography.fernet`
- Add file-level permissions (chmod 600 on Unix)
- Never store `data/users.json` in version control (already in `.gitignore` guidance but not enforced)

---

### C2. Race Condition in User Data File Operations

**File:** `Source/auth/manager.py:40-51`
**Severity:** CRITICAL
**OWASP:** A04:2021 - Insecure Design

The `_load_users()` and `_save_users()` methods have no file locking. In a multi-user Streamlit deployment (multiple browser sessions, multiple Streamlit workers), concurrent reads and writes can:

1. **Lose user data** -- two concurrent registrations could overwrite each other
2. **Corrupt the JSON file** -- partial writes during concurrent access
3. **Create inconsistent state** -- failed login counter could be reset by a concurrent write

```python
# Dangerous pattern: load-modify-save without locking
def record_failed_login(self, email: str) -> bool:
    users = self._load_users()           # Thread A reads
    # ... Thread B also reads, modifies, saves ...
    users[email]["failed_login_attempts"] = ...
    self._save_users(users)              # Thread A saves, overwriting B's changes
```

**Impact:** Data loss, account lockout bypass, corrupted user database.

**Remediation:**

- Use `fcntl.flock()` (Unix) or `msvcrt.locking()` (Windows) for file-level locking
- Better: migrate to SQLite (built-in locking) or a proper database
- Use atomic write pattern (write to temp file, then rename)

```python
import tempfile, os

def _save_users(self, users: dict) -> None:
    dir_name = os.path.dirname(self.users_file)
    with tempfile.NamedTemporaryFile(
        mode='w', dir=dir_name, suffix='.tmp', delete=False
    ) as tmp:
        json.dump(users, tmp, indent=2)
        tmp_path = tmp.name
    os.replace(tmp_path, self.users_file)  # atomic on most OSes
```

---

### C3. False HIPAA Compliance Claims

**File:** `pages/auth.py:265`, `pages/home.py:74`, `pages/legal.py:59-70`
**Severity:** CRITICAL (Legal/Regulatory)

The application claims "HIPAA Compliant" in the auth page footer and "HIPAA Principles" on the home page, but the implementation **does not meet HIPAA requirements**:

1. **No encryption at rest** -- user data stored in plaintext JSON
2. **No audit logging** -- zero audit trail for data access (HIPAA requires 6-year retention)
3. **No BAA (Business Associate Agreement)** with any service provider
4. **No access controls** -- no role-based access, no minimum necessary principle
5. **No data integrity controls** -- no checksums, no tamper detection
6. **No breach notification system**
7. **No data backup/recovery plan**

The legal page does include a disclaimer that Mergenix is "an educational tool and not a covered entity under HIPAA," but the auth page footer flatly states "HIPAA Compliant" with a lock icon -- this is misleading and could create legal liability.

**Impact:** Potential FTC enforcement action for deceptive practices. Legal liability if users rely on the HIPAA compliance claim and their genetic data is breached.

**Remediation:**

- **Immediately** change "HIPAA Compliant" to "Designed with privacy in mind" or "Follows HIPAA best practices" with clear disclaimers
- If pursuing actual HIPAA compliance, implement: encryption at rest, audit logging, access controls, BAA agreements, breach notification procedures
- Add a prominent disclaimer: "This is an educational tool. Not intended for clinical use."

---

## HIGH Findings

### H1. No Session Token Binding / Session Fixation Risk

**File:** `Source/auth/session.py:14-36`
**Severity:** HIGH
**OWASP:** A07:2021 - Identification and Authentication Failures

Sessions are stored in Streamlit's `st.session_state` with a random token, but:

1. **No IP binding** -- session is valid from any IP address
2. **No user-agent binding** -- no browser fingerprint validation
3. **Token comparison is not constant-time** in `validate_session()` (line 53: `stored_token != token` uses Python string comparison)
4. **Session token is generated but never actually validated on subsequent requests** -- `helpers.py` sets session state directly without using the session module

```python
# In helpers.py - bypasses session.py entirely:
st.session_state["authenticated"] = True
st.session_state["user"] = user_data
# ... no call to create_session()
```

```python
# In session.py - token comparison not constant-time:
if stored_token != token:  # timing attack possible
    return None
```

**Impact:** Session can be hijacked if session token is leaked. The dual session creation paths (helpers.py vs session.py) mean the session module's protections are often bypassed.

**Remediation:**

- Use `secrets.compare_digest()` for token comparison (already used in OAuth, but not in session validation)
- Bind sessions to IP + User-Agent hash
- Ensure ALL auth paths go through `create_session()` -- remove the direct session state manipulation in `helpers.py`
- Add session rotation on privilege changes (login, tier upgrade)

---

### H2. Tier/Access Control Bypass via Session State Manipulation

**File:** `pages/analysis.py:287-288`, `pages/auth.py:167-171`
**Severity:** HIGH
**OWASP:** A01:2021 - Broken Access Control

The user's tier is stored in `st.session_state["user_tier"]` and read directly from session state for access control decisions. Streamlit session state can be manipulated via:

1. **Session state is set from user data at login** but never re-validated against the server-side user database on subsequent requests
2. A user could potentially modify their tier in session state (e.g., via browser developer tools with Streamlit's websocket connection) to bypass tier restrictions

```python
# In analysis.py -- tier read from session state, not re-verified:
user_tier = current_user.get("tier", TierType.FREE.value)
tier_config = get_tier_config(TierType(user_tier))
# ... disease_limit and trait_limit derived from potentially tampered tier
```

**Impact:** Free-tier users could potentially access Pro-tier features (all 2,715 diseases, all 79 traits) without paying.

**Remediation:**

- On every page load, re-verify the user's tier from the server-side database (the JSON file or future database)
- Add server-side tier validation in `analyze_carrier_risk()` and `run_trait_analysis()`
- Never trust client-side session state for authorization decisions

```python
# Recommended pattern:
def get_verified_tier(email: str) -> str:
    auth_manager = AuthManager()
    user = auth_manager.get_user(email)
    if user:
        return user.get("tier", "free")
    return "free"
```

---

### H3. PayPal Webhook Missing Signature Verification

**File:** `Source/payments/paypal_handler.py:267-352`
**Severity:** HIGH
**OWASP:** A08:2021 - Software and Data Integrity Failures

The Stripe webhook handler correctly verifies the webhook signature (`stripe.Webhook.construct_event(payload, sig_header, webhook_secret)` at line 364), but the PayPal webhook handler **does not verify the webhook signature at all**:

```python
# PayPal handler -- NO signature verification:
def handle_webhook(self, payload: dict) -> dict:
    if not payload:
        raise ValueError("Webhook payload is required")
    event_type = payload.get("event_type")
    # ... processes events without verifying they came from PayPal
```

**Impact:** An attacker could forge webhook events to:

- Activate premium features without payment (`BILLING.SUBSCRIPTION.ACTIVATED`)
- Prevent cancellation from taking effect
- Manipulate subscription status

**Remediation:**
PayPal provides webhook signature verification. Add it:

```python
from paypalrestsdk.notifications import WebhookEvent

def handle_webhook(self, payload: dict, headers: dict, webhook_id: str) -> dict:
    # Verify webhook signature
    verified = WebhookEvent.verify(
        transmission_id=headers.get('PAYPAL-TRANSMISSION-ID'),
        timestamp=headers.get('PAYPAL-TRANSMISSION-TIME'),
        webhook_id=webhook_id,
        event_body=json.dumps(payload),
        cert_url=headers.get('PAYPAL-CERT-URL'),
        actual_sig=headers.get('PAYPAL-TRANSMISSION-SIG'),
        auth_algo=headers.get('PAYPAL-AUTH-ALGO'),
    )
    if not verified:
        raise ValueError("Invalid PayPal webhook signature")
    # ... proceed with processing
```

---

### H4. No Audit Logging

**Files:** `Source/auth/manager.py`, `Source/auth/session.py`, `Source/payments/`
**Severity:** HIGH
**OWASP:** A09:2021 - Security Logging and Monitoring Failures

The authentication module has **zero logging**. There is no audit trail for:

- Successful/failed login attempts (critical for detecting brute force)
- User registrations
- Password changes
- Tier changes / payment events
- Account lockouts
- OAuth authentication events
- Session creation/invalidation
- Data access events (who accessed which genetic data)

The payment handlers use Python `logging` module, but the auth system does not.

**Impact:** Cannot detect brute force attacks, account compromise, unauthorized access, or data breaches. HIPAA requires audit logs with 6-year retention. GINA compliance requires ability to demonstrate non-discriminatory access patterns.

**Remediation:**

- Add structured logging to all auth events
- Store audit logs in a tamper-resistant format (append-only file, separate database table)
- Log at minimum: timestamp, event_type, user_email, IP_address, success/failure, details
- Implement log rotation and retention policy

---

### H5. No Encryption at Rest for Genetic Data

**File:** `pages/analysis.py:243-260`
**Severity:** HIGH
**OWASP:** A02:2021 - Cryptographic Failures

Uploaded genetic files are parsed in-memory (good -- not stored to disk permanently), but:

1. **Parsed SNP data is stored in `st.session_state`** which persists for the session duration (up to 60 minutes)
2. **Analysis results (carrier status, trait predictions) are also stored in session state**
3. Streamlit session state is stored in server memory -- if the server is compromised, all active sessions' genetic data is exposed
4. **No option to delete/clear genetic data after analysis** -- users cannot request immediate data deletion

**Impact:** Genetic data remains in server memory for up to 60 minutes after upload. In a shared hosting environment, this data could be accessible to other processes.

**Remediation:**

- Add a "Clear My Data" button that immediately removes all genetic data from session state
- Minimize the time genetic data is held in memory
- Consider encrypting session data at rest if using persistent session storage
- Document data retention policy clearly

---

### H6. Resource Exhaustion via File Upload

**File:** `Source/parser.py` (entire file), `pages/analysis.py:231-236`
**Severity:** HIGH
**OWASP:** A05:2021 - Security Misconfiguration

The file parser reads the **entire file content into memory** at once:

```python
def _read_file_content(file: str | Path | BinaryIO) -> str:
    # ... reads entire file into a string
    content = file.getvalue().decode('utf-8')
```

While Streamlit has a default 200MB upload limit, there are no application-level checks:

1. **No file size limit enforced** in the parser -- a malicious user could upload a very large file
2. **The entire file is read into memory as a string**, then split into lines, then iterated -- for a 200MB file, this could use 600MB+ RAM (string + lines list + SNP dictionary)
3. **No timeout on parsing** -- a specially crafted file with millions of valid-looking lines could cause CPU exhaustion
4. **VCF files can be enormous** (whole genome VCF files can be 5-50GB, though Streamlit's upload limit caps this)

**Impact:** Denial of service -- a single large upload could exhaust server memory and crash the application for all users.

**Remediation:**

- Add an explicit file size check before parsing (e.g., 50MB max for genetic data files)
- Consider streaming/line-by-line parsing instead of reading entire file into memory
- Add a maximum line count limit (e.g., 10M SNPs is more than any consumer test produces)
- Add parsing timeout

```python
MAX_FILE_SIZE_MB = 50
MAX_SNP_COUNT = 10_000_000

def parse_genetic_file(file, max_size_mb=MAX_FILE_SIZE_MB):
    if isinstance(file, BytesIO):
        if len(file.getvalue()) > max_size_mb * 1024 * 1024:
            raise ValueError(f"File exceeds {max_size_mb}MB limit")
    # ... proceed with parsing
```

---

## MEDIUM Findings

### M1. Weak Email Validation

**File:** `Source/auth/validators.py:7-27`
**Severity:** MEDIUM
**OWASP:** A03:2021 - Injection

The email validation is extremely basic:

```python
def validate_email(email: str) -> tuple[bool, str]:
    if not email or '@' not in email:
        return False, "Invalid email format"
    parts = email.split('@')
    if len(parts) != 2:
        return False, "Invalid email format"
    if '.' not in parts[1]:
        return False, "Invalid email format"
    return True, ""
```

This accepts malformed emails like:

- `"user@domain.c"` (1-char TLD)
- `"@domain.com"` (empty local part)
- `"user@.com"` (empty domain)
- `"user@domain..com"` (double dot)
- Emails with spaces, control characters, or SQL injection payloads in the local part

**Impact:** Could lead to account confusion, email delivery failures, or potential injection if email is used in other contexts.

**Remediation:**
Use a proper email validation library or at minimum add stricter checks:

```python
import re

EMAIL_REGEX = re.compile(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
)

def validate_email(email: str) -> tuple[bool, str]:
    if not email or not EMAIL_REGEX.match(email):
        return False, "Invalid email format"
    if len(email) > 254:  # RFC 5321
        return False, "Email address too long"
    return True, ""
```

---

### M2. No Password History / Password Reuse Prevention

**File:** `Source/auth/manager.py:298-329`
**Severity:** MEDIUM
**OWASP:** A07:2021 - Identification and Authentication Failures

The `change_password()` method allows users to set a new password identical to the old one, and there is no password history to prevent cycling through passwords.

**Impact:** Users can "change" their password to the same value, defeating the purpose of password rotation policies.

**Remediation:**

- Check that new password differs from the old one
- Store last N password hashes to prevent reuse

---

### M3. Extensive Use of `unsafe_allow_html=True` (82 instances)

**Files:** 14 files across `pages/` and `Source/ui/`
**Severity:** MEDIUM
**OWASP:** A03:2021 - Injection (XSS)

There are **82 instances** of `unsafe_allow_html=True` across the codebase. While most render static HTML, several interpolate user-provided data:

```python
# pages/account.py:48 -- user name directly in HTML:
f"{user.get('name', 'U')[0].upper()}</div>"

# pages/auth.py:89 -- user name and email in HTML:
f"Logged in as **{user.get('name', 'User')}** ({user.get('email', '')})"

# pages/analysis.py -- disease descriptions from JSON in HTML:
f"<p style='...'>{r['description']}</p>"
```

While user names go through minimal validation (2+ chars), the disease descriptions come from a JSON file that could be tampered with. More importantly, if user names or emails contain HTML/script tags, they would be rendered.

**Impact:** Stored XSS if a user registers with a name like `<script>alert('xss')</script>`. Disease data XSS if the JSON file is tampered with.

**Remediation:**

- HTML-escape all user-provided data before interpolation into HTML strings
- Use `html.escape()` for all dynamic values in `unsafe_allow_html` contexts
- Audit all 82 instances and classify which interpolate dynamic data

```python
import html

# Safe interpolation:
safe_name = html.escape(user.get('name', 'User'))
st.markdown(f"<h3>{safe_name}</h3>", unsafe_allow_html=True)
```

---

### M4. No Content Security Policy (CSP) Headers

**File:** `app.py` (no CSP configuration)
**Severity:** MEDIUM
**OWASP:** A05:2021 - Security Misconfiguration

Streamlit does not set restrictive CSP headers by default. The application uses extensive `unsafe_allow_html=True` with inline styles and potential inline scripts (e.g., the meta-refresh redirect in OAuth).

**Impact:** If XSS is achieved (see M3), lack of CSP means JavaScript can execute freely, exfiltrate data, or hijack sessions.

**Remediation:**

- While Streamlit has limited CSP control, add a `.streamlit/config.toml` with security settings
- Consider adding CSP headers via a reverse proxy (nginx/Cloudflare) in production
- Minimize inline scripts and styles

---

### M5. No Rate Limiting on Registration

**File:** `Source/auth/manager.py:66-113`
**Severity:** MEDIUM
**OWASP:** A07:2021 - Identification and Authentication Failures

Login has rate limiting (5 attempts, 30-minute lockout), but **registration has no rate limiting**. An attacker could:

1. Create thousands of accounts to exhaust disk space (JSON file growth)
2. Use email enumeration (different error messages for "already registered" vs other errors)
3. Pollute the user database

**Impact:** Resource exhaustion, user database pollution, potential email enumeration.

**Remediation:**

- Add CAPTCHA or equivalent to registration
- Rate limit registration by IP (Streamlit doesn't expose client IP easily, but a reverse proxy can)
- Use generic error messages that don't reveal whether an email is already registered

---

### M6. Open Redirect Potential via `auth_redirect`

**File:** `pages/auth.py:60-61`, `pages/analysis.py:46`
**Severity:** MEDIUM
**OWASP:** A01:2021 - Broken Access Control

The `auth_redirect` session state value is set before redirecting to auth and used after authentication to redirect back:

```python
# In analysis.py:
st.session_state["auth_redirect"] = "pages/analysis.py"

# In auth.py after login:
redirect = st.session_state.pop("auth_redirect", "pages/analysis.py")
st.switch_page(redirect)
```

While `st.switch_page()` only supports internal pages (mitigating external open redirect), if an attacker can set `auth_redirect` to an unexpected internal page, they could redirect users to confusing or malicious-looking internal content.

**Impact:** Low risk due to Streamlit's `switch_page` restrictions, but should still validate the redirect target.

**Remediation:**

- Whitelist allowed redirect targets
- Validate that `auth_redirect` matches a known page path

---

### M7. No Account Lockout Notification

**File:** `Source/auth/manager.py:230-264`
**Severity:** MEDIUM
**OWASP:** A07:2021 - Identification and Authentication Failures

When an account is locked out after 5 failed attempts, the user receives no notification (email or in-app) that their account was targeted. The lockout also silently returns `False, None` -- the same response as an invalid email, making it impossible for the user to distinguish between:

- Wrong password
- Locked account
- Non-existent account

**Impact:** Users may not know their account is under attack. The uniform error response is good for security (prevents enumeration) but bad for usability.

**Remediation:**

- Send an email notification when an account is locked out (if email service is configured)
- Display a generic message like "Too many failed attempts. Please try again later." when locked out (distinct from wrong password)
- Log lockout events for monitoring

---

## LOW Findings

### L1. Session Timeout Too Long for Health Data

**File:** `Source/auth/session.py:11`
**Severity:** LOW

Session timeout is set to 60 minutes. For applications handling health/genetic data, HIPAA recommends 15 minutes of inactivity. The AUTH_REDESIGN_PLAN.md document even specifies 15 minutes as the target.

**Remediation:** Reduce `SESSION_TIMEOUT` to 15 minutes for compliance with health data best practices.

---

### L2. No Special Character Requirement in Password

**File:** `Source/auth/validators.py:30-48`
**Severity:** LOW

Password validation requires uppercase, lowercase, and digit but no special characters. The `get_password_strength()` function rewards special characters but `validate_password()` does not require them.

**Remediation:** Add special character requirement or increase minimum length to compensate (12+ chars).

---

### L3. Missing `paypalrestsdk` in requirements.txt

**File:** `requirements.txt`
**Severity:** LOW

`paypalrestsdk` is imported in `Source/payments/paypal_handler.py` but not listed in `requirements.txt`. This could cause import errors in clean deployments.

**Remediation:** Add `paypalrestsdk>=1.13.0` to `requirements.txt`.

---

### L4. No Secure Cookie/Transport Configuration

**File:** `app.py`, `.streamlit/config.toml` (not found)
**Severity:** LOW

No `.streamlit/config.toml` was found. Streamlit should be configured with:

- HTTPS enforcement in production
- Secure cookie flags
- CORS restrictions

**Remediation:** Create `.streamlit/config.toml` with security-hardened settings for production.

---

## INFO Findings

### I1. GINA (Genetic Information Nondiscrimination Act) Considerations

Mergenix processes genetic data which falls under GINA protection in the US. Key requirements:

- Genetic information cannot be used for employment or health insurance discrimination
- Users should be informed of their GINA rights
- Terms of Service should address genetic data specifically
- Consider adding a GINA notice to the consent flow

### I2. Dependency Version Pinning

`requirements.txt` uses minimum version constraints (`>=`) rather than pinned versions. This is acceptable for development but production deployments should use pinned versions (via `pip freeze` or a lock file) to prevent supply chain attacks via compromised future versions.

### I3. Streamlit Security Model Limitations

Streamlit was designed for data science prototyping, not production healthcare applications. Inherent limitations:

- No built-in CSRF protection (relies on same-origin policy)
- Limited control over HTTP headers
- No built-in rate limiting
- Session state is server-side memory only (not cryptographically protected)
- WebSocket-based communication adds attack surface

For production deployment, consider:

- Placing behind a reverse proxy (nginx/Caddy) with WAF capabilities
- Using Streamlit Community Cloud or a container with resource limits
- Adding CloudFlare or similar for DDoS protection

---

## Regulatory Compliance Assessment

### HIPAA

| Requirement           | Status                                | Gap                                        |
| --------------------- | ------------------------------------- | ------------------------------------------ |
| Encryption at rest    | Not implemented                       | User data in plaintext JSON                |
| Encryption in transit | Partial (HTTPS depends on deployment) | No HSTS header                             |
| Access controls       | Minimal                               | No role-based access, tier bypass possible |
| Audit logging         | Not implemented                       | Zero audit trail                           |
| Data integrity        | Not implemented                       | No checksums, no tamper detection          |
| Breach notification   | Not implemented                       | No detection or notification system        |
| BAA agreements        | Not implemented                       | No agreements with service providers       |
| Risk assessment       | This document                         | First formal assessment                    |

**Verdict:** NOT HIPAA COMPLIANT. Remove "HIPAA Compliant" claims immediately.

### GDPR Article 9 (Genetic Data)

| Requirement       | Status          | Gap                                                   |
| ----------------- | --------------- | ----------------------------------------------------- |
| Explicit consent  | Partial         | Terms checkbox exists but no genetic-specific consent |
| Data minimization | Good            | Only processes what's needed                          |
| Right to erasure  | Not implemented | No self-service data deletion                         |
| Data portability  | Not applicable  | No data storage after session                         |
| DPO designation   | Not implemented | Required if processing genetic data at scale          |
| DPIA              | Not done        | Data Protection Impact Assessment required            |

### GINA

| Requirement                | Status          | Gap                                                         |
| -------------------------- | --------------- | ----------------------------------------------------------- |
| Non-discrimination notice  | Not implemented | Should inform users of GINA rights                          |
| Data handling transparency | Partial         | Privacy policy exists but lacks genetic-specific provisions |

---

## Positive Security Findings

The following security practices are implemented correctly:

1. **Password hashing:** bcrypt with automatic salting (`Source/auth/manager.py:53-57`)
2. **OAuth CSRF protection:** Cryptographic state tokens with constant-time comparison (`Source/auth/oauth.py:54-55, 224-239`)
3. **Google OAuth email verification:** Rejects unverified Google emails (`Source/auth/oauth.py:186-188`)
4. **Account lockout:** 5 attempts with 30-minute auto-unlock (`Source/auth/manager.py:230-264`)
5. **Stripe webhook signature verification:** Properly validates webhook authenticity (`Source/payments/stripe_handler.py:362-366`)
6. **File format validation:** Parser validates file format before parsing, rejects unrecognized formats
7. **No permanent storage of genetic data:** Parsed data stays in session memory only
8. **`.gitignore` coverage:** `.env` files and secrets excluded from version control
9. **Password field masking:** All password inputs use `type="password"`
10. **Input normalization:** Email addresses lowercased and stripped on all operations

---

## Prioritized Remediation Roadmap

### Immediate (Before Any Production Use)

1. **[C3] Remove false HIPAA compliance claims** -- change wording immediately
2. **[C1] Encrypt or migrate user database** -- at minimum encrypt the JSON file
3. **[C2] Add file locking or migrate to SQLite** -- prevent data corruption
4. **[H3] Add PayPal webhook signature verification**
5. **[H2] Server-side tier validation** -- re-verify on every request

### Short-Term (Within 2 Weeks)

6. **[H1] Standardize session management** -- use `create_session()` everywhere
7. **[H4] Implement audit logging** -- structured logging for all auth/payment events
8. **[H6] Add file size limits and parsing timeouts**
9. **[M3] HTML-escape all user data in `unsafe_allow_html` contexts**
10. **[M1] Improve email validation**

### Medium-Term (Within 1 Month)

11. **[H5] Add "Clear My Data" functionality**
12. **[M5] Rate limiting on registration**
13. **[M7] Account lockout notifications**
14. **[L1] Reduce session timeout to 15 minutes**
15. **[M4] CSP headers via reverse proxy**

### Long-Term (Before Scaling)

16. Migrate to proper database (Supabase recommended per existing research)
17. Implement comprehensive HIPAA compliance if pursuing health data market
18. GDPR DPIA and DPO designation
19. GINA compliance notices
20. Third-party penetration test

---

## Files Reviewed

| File                                | LOC   | Risk Areas                                         |
| ----------------------------------- | ----- | -------------------------------------------------- |
| `Source/auth/manager.py`            | 461   | Plaintext DB, race conditions, no logging          |
| `Source/auth/oauth.py`              | 239   | Good CSRF protection, redirect handling            |
| `Source/auth/session.py`            | 147   | Non-constant-time comparison, long timeout         |
| `Source/auth/validators.py`         | 133   | Weak email validation, no special char             |
| `Source/auth/helpers.py`            | 155   | Bypasses session module, duplicate auth logic      |
| `Source/payments/stripe_handler.py` | 438   | Good webhook verification, API key in module scope |
| `Source/payments/paypal_handler.py` | 400   | Missing webhook verification                       |
| `Source/parser.py`                  | 1,262 | Resource exhaustion, no file size limit            |
| `Source/tier_config.py`             | 330   | Client-side tier enforcement only                  |
| `pages/auth.py`                     | 272   | False HIPAA claim, open redirect                   |
| `pages/analysis.py`                 | 638   | Tier bypass, session state trust                   |
| `pages/account.py`                  | 145   | XSS risk in user name display                      |
| `pages/subscription.py`             | 227   | Payment flow, sensitive data handling              |
| `app.py`                            | 82    | No security headers                                |
| `.env.example`                      | 32    | Secrets template (properly gitignored)             |
| `.gitignore`                        | 52    | Good coverage of secrets                           |
| `requirements.txt`                  | 7     | Missing paypalrestsdk                              |

---

_This audit was conducted as a code review and does not include dynamic testing (penetration testing, fuzzing, or runtime analysis). A dynamic security assessment is recommended before production deployment._
