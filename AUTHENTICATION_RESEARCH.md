# Streamlit Authentication Solutions Research (2026)

## Executive Summary

For Mergenix's genetic health app, we have multiple authentication approaches ranging from simple built-in solutions to enterprise-grade platforms. The choice depends on your priorities: **cost**, **security compliance** (HIPAA for genetic data), **ease of implementation**, and **scalability**.

**Key Finding**: If handling Protected Health Information (PHI) or genetic data, **Supabase Auth** offers the best balance of cost, HIPAA compliance, and ease of use. For maximum security with enterprise features, **AWS Cognito** is recommended.

---

## 1. AUTHENTICATION SOLUTIONS COMPARISON

### A. Streamlit Built-in (OIDC) - FREE

**What it is**: Streamlit's native OpenID Connect support with Google, Microsoft, or custom OIDC providers.

**Features**:
- ✅ Built-in st.login() and st.logout()
- ✅ Identity tokens and access tokens (st.user.tokens)
- ✅ No external dependencies
- ✅ Session management built-in

**Limitations**:
- ❌ No role-based access control (RBAC)
- ❌ No user registration/password reset flows
- ❌ Requires external identity provider (Google/Microsoft)
- ❌ No database for user metadata

**Best For**: Internal tools, teams using corporate SSO (Google Workspace, Azure AD)

**Complexity**: ⭐ Low
**Setup Time**: 15 minutes

**Code Example**:
```python
import streamlit as st

if st.login():
    st.write(f"Welcome {st.user.name}")
else:
    st.write("Please log in")
```

**Cost**: Free
**HIPAA Compliance**: No (no audit logs or encryption guarantees)

---

### B. Streamlit-Authenticator - FREE/OSS

**What it is**: Community package for username/password authentication with YAML-based credential storage.

**Features**:
- ✅ Login, register, password reset, forgot username
- ✅ YAML-based configuration (easy to set up)
- ✅ bcrypt password hashing (automatic)
- ✅ Session cookie re-authentication
- ✅ Role-based access control (RBAC)
- ✅ Modify user details widget
- ✅ No backend required

**Limitations**:
- ❌ Credentials stored in YAML file (not production-ready for large scale)
- ❌ No built-in database integration
- ❌ No SSO/OAuth/SAML support
- ❌ No MFA by default
- ❌ Manual password management flow

**Best For**: Small teams, internal dashboards, MVPs

**Complexity**: ⭐⭐ Low-Medium
**Setup Time**: 30 minutes

**Code Example**:
```yaml
# config.yaml
credentials:
  usernames:
    alice:
      name: Alice Smith
      password: $2b$12$...  # bcrypt hash
      email: alice@example.com
      roles: admin
    bob:
      name: Bob Jones
      password: $2b$12$...
      email: bob@example.com
      roles: user

cookie:
  expiry_days: 30
  key: some_signature_key
  name: streamlit_auth_token
```

```python
import streamlit as st
import streamlit_authenticator as stauth

# Load config
with open('config.yaml') as file:
    config = yaml.safe_load(file)

authenticator = stauth.Authenticate(
    config['credentials'],
    config['cookie']['name'],
    config['cookie']['key'],
    config['cookie']['expiry_days']
)

name, authentication_status, username = authenticator.login()

if authentication_status:
    authenticator.logout()
    st.write(f"Welcome {name}")
else:
    st.error("Login failed")
```

**Cost**: Free ($0)
**HIPAA Compliance**: No (local file storage not suitable for PHI)

---

### C. Custom Implementation with st.session_state + Database

**What it is**: Building your own authentication layer with Streamlit's session management + SQLite/PostgreSQL.

**Features**:
- ✅ Full control over logic and UI
- ✅ Database-backed user storage
- ✅ Custom RBAC implementation
- ✅ Password hashing (with bcrypt or argon2)
- ✅ Can add MFA, audit logs, etc.

