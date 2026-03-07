# Mergenix API (Backend)

FastAPI backend for the Mergenix Genetic Analysis Platform.

## Tech Stack

- **Framework:** FastAPI 0.115+
- **Language:** Python 3.12+
- **ORM:** SQLAlchemy 2.0 (async) + Alembic migrations
- **Database:** PostgreSQL 16 (asyncpg driver)
- **Auth:** JWT (python-jose) + TOTP 2FA (pyotp)
- **Payments:** Stripe
- **Email:** Resend
- **Monitoring:** Sentry + structlog
- **Rate Limiting:** slowapi
- **Testing:** pytest + pytest-asyncio

## Getting Started

### Prerequisites

- Python >= 3.12
- PostgreSQL 16 (or use Docker Compose from repo root)

### Setup

```bash
# Navigate to API directory
cd apps/api

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install dev dependencies
pip install -e ".[dev]"
```

### Database Setup

```bash
# Option 1: Use Docker Compose (from repo root)
docker compose -f docker-compose.rewrite.yml up db -d

# Option 2: Use existing PostgreSQL
# Set DATABASE_URL in your .env file

# Run migrations
alembic upgrade head
```

### Environment Variables

Create a `.env` file in `apps/api/` (see `.env.rewrite.example` in repo root):

```bash
DATABASE_URL=postgresql+asyncpg://mergenix:mergenix@localhost:5432/mergenix
JWT_SECRET=your-jwt-secret
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
```

### Run the Server

```bash
# Development (with auto-reload)
uvicorn app.main:create_app --factory --reload --host 0.0.0.0 --port 8000

# Or from repo root
pnpm db:migrate  # Run migrations first
```

The API runs at [http://localhost:8000](http://localhost:8000).

API docs available at:

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## Development Commands

```bash
# Lint
ruff check app/

# Format
ruff format app/

# Type check
mypy app/

# Run tests
pytest tests/ -v

# Run tests with coverage
pytest tests/ -v --cov=app --cov-report=term-missing

# Run a single test file
pytest tests/test_auth.py -v
```

## Project Structure

```
apps/api/
├── app/              # Application package
│   ├── __init__.py
│   ├── main.py       # FastAPI app factory
│   ├── config.py     # Pydantic settings
│   ├── database.py   # SQLAlchemy async engine & session
│   ├── models/       # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── payment.py
│   │   └── audit.py
│   └── schemas/      # Pydantic request/response schemas
├── tests/            # pytest test suite
├── alembic/          # Database migrations
├── Dockerfile        # Multi-stage production Docker build
├── requirements.txt  # Production dependencies
└── pyproject.toml    # Ruff, pytest, mypy configuration
```

## Docker

```bash
# Build the image
docker build -t mergenix-api .

# Run the container
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql+asyncpg://... \
  -e JWT_SECRET=... \
  mergenix-api
```

## Health Check

The API exposes a `/health` endpoint for monitoring and Docker health checks.
