from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

# --------------------------------------------------------------------------- #
#  Engine                                                                       #
# --------------------------------------------------------------------------- #

engine = create_async_engine(
    str(settings.DATABASE_URL),
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,   # test connections before use — handles DB restarts
    echo=settings.APP_DEBUG,  # log all SQL in development only
)

# --------------------------------------------------------------------------- #
#  Session factory                                                              #
# --------------------------------------------------------------------------- #

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # keep attributes accessible after commit
    autoflush=False,
    autocommit=False,
)

# --------------------------------------------------------------------------- #
#  Base class for all ORM models                                               #
# --------------------------------------------------------------------------- #

class Base(DeclarativeBase):
    pass


# --------------------------------------------------------------------------- #
#  FastAPI dependency — yields a session per request                           #
# --------------------------------------------------------------------------- #

async def get_db() -> AsyncSession:
    """
    Use as a FastAPI Depends():
        async def my_route(db: AsyncSession = Depends(get_db)): ...

    The session is automatically committed on success and
    rolled back + closed on any exception.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()