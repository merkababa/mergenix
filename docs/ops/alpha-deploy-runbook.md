# Internal Alpha Deployment Runbook

## Prerequisites

### GitHub Secrets (must be configured in repo Settings → Secrets)
| Secret | Service | Notes |
|--------|---------|-------|
| `VERCEL_TOKEN` | Vercel | Project-scoped deploy token |
| `VERCEL_ORG_ID` | Vercel | Organization/team ID |
| `VERCEL_PROJECT_ID` | Vercel | Project ID from Vercel dashboard |
| `RAILWAY_TOKEN` | Railway | Deploy token for `mergenix-api` service |
| `DATABASE_URL` | Railway PostgreSQL | `postgresql+asyncpg://...` (EU region) |
| `API_URL` | Backend | e.g., `https://api.mergenix.com` |
| `FRONTEND_URL` | Frontend | e.g., `https://mergenix.com` |
| `STRIPE_SECRET_KEY` | Stripe | Test mode key (`sk_test_...`) for alpha |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook signing secret (`whsec_...`) |
| `RESEND_API_KEY` | Resend | Email service API key |
| `SENTRY_DSN` | Sentry | Error tracking DSN |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Public key for frontend (`pk_test_...`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry | Public DSN for frontend error tracking |
| `NEXT_PUBLIC_API_URL` | Backend | Public API URL for frontend requests |

### Infrastructure Setup
1. **Vercel**: Create project, link to repo, set framework to Next.js
2. **Railway**: Create service `mergenix-api`, set region to `eu-west`, add PostgreSQL plugin (EU region)
3. **Stripe**: Create test-mode account, configure webhook endpoint
4. **Resend**: Register domain, create API key
5. **Sentry**: Create project for both frontend and backend

## Deployment Steps

### First-time setup
1. Configure all GitHub secrets above
2. Run database migrations: `alembic upgrade head`
3. Trigger manual deploy: Actions → V3 Deploy → Run workflow → staging

### Subsequent deploys
- Push to `main` → CI runs → if passes → auto-deploy to staging
- Manual promote to production: Actions → V3 Deploy → Run workflow → production

### Post-deploy verification
1. Health check: `curl https://api.mergenix.com/health`
2. Frontend loads: visit staging URL
3. Demo analysis works: click "Try Demo Analysis"
4. Auth flow: register test account, login, logout
5. File upload: upload synthetic genome file
6. Stripe: verify test payment flow

### Rollback
- Vercel: Dashboard → Deployments → promote previous deployment
- Railway: Dashboard → Deployments → rollback
- Database: `alembic downgrade -1`

## Alpha Testing Scope
- Team-only access (no public DNS)
- Use synthetic genome files only (no real genetic data)
- Stripe test mode (no real payments)
- Monitor Sentry for errors
- Collect feedback in GitHub Issues with label `alpha-feedback`
