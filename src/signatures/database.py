"""
database.py — SQLite + SQLAlchemy persistent storage for golden signatures.
Stores signature metadata, version history, and operator decisions.
"""

import json
import os
import sys
from contextlib import contextmanager
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

# ---------------------------------------------------------------------------
# SQLAlchemy setup
# ---------------------------------------------------------------------------
_DB_PATH = os.path.join(_PROJECT_ROOT, "data", "golden", "signatures.db")
DATABASE_URL = f"sqlite:///{_DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class GoldenSignature(Base):
    __tablename__ = "golden_signature"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cluster_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    version = Column(Integer, default=1)
    parent_id = Column(Integer, ForeignKey("golden_signature.id"), nullable=True)
    source = Column(String, default="pareto")  # "pareto", "empirical", "updated"
    cpp_params_json = Column(Text, nullable=False)
    predicted_cqa_json = Column(Text, nullable=False)
    actual_cqa_json = Column(Text, nullable=True)
    pareto_rank = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    trigger_batch_id = Column(String, nullable=True)

    def __repr__(self):
        return (
            f"<GoldenSignature(id={self.id}, cluster={self.cluster_name}, "
            f"v={self.version}, active={self.is_active})>"
        )


class SignatureUpdate(Base):
    __tablename__ = "signature_update"

    id = Column(Integer, primary_key=True, autoincrement=True)
    signature_id = Column(Integer, ForeignKey("golden_signature.id"), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)
    trigger_batch_id = Column(String, nullable=False)
    delta_json = Column(Text, nullable=False)  # {"before": {...}, "after": {...}}
    reason = Column(String, nullable=False)

    def __repr__(self):
        return (
            f"<SignatureUpdate(id={self.id}, sig_id={self.signature_id}, "
            f"reason={self.reason})>"
        )


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------
def init_db():
    """Create all tables if they don't exist."""
    os.makedirs(os.path.dirname(_DB_PATH), exist_ok=True)
    Base.metadata.create_all(engine)
    print(f"  Database initialized → {_DB_PATH}")


@contextmanager
def get_session():
    """Yield a SQLAlchemy session, closing it in finally."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def seed_signatures(
    cluster_centroids_path: str = "data/golden/cluster_centroids.json",
):
    """
    Seed initial golden signatures from cluster centroids.
    Idempotent — skips clusters that already have a signature.
    """
    centroids_path = os.path.join(_PROJECT_ROOT, cluster_centroids_path)
    with open(centroids_path) as f:
        centroids = json.load(f)

    with get_session() as session:
        seeded = 0
        for cluster_name, cpp_params in centroids.items():
            # Check if already seeded
            existing = (
                session.query(GoldenSignature)
                .filter_by(cluster_name=cluster_name)
                .first()
            )
            if existing:
                print(f"  ⏭ {cluster_name}: already seeded (id={existing.id})")
                continue

            sig = GoldenSignature(
                cluster_name=cluster_name,
                version=1,
                source="pareto",
                is_active=True,
                cpp_params_json=json.dumps(cpp_params),
                predicted_cqa_json=json.dumps({}),
            )
            session.add(sig)
            seeded += 1
            print(f"  ✓ Seeded: {cluster_name}")

        session.commit()
        print(f"\n  Total seeded: {seeded}")


if __name__ == "__main__":
    print(f"{'='*60}")
    print(f"  Golden Signature Database Setup")
    print(f"{'='*60}")
    init_db()
    seed_signatures()
    print(f"{'='*60}")

    # Verify
    with get_session() as session:
        rows = session.query(GoldenSignature).all()
        print(f"\n  Verification — {len(rows)} signatures in DB:")
        for r in rows:
            print(f"    id={r.id}  cluster={r.cluster_name}  "
                  f"v={r.version}  active={r.is_active}  source={r.source}")
    print(f"{'='*60}")
