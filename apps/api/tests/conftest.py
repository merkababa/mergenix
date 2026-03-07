"""
Shared test fixtures for the Mergenix API test suite.

Uses an in-memory SQLite database via aiosqlite for fast, isolated tests.
Each test function gets a fresh database (tables are created and dropped
per-test).

Environment variables MUST be set before importing any app modules,
because app.database creates the SQLAlchemy engine at module scope.
"""

from __future__ import annotations

# ── Pre-import environment setup ─────────────────────────────────────────
# These MUST be set before any app module is imported, because
# app.database.py creates the engine at module import time.
import os

os.environ["JWT_SECRET"] = "test-secret-key-for-testing-only"
os.environ["ENVIRONMENT"] = "development"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_fake"
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_test_fake"
os.environ["STRIPE_PRICE_PREMIUM"] = "price_test_premium"
os.environ["STRIPE_PRICE_PRO"] = "price_test_pro"
os.environ["COOKIE_SECURE"] = "false"
os.environ["ANALYTICS_API_KEY"] = "test-analytics-key-for-testing"
# Fixed Fernet key for deterministic test encryption (32 url-safe base64 bytes = 44 chars).
# Generated with: from cryptography.fernet import Fernet; Fernet.generate_key().decode()
os.environ["TOTP_ENCRYPTION_KEY"] = "ZmDfcTF7_60GrrY167zsiPd67pEvs0aGOv2oasOM1Pg="

# Clear any cached settings from previous test runs
from app.config import get_settings  # noqa: E402

get_settings.cache_clear()

# ── Disable slowapi rate limiter BEFORE routers are imported ─────────────
# slowapi's @limiter.limit() decorator wraps endpoint functions and creates
# a closure whose __globals__ come from slowapi's module, NOT the router's
# module. When routers use `from __future__ import annotations`, FastAPI
# needs to resolve ForwardRef annotations using the endpoint function's
# __globals__. The wrapper's __globals__ lack the router's imports
# (RegisterRequest, DbSession, etc.), causing FastAPI to treat body and
# dependency params as query params (HTTP 422).
#
# Fix: replace limiter.limit with an identity decorator BEFORE routers
# are imported, so endpoint functions keep their original __globals__.
from app.middleware.rate_limiter import limiter  # noqa: E402

limiter.enabled = False
limiter._original_limit = limiter.limit  # type: ignore[attr-defined]
limiter.limit = lambda *args, **kwargs: lambda func: func  # type: ignore[assignment]

# ── Test Database ─────────────────────────────────────────────────────────
# Create the test engine BEFORE importing app modules so we can patch
# app.database.engine before app.main triggers router imports.

from sqlalchemy import event  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
)


# Enable foreign key enforcement for SQLite (required for CASCADE deletes)
@event.listens_for(test_engine.sync_engine, "connect")
def _enable_sqlite_fks(dbapi_connection, connection_record):  # type: ignore[no-untyped-def]
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestSessionFactory = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Patch the database engine BEFORE any app modules that use it are imported.
# app.database creates the engine at module scope with PostgreSQL pool params.
import app.database as _db_module_early  # noqa: E402

_db_module_early.engine = test_engine

# ── Now safe to import app modules ───────────────────────────────────────

import uuid  # noqa: E402
from collections.abc import AsyncGenerator  # noqa: E402
from datetime import UTC, date, datetime, timedelta  # noqa: E402
from unittest.mock import AsyncMock, patch  # noqa: E402

import pyotp  # noqa: E402
import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models.audit import Session  # noqa: E402
from app.models.payment import Payment  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.auth_service import (  # noqa: E402
    create_access_token,
    create_refresh_token,
    hash_password,
)
from app.utils.encryption import encrypt_totp_secret  # noqa: E402
from app.utils.security import hash_token  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

# ── Fixtures ──────────────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield a clean database session with all tables created."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionFactory() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def app(db_session: AsyncSession):
    """Create a test FastAPI app with the database dependency overridden.

    Rate limiting and database engine are patched at module level (above)
    before any router imports, so the slowapi decorators are replaced with
    identity decorators and the lifespan handler uses the test engine.
    """
    _app = create_app()

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    _app.dependency_overrides[get_db] = _override_get_db

    yield _app