**Limitations**:
- ❌ Requires backend development effort
- ❌ Security depends on your implementation
- ❌ No built-in features for SSO/OAuth
- ❌ Higher maintenance burden
- ❌ Must handle password reset flows manually

**Best For**: Teams with backend expertise, unique requirements

**Complexity**: ⭐⭐⭐⭐ High
**Setup Time**: 2-3 days

**Code Example**:
```python
import streamlit as st
import sqlite3
from argon2 import PasswordHasher

def init_db():
    conn = sqlite3.connect('users.db')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            password_hash TEXT,
            email TEXT,
            role TEXT DEFAULT 'user'
        )
    ''')
    conn.commit()
    conn.close()

def authenticate_user(username, password):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash, role FROM users WHERE username=?", (username,))
    result = cursor.fetchone()
    conn.close()

    if result and PasswordHasher().verify(result[0], password):
        return {'username': username, 'role': result[1]}
    return None

# Login form
st.subheader("Login")
username = st.text_input("Username")
password = st.text_input("Password", type="password")

if st.button("Login"):
    user = authenticate_user(username, password)
    if user:
        st.session_state['user'] = user
        st.session_state['logged_in'] = True
        st.rerun()
    else:
        st.error("Invalid credentials")

# Check login status
if st.session_state.get('logged_in'):
    st.write(f"Welcome {st.session_state['user']['username']}")
    if st.button("Logout"):
        st.session_state['logged_in'] = False
        st.rerun()
```

**Cost**: Free (if using SQLite), $15-50/month (PostgreSQL on Heroku/Render)
**HIPAA Compliance**: Possible if implemented correctly (encryption, audit logs, BAA required)

---

### D. Supabase Auth - $25/month (Professional)

**What it is**: PostgreSQL database + authentication-as-a-service. HIPAA compliant at Team+ plans.

**Features**:
- ✅ Built-in PostgreSQL database
- ✅ Email/password authentication
- ✅ Social OAuth (Google, GitHub, Discord)
- ✅ SAML/SSO support
- ✅ MFA (TOTP, SMS)
- ✅ Row-level security (RLS)
- ✅ Real-time sync
- ✅ HIPAA compliant (with BAA at Team+ plan: $199/month)
- ✅ Session management
- ✅ Audit logs

**Limitations**:
- ❌ Requires Supabase client library integration
- ❌ Team+ plan expensive ($199/month) for HIPAA
- ❌ Need to handle user data in Streamlit UI layer

**Best For**: Growing startups, healthcare apps, apps needing HIPAA compliance

**Complexity**: ⭐⭐ Low-Medium
**Setup Time**: 1-2 hours

**Code Example**:
```python
import streamlit as st
from supabase import create_client, Client

# Initialize Supabase
url = st.secrets["supabase_url"]
key = st.secrets["supabase_key"]
supabase: Client = create_client(url, key)

def sign_up(email, password):
    try:
        response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })
        return response
    except Exception as e:
        return None

def sign_in(email, password):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        return response
    except Exception as e:
        return None

# UI
col1, col2 = st.columns(2)

with col1:
    if st.button("Sign Up"):
        email = st.text_input("Email")
        password = st.text_input("Password", type="password")
        if st.button("Create Account"):
            sign_up(email, password)
            st.success("Check your email to confirm")

with col2:
    email = st.text_input("Email")
    password = st.text_input("Password", type="password")
    if st.button("Sign In"):
        user = sign_in(email, password)
        if user:
            st.session_state['user'] = user
            st.rerun()
```

**Cost**:
- Free tier: 50,000 MAUs
- Pro: $25/month (100K MAUs)
- Team: $199/month (HIPAA + SOC2)

**HIPAA Compliance**: ✅ YES (Team plan with BAA)
**Pricing**: ⭐⭐⭐⭐ Excellent value

---

### E. Firebase Authentication - FREE-$125/month+

**What it is**: Google's managed authentication with realtime database.

**Features**:
- ✅ Email/password authentication
- ✅ Social OAuth (Google, Facebook, Twitter, GitHub)
- ✅ SMS verification
- ✅ MFA/2FA support
- ✅ User management console
- ✅ Anonymous authentication
- ✅ Custom claims for RBAC

