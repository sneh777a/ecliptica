from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode


def _normalize_database_url(url: str) -> str:
    """Convert Neon/Postgres URLs to asyncpg-friendly form."""
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # asyncpg does not accept sslmode / channel_binding query params
    parsed = urlparse(url)
    if parsed.query:
        q = parse_qs(parsed.query)
        q.pop("sslmode", None)
        q.pop("channel_binding", None)
        clean_query = urlencode({k: v[0] for k, v in q.items()}) if q else ""
        url = urlunparse(parsed._replace(query=clean_query))

    return url


raw_url = os.getenv("DATABASE_URL", "").strip()
if not raw_url:
    raise RuntimeError(
        "DATABASE_URL is not set. "
        "Add it in Render Environment (Neon connection string)."
    )

DATABASE_URL = _normalize_database_url(raw_url)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"ssl": True},
)

AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
