from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, DateTime, Text, Index, text
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


class User(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            # do not serialize the password, its a security breach
        }

    def set_password(self, plain_password):
        self.password = generate_password_hash(str(plain_password))

    def check_password(self, plain_password):
        if not self.password:
            return False
        try:
            return check_password_hash(self.password, str(plain_password))
        except ValueError:
            return False

    def has_hashed_password(self):
        return isinstance(self.password, str) and self.password.startswith("scrypt:")


class Reservation(db.Model):
    __table_args__ = (
        Index(
            "uq_reservation_active_slot",
            "reservation_date",
            "reservation_time",
            unique=True,
            postgresql_where=text("status <> 'cancelada'"),
            sqlite_where=text("status <> 'cancelada'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    service: Mapped[str] = mapped_column(String(120), nullable=False)
    reservation_date: Mapped[str] = mapped_column(String(10), nullable=False)
    reservation_time: Mapped[str] = mapped_column(String(5), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pendiente")
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.created_at is None:
            self.created_at = datetime.utcnow()

    def serialize(self):
        created_at_str = self.created_at.isoformat() if self.created_at else None
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "service": self.service,
            "reservation_date": self.reservation_date,
            "reservation_time": self.reservation_time,
            "status": self.status,
            "message": self.message,
            "created_at": created_at_str
        }
