import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sender: Mapped[str | None] = mapped_column(String(128), nullable=True)
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_flagged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    classification: Mapped["Classification"] = relationship(
        back_populates="message", uselist=False, lazy="joined"
    )

    __table_args__ = (
        Index("ix_messages_created_at", "created_at"),
        Index("ix_messages_is_flagged", "is_flagged"),
        Index("ix_messages_source", "source"),
        Index("ix_messages_sender", "sender"),
    )


class Classification(Base):
    __tablename__ = "classifications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("messages.id"), unique=True, nullable=False
    )
    toxicity: Mapped[float] = mapped_column(Float, nullable=False)
    severe_toxicity: Mapped[float] = mapped_column(Float, nullable=False)
    obscene: Mapped[float] = mapped_column(Float, nullable=False)
    threat: Mapped[float] = mapped_column(Float, nullable=False)
    insult: Mapped[float] = mapped_column(Float, nullable=False)
    identity_attack: Mapped[float] = mapped_column(Float, nullable=False)
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    message: Mapped["Message"] = relationship(back_populates="classification")
