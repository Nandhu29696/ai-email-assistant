from sqlalchemy import Column, String, Boolean, DateTime, Integer
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    email          = Column(String(255), unique=True, nullable=False, index=True)
    username       = Column(String(100), unique=True, nullable=False, index=True)
    full_name      = Column(String(255))
    hashed_password = Column(String(255), nullable=False)
    role           = Column(String(20), nullable=False, default="employee")  # admin | employee
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
