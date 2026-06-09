import uuid
from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import String, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from utils.database import Base


class DocumentStatus(StrEnum):
    pending = "pending"
    generating = "generating"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repo_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repositories.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(Enum(DocumentStatus), default=DocumentStatus.pending)
    
    # Store template configs, author overrides, etc.
    meta_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True) 
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="documents")
    chapters: Mapped[list["Chapter"]] = relationship("Chapter", back_populates="document", cascade="all, delete-orphan", order_by="Chapter.order")
    exports: Mapped[list["Export"]] = relationship("Export", back_populates="document", cascade="all, delete-orphan")
