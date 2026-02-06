# Tortit Authentication Redesign Plan

## Executive Summary

Based on comprehensive research across 5 areas (competitor analysis, UI patterns, OAuth/social login, HIPAA security, and Streamlit solutions), here is the recommended authentication redesign for Tortit.

---

## Research Findings Summary

### 1. Competitor Analysis (23andMe, Ancestry, Nebula, Color, Invitae)

| Finding | Implication for Tortit |
|---------|----------------------|
| Passwordless authentication dominates 2026 | Implement magic links |
| 64% signup drop-off due to complexity | Simplify to 3-4 fields |
| 100% offer 2FA | MFA is mandatory |
| Google OAuth is standard | Add Google Sign-In |
| Privacy-first design differentiates | Prominent encryption badges |

### 2. UI Design Patterns

| Best Practice | Recommendation |
|---------------|----------------|
| Full-page centered card (400px max) | Replace sidebar login |
| Labels above inputs (not floating) | Better accessibility |
| Single-column layout | Standard modern approach |
| 48-56px input height | Touch-friendly |
| 16px minimum font | Prevents mobile zoom |
| Show/hide password toggle | Essential UX |

### 3. Social Login & OAuth

| Provider | Trust Level | Recommendation |
|----------|-------------|----------------|
| Google | 60% | ✅ Add (primary OAuth) |
| Apple | 70% | ✅ Add (privacy users) |
| Facebook | 35% | ❌ Skip (low trust for health) |

**Key Finding**: 38% of users trust social login for health apps vs 68% for general apps. Offer both options.

### 4. Security & HIPAA Requirements

| Requirement | Implementation |
|-------------|----------------|
| Password hashing | Argon2id (preferred) or bcrypt |
| Session timeout | 15 minutes idle (HIPAA) |
| MFA | TOTP with authenticator apps |
| Audit logging | 6-year retention (HIPAA) |
| Encryption at rest | AES-256 for credentials |

### 5. Recommended Tech Stack

**For MVP/Current Phase:**
- **Streamlit-Authenticator** with custom UI
- **PostgreSQL** for user storage (replace JSON)
- **bcrypt** for password hashing (already using)
- **Google OAuth** via custom implementation

**For Production/Scale:**
- **Supabase Auth** ($199/mo Team Plan - HIPAA compliant)
- Built-in Google/Apple OAuth
- Row-level security for genetic data
- Audit logging included

---

## Proposed Authentication Flow

### New Login Page Design

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [Tortit Logo + DNA helix]                │
│                                                             │
│                  Welcome Back to Tortit                     │
│            Genetic Offspring Analysis Platform              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  [G] Continue with Google                   │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  [] Continue with Apple                    │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ─────────────── or ───────────────                │   │
│  │                                                     │   │
│  │  Email                                              │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ you@example.com                             │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  Password                                           │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ ••••••••••••                          [👁]  │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  □ Remember me              Forgot password?        │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │              Sign In                        │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  Don't have an account? Sign up                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🔒 Your data is encrypted and never shared                │
│  HIPAA Compliant  •  Privacy Policy  •  Terms              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Changes

1. **Full-page centered card** instead of sidebar login
2. **Social login buttons first** (reduces friction)
3. **"or" divider** for email/password option
4. **Show/hide password toggle** (eye icon)
5. **Trust signals at bottom** (encryption badge, HIPAA, links)
6. **Clean, minimal design** matching Tortit's bioluminescent theme

---

## Implementation Plan

### Phase 1: UI Redesign (Week 1)

| Task | Priority | Hours |
|------|----------|-------|
| Create dedicated login page (`pages/1_Login.py`) | Critical | 4 |
| Design full-page centered auth card | Critical | 4 |
| Implement show/hide password toggle | High | 1 |
| Add remember me checkbox | High | 1 |
| Add forgot password link/flow | High | 2 |
| Add trust signals (encryption badge) | Medium | 1 |
| Mobile responsive design | High | 2 |
| Dark mode matching Tortit theme | High | 2 |

### Phase 2: Database Migration (Week 1-2)

| Task | Priority | Hours |
|------|----------|-------|
| Create PostgreSQL schema for users | Critical | 2 |
| Migrate from JSON to database | Critical | 4 |
| Add proper indexes and constraints | High | 1 |
| Implement audit logging table | High | 2 |
| Add session management table | High | 2 |

