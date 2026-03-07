# JWT Secret Rotation Runbook

## Overview

Mergenix uses dual-key JWT verification to enable zero-downtime secret rotation.
When a new JWT secret is deployed, tokens signed with the previous secret remain
valid for a configurable grace period. This runbook describes how to rotate the
JWT signing secret safely.

## Architecture

### Environment Variables

| Variable                       | Purpose                                        | Default      |
| ------------------------------ | ---------------------------------------------- | ------------ |
| `JWT_SECRET`                   | Current signing key for new tokens             | _(required)_ |
| `JWT_KEY_ID`                   | Key ID (`kid`) embedded in JWT headers         | `v1`         |
| `JWT_SECRET_PREVIOUS`          | Previous signing key, accepted during rotation | `""` (empty) |
| `JWT_KEY_ID_PREVIOUS`          | Key ID of the previous key                     | `""` (empty) |
| `SECRET_ROTATION_MAX_AGE_DAYS` | Alert threshold for key age                    | `90`         |

### How It Works

1. **Token creation**: `create_access_token()` and `create_refresh_token()` sign
   JWTs with `JWT_SECRET` and embed `JWT_KEY_ID` as the `kid` header claim.

2. **Token verification** (`decode_token()`):
   - Extracts the `kid` from the JWT header.
   - If `kid` is present, looks up the matching secret (current or previous)
     and verifies the signature against that specific key.
   - If `kid` is absent (legacy tokens created before rotation support),
     tries the current secret first, then falls back to the previous secret.
   - If no secret produces a valid signature, the token is rejected.

3. **Key age monitoring**: `is_key_rotation_recommended(key_created_at)` returns
   `True` when a key has been in service for >= `SECRET_ROTATION_MAX_AGE_DAYS`.
   Integrate this into health checks or admin dashboards.

## Rotation Procedure

### Pre-Rotation Checklist

- [ ] Current key age exceeds `SECRET_ROTATION_MAX_AGE_DAYS` (or rotation is
      triggered by a security event)
- [ ] New secret generated (see "Generating a New Secret" below)
- [ ] New key ID chosen (e.g., `v2`, `rotation-2026-03`, date-based format)
- [ ] Deployment window scheduled (rotation is zero-downtime but should still
      be done during low-traffic periods for safety)
- [ ] Rollback plan reviewed (see "Rollback" section)

### Step 1: Generate a New Secret

```bash
# Generate a cryptographically secure 64-character hex string
python -c "import secrets; print(secrets.token_hex(32))"
```

Choose a key ID that is unique and monotonically increasing. Recommended format:
`v{N}` (e.g., `v2`, `v3`) or `rotation-YYYY-MM` (e.g., `rotation-2026-03`).

### Step 2: Update Environment Variables

Set the following environment variables in your deployment configuration
(e.g., `.env`, Vercel environment settings, Docker secrets, etc.):

```bash
# BEFORE rotation (example starting state):
# JWT_SECRET=old-secret-value
# JWT_KEY_ID=v1
# JWT_SECRET_PREVIOUS=
# JWT_KEY_ID_PREVIOUS=

# AFTER rotation:
JWT_SECRET=<new-secret-value>
JWT_KEY_ID=v2
JWT_SECRET_PREVIOUS=<old-secret-value>
JWT_KEY_ID_PREVIOUS=v1
```

**Critical**: Copy the current `JWT_SECRET` value into `JWT_SECRET_PREVIOUS` and
the current `JWT_KEY_ID` into `JWT_KEY_ID_PREVIOUS` BEFORE replacing them with
the new values. If you skip this step, all existing tokens will be immediately
invalidated, forcing all users to re-authenticate.

### Step 3: Deploy

Deploy the updated environment variables. The application will:

- Sign all **new** tokens with the new `JWT_SECRET` and `JWT_KEY_ID`.
- Accept tokens signed with either the new or previous secret during verification.
- Legacy tokens (without `kid` headers) will be tried against both secrets.

### Step 4: Verify

After deployment, verify the rotation is working:

1. **New tokens use the new key**:

   ```python
   from jose import jwt
   # Decode a newly issued token's header (without verification)
   header = jwt.get_unverified_header(new_token)
   assert header["kid"] == "v2"  # Should match new JWT_KEY_ID
   ```