**Limitations**:
- ❌ Not HIPAA compliant (no BAA)
- ❌ Limited audit logging
- ❌ Vendor lock-in (Google Cloud)
- ❌ SMS costs add up quickly
- ❌ Limited customization

**Best For**: Consumer apps, MVPs, apps not handling PHI

**Complexity**: ⭐⭐ Low-Medium
**Setup Time**: 1 hour

**Cost**:
- Free: 50,000 MAUs
- Pay-as-you-go: ~$0.008 per verification

**HIPAA Compliance**: ❌ NO

---

### F. Auth0 - $600-2400/month

**What it is**: Enterprise authentication platform with advanced features.

**Features**:
- ✅ Email/password, OAuth, SAML, OIDC
- ✅ Advanced MFA (push notifications, biometric)
- ✅ Passwordless authentication
- ✅ Custom database connections
- ✅ Anomaly detection
- ✅ Enterprise SSO (SAML, OIDC)
- ✅ Extensive audit logs
- ✅ Compliance ready (can work with HIPAA BAA)

**Limitations**:
- ❌ Very expensive ($0.07 per MAU)
- ❌ Overkill for small startups
- ❌ Complex configuration
- ❌ Premium HIPAA features extra

**Best For**: Enterprise applications, large teams

**Complexity**: ⭐⭐⭐ Medium-High
**Setup Time**: 2-3 hours

**Cost**: $600/month minimum (at 10K MAUs)

**HIPAA Compliance**: ✅ Possible (with enterprise plan + BAA)

---

### G. AWS Cognito - $0-100+/month

**What it is**: AWS's managed identity and access management service.

**Features**:
- ✅ Email/password authentication
- ✅ Social OAuth (Google, Facebook, Apple)
- ✅ SAML/OIDC
- ✅ MFA (SMS, TOTP, email)
- ✅ User pools and identity pools
- ✅ Advanced security features
- ✅ HIPAA eligible (with BAA)
- ✅ Audit logging via CloudTrail

**Limitations**:
- ❌ Complex AWS ecosystem
- ❌ Steeper learning curve
- ❌ Costs can surprise (SMS charges)
- ❌ Requires AWS account management

**Best For**: AWS-native deployments, enterprises, healthcare apps on AWS

**Complexity**: ⭐⭐⭐ Medium-High
**Setup Time**: 2-4 hours

**Cost**: Free tier (12 months) + $0.0055 per MAU

**HIPAA Compliance**: ✅ YES (HIPAA-eligible with BAA)

---

### H. PropelAuth (Reverse Proxy) - $29-299/month

**What it is**: Authentication proxy that sits in front of your Streamlit app.

**Features**:
- ✅ Email/password authentication
- ✅ Social OAuth
- ✅ SAML/SSO
- ✅ RBAC and permissions
- ✅ Streamlit-native (no code changes needed)
- ✅ Reverse proxy architecture
- ✅ Can keep Streamlit entirely private

**Limitations**:
- ❌ Requires reverse proxy setup
- ❌ Additional infrastructure management
- ❌ Not HIPAA compliant by default

**Best For**: Teams wanting authentication without modifying Streamlit code

**Complexity**: ⭐⭐ Low-Medium
**Setup Time**: 1-2 hours (with reverse proxy)

**Cost**: $29-299/month depending on features

**HIPAA Compliance**: ❌ NO (but reverse proxy can add encryption)

---

### I. Descope - $0-Custom

**What it is**: Modern authentication platform with Streamlit support.

**Features**:
- ✅ Email/password, passwordless
- ✅ SAML/OIDC SSO
- ✅ RBAC and authorization
- ✅ MFA/2FA
- ✅ Streamlit integration examples
- ✅ Custom branding
- ✅ Native HIPAA capabilities

**Limitations**:
- ❌ Pricing not clearly published
- ❌ Newer platform (less mature)