### Phase 3: Google OAuth (Week 2)

| Task | Priority | Hours |
|------|----------|-------|
| Set up Google Cloud Console project | Critical | 1 |
| Configure OAuth consent screen | Critical | 1 |
| Implement OAuth flow in Streamlit | Critical | 4 |
| Handle OAuth callback | High | 2 |
| Link OAuth accounts to existing users | High | 2 |
| Test OAuth end-to-end | High | 2 |

### Phase 4: Security Hardening (Week 3)

| Task | Priority | Hours |
|------|----------|-------|
| Upgrade to Argon2id for new passwords | High | 2 |
| Implement 15-minute session timeout | Critical | 2 |
| Add account lockout (5 attempts) | High | 2 |
| Implement TOTP MFA (optional) | Medium | 4 |
| Add comprehensive audit logging | High | 3 |
| Security review and testing | Critical | 4 |

### Phase 5: Polish & Deploy (Week 4)

| Task | Priority | Hours |
|------|----------|-------|
| Email verification flow | High | 3 |
| Password reset via email | High | 3 |
| Error handling and messages | High | 2 |
| Loading states and animations | Medium | 2 |
| Cross-browser testing | High | 2 |
| Documentation | Medium | 2 |

---

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255),  -- NULL if OAuth-only
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(20) DEFAULT 'free',
    subscription_id VARCHAR(255),
    payment_provider VARCHAR(20),
    oauth_provider VARCHAR(50),  -- 'google', 'apple', NULL
    oauth_id VARCHAR(255),       -- Provider's user ID
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),     -- TOTP secret (encrypted)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log (HIPAA requirement)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,  -- 'login', 'logout', 'password_change', etc.
    event_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

---

## File Structure

```
Tortit/
├── pages/
│   ├── 1_Login.py           # NEW: Full-page login/register
│   ├── 2_Disease_Catalog.py
│   └── 3_Subscription.py
├── Source/
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── manager.py       # AuthManager class (refactored)
│   │   ├── oauth.py         # NEW: Google/Apple OAuth
│   │   ├── session.py       # NEW: Session management
│   │   ├── mfa.py           # NEW: TOTP MFA
│   │   └── database.py      # NEW: PostgreSQL integration
│   └── ...
├── static/
│   └── auth.css             # NEW: Auth page styles
└── ...
```

---

## Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/tortit

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Apple OAuth (optional)
APPLE_CLIENT_ID=com.tortit.auth
APPLE_TEAM_ID=xxx
APPLE_KEY_ID=xxx
APPLE_PRIVATE_KEY=xxx

# Session
SESSION_SECRET_KEY=<random-32-bytes>
SESSION_TIMEOUT_MINUTES=15

# Email (for verification/reset)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=xxx
FROM_EMAIL=noreply@tortit.com
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Signup completion rate | ~60% | 85% |
| Login success rate | ~90% | 98% |
| Time to first analysis | 3 min | 1 min |
| Mobile auth success | Unknown | 95% |
| OAuth adoption | 0% | 40% |

---

## Timeline Summary

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | UI Redesign | Full-page login, modern design |
| 2 | Database + OAuth | PostgreSQL migration, Google login |
| 3 | Security | Session management, audit logs |
| 4 | Polish | Email flows, testing, deploy |

**Total Estimated Hours:** 65-80 hours

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OAuth integration complexity | Start with Google only, add Apple later |
| Database migration issues | Keep JSON backup, test thoroughly |
| User confusion with new UI | Add tooltips, maintain backwards compatibility |
| Security vulnerabilities | Security audit before deploy |

---

## Appendix: Research Documents

All detailed research is available in:
- `.omc/scientist/reports/20260206_auth_ux_competitor_analysis.md`
- `.omc/scientist/reports/20260206_auth_ui_research.md`
- `.omc/scientist/reports/20260206_oauth_research.md`
- `.omc/scientist/reports/20260206_hipaa_auth_security_report.md`
- `AUTHENTICATION_RESEARCH.md`

---

*Document created: February 2026*
*Based on comprehensive 5-stage research analysis*