2. **Old tokens are still accepted**: Users with existing sessions should not
   be logged out.

3. **Health check**: If you have a `/health` endpoint that calls
   `is_key_rotation_recommended()`, confirm it no longer flags for rotation.

### Step 5: Clean Up Previous Key

After the rotation window expires (i.e., all tokens signed with the previous key
have expired), remove the previous key:

```bash
# Timing: Wait at least max(ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS)
# Default: 7 days (refresh token lifetime)

JWT_SECRET_PREVIOUS=
JWT_KEY_ID_PREVIOUS=
```

**Do NOT remove the previous key prematurely.** If you clear `JWT_SECRET_PREVIOUS`
before old refresh tokens expire, users with those tokens will be forced to
re-authenticate.

Recommended wait time: `REFRESH_TOKEN_EXPIRE_DAYS` + 1 day buffer = **8 days**
after rotation deployment.

## Rollback

If something goes wrong during rotation:

### Scenario A: New secret was deployed but is wrong/corrupted

Roll back environment variables to the pre-rotation state:

```bash
JWT_SECRET=<original-secret-value>
JWT_KEY_ID=v1
JWT_SECRET_PREVIOUS=
JWT_KEY_ID_PREVIOUS=
```

Tokens issued during the brief window with the bad secret will be invalidated.
This is acceptable since the window should be very short.

### Scenario B: Need to revert after rotation window started

If users have already received tokens signed with the new key, you cannot simply
remove it. Instead, do a "reverse rotation":

```bash
JWT_SECRET=<original-secret-value>
JWT_KEY_ID=v1
JWT_SECRET_PREVIOUS=<new-secret-value>
JWT_KEY_ID_PREVIOUS=v2
```

This accepts both old and new tokens while signing new tokens with the original key.

## Emergency Secret Revocation

If the JWT secret is compromised and you need to **immediately** invalidate all
existing tokens:

```bash
JWT_SECRET=<brand-new-secret>
JWT_KEY_ID=emergency-revoke-YYYY-MM-DD
JWT_SECRET_PREVIOUS=
JWT_KEY_ID_PREVIOUS=
```

**Impact**: All existing tokens (access and refresh) become invalid immediately.
All users must re-authenticate. Use this only for confirmed security incidents.

## Monitoring and Alerting

### Key Age Monitoring

Integrate `is_key_rotation_recommended()` into your monitoring:

```python
from datetime import UTC, datetime
from app.services.auth_service import is_key_rotation_recommended

# Track when the current key was deployed (store this externally)
key_deployed_at = datetime(2026, 2, 1, tzinfo=UTC)

if is_key_rotation_recommended(key_deployed_at):
    # Trigger alert: "JWT secret rotation recommended"
    pass
```

### Recommended Alerts

| Alert                         | Condition                                   | Severity |
| ----------------------------- | ------------------------------------------- | -------- |
| Key rotation recommended      | Key age >= `SECRET_ROTATION_MAX_AGE_DAYS`   | Warning  |
| Rotation window open too long | `JWT_SECRET_PREVIOUS` set for > 14 days     | Warning  |
| Unknown kid rejection spike   | Elevated rate of `JWTError: unknown key ID` | Critical |
| Emergency rotation triggered  | `JWT_KEY_ID` contains "emergency"           | Critical |

## Important Notes

### DATA_ENCRYPTION_KEY Is NOT Rotatable

The `DATA_ENCRYPTION_KEY` environment variable (used for AES-256-GCM encryption
of analysis results at rest) is **separate** from the JWT secret and **cannot be
rotated**. Changing it will make all previously encrypted analysis results
permanently unrecoverable. This runbook applies only to JWT secrets.

### Multiple Workers / Processes

Environment variable changes must reach ALL application workers simultaneously.
If using a multi-process deployment (e.g., Gunicorn with multiple workers), ensure
the configuration reload mechanism updates all processes. With pydantic-settings
and `lru_cache`, a process restart is required for settings changes to take effect.

### Key ID Uniqueness

Never reuse a `JWT_KEY_ID` value. If `v1` was used before, the next rotation
should use `v2`, not `v1` again. Reusing key IDs can cause the wrong secret to be
selected during the rotation window.
