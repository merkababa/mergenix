# EU Deployment Region Configuration

## Infrastructure Regions

| Component | Region | Configuration |
|-----------|--------|---------------|
| Frontend (Vercel) | `fra1` (Frankfurt, Germany) | Configured in `apps/web/vercel.json` |
| Backend (Railway) | `eu-west` | Must be set manually in Railway dashboard → Service → Settings → Region |
| Database (PostgreSQL) | EU region | Must be configured in Railway (PostgreSQL plugin region) or Supabase EU tier |
| CDN (Vercel Edge Network) | Global | Acceptable for static/public assets — no personal data served via CDN |

## Rationale

GDPR Article 44 and Chapter V prohibit transfer of personal data (including genetic data — a special category under Article 9) to countries outside the EU/EEA without adequate protections. Keeping all compute and storage within the EU/EEA eliminates the need for Standard Contractual Clauses or adequacy decisions for primary data processing.

Genetic data is explicitly listed as sensitive data under GDPR Article 9(1). All processing — compute, storage, API calls — must occur within the EU/EEA.

## Vercel Region

The `"regions": ["fra1"]` key in `apps/web/vercel.json` pins all Vercel serverless function invocations to Frankfurt. Static assets are served by Vercel's global Edge Network; this is acceptable because static files do not contain genetic or personal data.

## Railway Setup (manual step)

1. Go to Railway dashboard → Project → Service (`mergenix-api`)
2. Settings → Region → select `eu-west`
3. Apply the same region to the attached PostgreSQL plugin
4. Redeploy the service after changing region

## Database

If using Railway's PostgreSQL plugin, verify the plugin region matches `eu-west`. If using Supabase, select the Frankfurt (`eu-central-1`) region at project creation time — region cannot be changed after creation.

## References

- GDPR Article 9: Special categories of personal data
- GDPR Articles 44-49: Transfers to third countries
- Decision #54: GDPR compliance review (Mergenix internal)
- PR #85: Legal compliance implementation (Stream L Sprint 2)