@pytest_asyncio.fixture
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    """Yield an async HTTP test client.

    Includes the X-Requested-With: XMLHttpRequest header by default to
    satisfy the CSRF middleware. Tests that specifically verify CSRF
    rejection should override or omit this header explicitly.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers={"X-Requested-With": "XMLHttpRequest"},
    ) as c:
        yield c


@pytest_asyncio.fixture
async def client_no_csrf(app) -> AsyncGenerator[AsyncClient, None]:
    """Yield an async HTTP test client WITHOUT the CSRF header.

    Used by tests that specifically verify CSRF middleware rejection
    behavior — i.e., that requests without X-Requested-With get 403.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create and return a standard test user in the database."""
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        password_hash=await hash_password("TestPass123"),
        name="Test User",
        tier="free",
        email_verified=True,
        date_of_birth=date(1990, 1, 15),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def premium_user(db_session: AsyncSession) -> User:
    """Create and return a premium-tier test user."""
    user = User(
        id=uuid.uuid4(),
        email="premium@example.com",
        password_hash=await hash_password("PremPass123"),
        name="Premium User",
        tier="premium",
        email_verified=True,
        date_of_birth=date(1990, 1, 15),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def pro_user(db_session: AsyncSession) -> User:
    """Create and return a pro-tier test user."""
    user = User(
        id=uuid.uuid4(),
        email="pro@example.com",
        password_hash=await hash_password("ProPass123"),
        name="Pro User",
        tier="pro",
        email_verified=True,
        date_of_birth=date(1990, 1, 15),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(test_user: User) -> dict[str, str]:
    """Return Authorization headers with a valid access token for test_user."""
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def premium_auth_headers(premium_user: User) -> dict[str, str]:
    """Return Authorization headers for the premium test user."""
    token = create_access_token(premium_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def pro_auth_headers(pro_user: User) -> dict[str, str]:
    """Return Authorization headers for the pro test user."""
    token = create_access_token(pro_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def unverified_user(db_session: AsyncSession) -> User:
    """Create and return a user whose email is NOT verified."""
    user = User(
        id=uuid.uuid4(),
        email="unverified@example.com",
        password_hash=await hash_password("UnverPass123"),
        name="Unverified User",
        tier="free",
        email_verified=False,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def totp_user(db_session: AsyncSession) -> tuple[User, str]:
    """Create a user with TOTP 2FA enabled and return (user, totp_secret).

    Also stores SHA-256-hashed backup codes in the user record.
    """
    secret = pyotp.random_base32()
    backup_codes = ["abcd-ef01", "1234-5678", "dead-beef"]
    hashed_codes = [hash_token(c) for c in backup_codes]

    user = User(
        id=uuid.uuid4(),
        email="totp@example.com",
        password_hash=await hash_password("TotpPass123"),
        name="TOTP User",
        tier="free",
        email_verified=True,
        totp_secret=encrypt_totp_secret(secret),
        totp_enabled=True,
        backup_codes=hashed_codes,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user, secret


@pytest_asyncio.fixture
async def payment_record(db_session: AsyncSession, test_user: User) -> Payment:
    """Create a single payment record for the test_user."""
    payment = Payment(
        id=uuid.uuid4(),
        user_id=test_user.id,
        stripe_customer_id="cus_test123",
        stripe_payment_intent="pi_test123",
        amount=1499,
        currency="usd",
        status="succeeded",
        tier_granted="premium",
        created_at=datetime.now(UTC),
    )
    db_session.add(payment)
    await db_session.commit()
    await db_session.refresh(payment)
    return payment


@pytest_asyncio.fixture
async def user_with_session(
    db_session: AsyncSession,
    test_user: User,
) -> tuple[User, str]:
    """Create a test user with an active session and return (user, raw_refresh_token).

    The refresh token is stored as a Session record in the DB and can be used
    as a cookie value for endpoints that read from cookies.
    """
    raw_refresh = create_refresh_token(test_user.id)
    session = Session(
        user_id=test_user.id,
        refresh_token_hash=hash_token(raw_refresh),
        expires_at=datetime.now(UTC) + timedelta(days=7),
        ip_address="127.0.0.1",
        user_agent="pytest-client",
    )
    db_session.add(session)
    await db_session.commit()
    return test_user, raw_refresh


@pytest.fixture
def mock_email():
    """Mock the async email sending functions to prevent actual email dispatch."""
    with (
        patch("app.routers.auth.send_verification_email", new_callable=AsyncMock) as mock_verify,
        patch("app.routers.auth.send_password_reset_email", new_callable=AsyncMock) as mock_reset,
    ):
        mock_verify.return_value = True
        mock_reset.return_value = True
        yield {"verify": mock_verify, "reset": mock_reset}


@pytest.fixture
def mock_receipt_email():
    """Mock the purchase receipt email to prevent actual email dispatch during webhook tests."""
    with patch(
        "app.services.payment_service.send_purchase_receipt_email",
        new_callable=AsyncMock,
    ) as mock_receipt:
        mock_receipt.return_value = True
        yield mock_receipt


@pytest.fixture
def mock_stripe():
    """Mock Stripe API calls for payment tests."""
    with (
        patch("app.services.payment_service.stripe.checkout.Session.create") as mock_create,
        patch("app.services.payment_service.stripe.Webhook.construct_event") as mock_construct,
    ):
        yield {"create": mock_create, "construct_event": mock_construct}
