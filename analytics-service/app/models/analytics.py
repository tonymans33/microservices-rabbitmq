from sqlalchemy import Column, Integer, String, DateTime, Float, Text, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime, timezone

Base = declarative_base()

class UserRegistrationEvent(Base):
    """Store individual user registration events"""
    __tablename__ = "user_registration_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    email_domain = Column(String(100), nullable=False, index=True)  # gmail.com, outlook.com, etc.
    registration_time = Column(DateTime(timezone=True), nullable=False, index=True)
    processed_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    
    # Add indexes for better query performance
    __table_args__ = (
        Index('idx_registration_time', 'registration_time'),
        Index('idx_email_domain_time', 'email_domain', 'registration_time'),
    )

class DailyAnalytics(Base):
    """Store daily aggregated analytics"""
    __tablename__ = "daily_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False, unique=True, index=True)
    total_registrations = Column(Integer, default=0, nullable=False)
    unique_domains = Column(Integer, default=0, nullable=False)
    top_domain = Column(String(100))
    top_domain_count = Column(Integer, default=0)
    average_per_hour = Column(Float, default=0.0)
    peak_hour = Column(Integer)  # 0-23
    peak_hour_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

class HourlyAnalytics(Base):
    """Store hourly aggregated analytics"""
    __tablename__ = "hourly_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    hour_start = Column(DateTime(timezone=True), nullable=False, index=True)
    registrations_count = Column(Integer, default=0, nullable=False)
    unique_domains_count = Column(Integer, default=0)
    top_domains = Column(Text)  # JSON string of top domains
    created_at = Column(DateTime(timezone=True), default=func.now())
    
    __table_args__ = (
        Index('idx_hour_start', 'hour_start'),
    )

class DomainAnalytics(Base):
    """Store domain-specific analytics"""
    __tablename__ = "domain_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String(100), nullable=False, unique=True, index=True)
    total_registrations = Column(Integer, default=0, nullable=False)
    first_seen = Column(DateTime(timezone=True), nullable=False)
    last_seen = Column(DateTime(timezone=True), nullable=False)
    percentage_of_total = Column(Float, default=0.0)
    is_popular = Column(String(10), default='Unknown')  # Popular, Common, Rare
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())