import uuid
from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from utils.database import Base


class RepoStatus(StrEnum):
    pending = "pending"
    indexing = "indexing"
    indexed = "indexed"
    failed = "failed"


class Repository(Base):
    __tablename__ = "repositories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    github_id: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(512), nullable=False)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    status: Mapped[RepoStatus] = mapped_column(Enum(RepoStatus), default=RepoStatus.pending, nullable=False)
    last_indexed: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship("User", back_populates="repositories")
    files: Mapped[list["File"]] = relationship("File", back_populates="repository", cascade="all, delete-orphan")
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="repository", cascade="all, delete-orphan")