**Best For**: Teams wanting modern auth with healthcare focus

**Complexity**: ⭐⭐ Low-Medium
**Setup Time**: 1-2 hours

**Cost**: Custom pricing (contact sales)

**HIPAA Compliance**: ✅ YES (enterprise)

---

## 2. COMPARISON MATRIX

| Feature | Streamlit OIDC | Streamlit-Authenticator | Custom + DB | Supabase | Firebase | Auth0 | AWS Cognito | PropelAuth | Descope |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Free Tier** | ✅ | ✅ | ✅ | ✅ (50K MAU) | ✅ (50K MAU) | ❌ | ✅ (12mo) | ❌ | ✅ |
| **Email/Password** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Social OAuth** | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SAML/SSO** | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **MFA/2FA** | ❌ | ❌ | 🔶 (custom) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **RBAC** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Database** | ❌ | ❌ | ✅ | ✅ | ✅ | 🔶 | 🔶 | ❌ | 🔶 |
| **Audit Logs** | ❌ | ❌ | 🔶 | ✅ | ✅ | ✅ | ✅ | 🔶 | ✅ |
| **HIPAA Compliant** | ❌ | ❌ | ⚠️ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **No Code Changes** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Setup Complexity** | ⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| **Cost** | $0 | $0 | $0-50 | $0-199 | $0-125+ | $600+ | $0-100+ | $29-299 | Custom |

**Legend**: ✅ Yes | ❌ No | 🔶 Partial/Custom | ⚠️ Conditional

---

## 3. RECOMMENDATION BY USE CASE

### For Mergenix (Genetic Health App with PHI)

**TIER 1 RECOMMENDATION: Supabase Auth (Team Plan)**

```
Cost: $199/month
Justification:
- HIPAA compliant with BAA (critical for genetic data)
- PostgreSQL database for user records + genetic data
- Row-level security (RLS) for data isolation
- Audit logs for compliance
- OAuth support for user convenience
- Excellent value compared to competitors
```

**Setup outline**:
1. Create Supabase organization
2. Sign BAA with Supabase (enable HIPAA add-on)
3. Create project with High Compliance setting
4. Enable MFA on all accounts
5. Configure RLS policies for data access
6. Integrate Supabase Auth client in Streamlit app
7. Set up audit logging

---

### TIER 2 RECOMMENDATION: AWS Cognito (for AWS-native deployments)

```
Cost: Free tier + ~$5-50/month
Justification:
- HIPAA-eligible service
- Integrates with AWS ecosystem
- CloudTrail audit logging
- Similar HIPAA requirements as Supabase
- Better for teams already on AWS
```

---

### TIER 3 RECOMMENDATION: Custom Implementation + Supabase (PostgreSQL)

```
Cost: $25/month (Supabase Pro for database only)
Justification:
- Maximum control over auth logic
- Can implement all HIPAA requirements yourself
- Must ensure encryption, audit logs, MFA
- Requires security expertise
- Suitable if legal/compliance team willing to sign BAA with your company
```

---

## 4. IMPLEMENTATION ROADMAP FOR MERGENIX

### Phase 1: MVP (Week 1-2)
**Option**: Supabase Auth Free Tier OR Streamlit-Authenticator

```
✅ User login/registration
✅ Role-based access (viewer, researcher, admin)
✅ Session management
❌ HIPAA compliance (not required for MVP)
```

### Phase 2: Production (Week 3-4)
**Option**: Supabase Auth (Team Plan)

```
✅ HIPAA compliance with BAA
✅ Audit logging
✅ MFA enforcement
✅ Database encryption
✅ Role-based data access
✅ Genetic data storage with RLS
```

### Phase 3: Enterprise (Month 2+)
**Option**: AWS Cognito + custom auth layer

```
✅ Advanced security features
✅ SSO for hospital systems
✅ Compliance reporting
✅ Disaster recovery
```

---

## 5. SECURITY CHECKLIST FOR HIPAA COMPLIANCE

If storing genetic data (PHI), ensure:

- [ ] **Encryption at Rest**: AES-256 (Supabase/AWS handle this)
- [ ] **Encryption in Transit**: TLS 1.2+ (HTTPS only)
- [ ] **Access Control**: RBAC + row-level security
- [ ] **MFA**: Required for all accounts
- [ ] **Audit Logs**: Track all access to PHI
- [ ] **Data Minimization**: Collect only necessary data
- [ ] **Business Associate Agreement (BAA)**: Signed with provider
- [ ] **Breach Notification**: Plan for incident response
- [ ] **Password Policy**: Minimum 12 chars, complexity requirements
- [ ] **Session Management**: 30-min inactivity timeout
- [ ] **Regular Security Audits**: Quarterly reviews
- [ ] **Staff Training**: HIPAA awareness for team

---

## 6. COST BREAKDOWN (Annual)

| Solution | Startup | Growth | Scale |
|----------|---------|--------|-------|
| Streamlit OIDC + external DB | $600 | $1,200 | $2,400 |
| Supabase Free + Auth | $300 | $300 | $300 |
| Supabase Pro | $300 | $600 | $1,200 |
| **Supabase Team (HIPAA)** | **$2,388** | **$2,388** | **$2,388** |
| AWS Cognito | $100 | $500 | $2,000 |
| Firebase | $200 | $1,500 | $3,000+ |
| Auth0 | $7,200 | $15,000 | $30,000+ |

---

## 7. CODE EXAMPLES

See GitHub repositories:
- [Supabase + Streamlit example](https://github.com/supabase/supabase/discussions)
- [Streamlit-Authenticator](https://github.com/mkhorasani/Streamlit-Authenticator)
- [Streamlit + PostgreSQL + Auth](https://github.com/szeyu/streamlit-authentication-template)
- [AWS Cognito + Streamlit](https://github.com/jptsantossilva/Streamlit-AWS-Cognito)
- [PropelAuth + Streamlit](https://docs.propelauth.com/guides-and-examples/guides/streamlit-authentication)

---

## 8. NEXT STEPS FOR MERGENIX

1. **Confirm PHI/HIPAA Requirements**
   - Are you storing genetic data from patients?
   - Will you need HIPAA compliance immediately or later?

2. **Choose Authentication Solution**
   - MVP: Streamlit-Authenticator (free, fast)
   - Production: Supabase Team (HIPAA-ready)

3. **Set Up Security Infrastructure**
   - Enable MFA
   - Configure audit logging
   - Set up encryption
   - Create compliance documentation

4. **Integrate into Mergenix**
   - Wrap authentication around main app
   - Protect disease catalog page with auth
   - Store user roles in database
   - Restrict genetic data by role

5. **Compliance Review**
   - Have legal team review setup
   - Sign BAA with provider
   - Document security procedures
   - Create incident response plan

---

## Sources

- [Streamlit Authentication Docs](https://docs.streamlit.io/develop/concepts/connections/authentication)
- [Streamlit-Authenticator GitHub](https://github.com/mkhorasani/Streamlit-Authenticator)
- [Supabase HIPAA Compliance](https://supabase.com/docs/guides/security/hipaa-compliance)
- [Auth Pricing Comparison - Zuplo](https://zuplo.com/learning-center/api-authentication-pricing)
- [AWS Cognito + Streamlit - GitHub](https://github.com/jptsantossilva/Streamlit-AWS-Cognito)
- [PropelAuth Streamlit Guide](https://docs.propelauth.com/guides-and-examples/guides/streamlit-authentication)
- [Descope + Streamlit](https://www.descope.com/blog/post/authentication-sso-streamlit)
- [HIPAA Security Requirements - HHS](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [Streamlit Session State](https://docs.streamlit.io/develop/api-reference/caching-and-state/st.session_state)
- [Firebase vs Auth0 vs Supabase Pricing](https://dev.to/zuplo/auth-pricing-wars-cognito-vs-auth0-vs-firebase-vs-supabase-2jkb)
