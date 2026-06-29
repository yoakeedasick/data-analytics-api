from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

_engine = None
_SessionLocal = None


def _get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        _engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
        _SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=_engine)
    return _engine


def _get_session_local():
    _get_engine()
    return _SessionLocal


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency: yields a database session and ensures it is closed."""
    SessionLocal = _get_session_local()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
