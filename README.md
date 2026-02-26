# Mergenix — Genetic Offspring Analysis Platform

A privacy-first platform that analyzes raw DNA data from two parents to predict offspring traits, assess carrier risk, and deliver pharmacogenomics insights — all computed in-browser via Web Workers. No raw DNA ever leaves your device.

## Features

- **Multi-format parser** — 23andMe, AncestryDNA, MyHeritage, and VCF (Whole Genome Sequencing)
- **Carrier screening** — panel of 2,697 diseases with Mendelian offspring risk calculation
- **Trait prediction** — 476+ traits across appearance, health, behavior, and ancestry
- **Pharmacogenomics** — 12 pharmacogenes with drug-response guidance
- **Polygenic risk scores** — 10 common complex conditions
- **Genetic counseling** — automated triage and specialist referral suggestions
- **Ethnicity adjustment** — allele frequency correction across 9 reference populations
- **Privacy-first** — all analysis runs client-side in Web Workers; the server handles only auth, payments, and GDPR operations
- **One-time pricing** — Free, Premium, and Pro tiers; no subscriptions

## Architecture

Mergenix is a monorepo with a strict privacy boundary:

- **Client (apps/web):** Next.js 15 + React 19 + Tailwind CSS + Zustand. The genetics engine runs entirely inside Web Workers — raw SNP data never leaves the browser.
- **Server (apps/api):** FastAPI + SQLAlchemy + Alembic. Handles authentication, Stripe payments, GDPR data requests, and user account management only.
- **Genetics Engine (packages/genetics-engine):** TypeScript library compiled for Web Workers. Zero network calls during analysis.

Zero raw DNA is sent to the server at any point.

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- Python 3.10+

### Install

```bash
pnpm install
```

### Run frontend + engine (dev)

```bash
pnpm dev
```

### Run backend

```bash
cd apps/api
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:create_app --factory --reload
```

The web app runs at `http://localhost:3000`. The API runs at `http://localhost:8000`.

## Project Structure

```
Mergenix/
├── apps/
│   ├── web/                    # Next.js 15 frontend (React 19, Tailwind, Zustand)
│   └── api/                    # FastAPI backend (auth, payments, GDPR)
├── packages/
│   ├── genetics-engine/        # TypeScript genetics engine (Web Workers)
│   ├── shared-types/           # Shared TypeScript type definitions
│   └── genetics-data/          # Reference JSON data (diseases, traits, SNPs)
├── docs/                       # Architecture docs, PRDs, review personas
├── .github/                    # GitHub Actions CI/CD workflows
├── CLAUDE.md                   # AI assistant project rules
├── PROGRESS.md                 # Task tracking and project status
└── README.md                   # This file
```

## Quality Gates

Run these before every commit:

```bash
# Frontend + engine
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# Backend
cd apps/api && ruff check . && pytest tests/ -v -n auto
```

All commands are orchestrated via Turborepo and run from the repo root (except the backend commands).

## Development Workflow

1. Pull latest: `git pull origin main`
2. Check status: read `PROGRESS.md` for current sprint state
3. Create branch: `git checkout -b feature/your-feature`
4. Write tests first (TDD), then implement
5. Run quality gates (see above)
6. Commit using conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
7. Push branch and open a PR for review
8. Update `PROGRESS.md` at session end

## Disclaimer

Mergenix is an educational tool and does not provide medical advice, diagnosis, or treatment. Genetic predictions are probabilistic and based on population-level models. Many traits are polygenic and influenced by environment. Always consult a certified genetic counselor or healthcare professional for clinical interpretation of genetic data.

## Contributors

| Name  | Role           |
|-------|----------------|
| kukiz | Developer      |
| Claude | AI Assistant  |

## License

Private repository. All rights reserved.
