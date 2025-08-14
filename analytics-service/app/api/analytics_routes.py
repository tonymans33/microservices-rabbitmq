from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime, timezone
import structlog
from app.database.connection import get_db
from app.services.analytics_service import AnalyticsService
from app.models.analytics import UserRegistrationEvent, DomainAnalytics

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "service": "analytics-service",
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    }

@router.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get comprehensive dashboard statistics"""
    try:
        analytics_service = AnalyticsService(db)
        stats = analytics_service.get_dashboard_stats()
        
        return {
            "success": True,
            "data": stats,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error("Failed to get dashboard stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard statistics")

@router.get("/trends/hourly")
def get_hourly_trends(
    days: int = Query(7, ge=1, le=30, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Get hourly registration trends"""
    try:
        analytics_service = AnalyticsService(db)
        trends = analytics_service.get_hourly_trends(days=days)
        
        return {
            "success": True,
            "data": trends,
            "period_days": days,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error("Failed to get hourly trends", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve hourly trends")

@router.get("/domains")
def get_domain_analytics(
    limit: int = Query(10, ge=1, le=100, description="Number of domains to return"),
    db: Session = Depends(get_db)
):
    """Get domain analytics"""
    try:
        domains = db.query(DomainAnalytics).order_by(
            DomainAnalytics.total_registrations.desc()
        ).limit(limit).all()
        
        domain_data = [
            {
                "domain": domain.domain,
                "total_registrations": domain.total_registrations,
                "percentage_of_total": round(domain.percentage_of_total, 2) if domain.percentage_of_total else 0,
                "popularity": domain.is_popular,
                "first_seen": domain.first_seen.isoformat() if domain.first_seen else None,
                "last_seen": domain.last_seen.isoformat() if domain.last_seen else None
            }
            for domain in domains
        ]
        
        return {
            "success": True,
            "data": domain_data,
            "total_domains": len(domain_data),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error("Failed to get domain analytics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve domain analytics")

@router.get("/registrations/recent")
def get_recent_registrations(
    limit: int = Query(20, ge=1, le=100, description="Number of recent registrations"),
    db: Session = Depends(get_db)
):
    """Get recent user registrations"""
    try:
        registrations = db.query(UserRegistrationEvent).order_by(
            UserRegistrationEvent.registration_time.desc()
        ).limit(limit).all()
        
        registration_data = [
            {
                "user_id": reg.user_id,
                "name": reg.name,
                "email": reg.email,
                "email_domain": reg.email_domain,
                "registration_time": reg.registration_time.isoformat(),
                "processed_at": reg.processed_at.isoformat()
            }
            for reg in registrations
        ]
        
        return {
            "success": True,
            "data": registration_data,
            "count": len(registration_data),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error("Failed to get recent registrations", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve recent registrations")

@router.get("/stats/summary")
def get_stats_summary(db: Session = Depends(get_db)):
    """Get quick statistics summary"""
    try:
        from sqlalchemy import func
        
        # Get basic counts
        total_registrations = db.query(func.count(UserRegistrationEvent.id)).scalar() or 0
        unique_domains = db.query(func.count(DomainAnalytics.id)).scalar() or 0
        
        # Get today's registrations
        today = datetime.now(timezone.utc).date()
        today_registrations = db.query(func.count(UserRegistrationEvent.id)).filter(
            func.date(UserRegistrationEvent.registration_time) == today
        ).scalar() or 0
        
        return {
            "success": True,
            "data": {
                "total_registrations": total_registrations,
                "unique_domains": unique_domains,
                "today_registrations": today_registrations,
                "service_uptime": "Running",
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        }
    except Exception as e:
        logger.error("Failed to get stats summary", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics summary")