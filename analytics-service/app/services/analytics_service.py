import json
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import structlog
from app.models.analytics import (
    UserRegistrationEvent, 
    DailyAnalytics, 
    HourlyAnalytics, 
    DomainAnalytics
)

logger = structlog.get_logger(__name__)

class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
    
    def process_user_registration(self, event_data: Dict) -> bool:
        """Process a user registration event and update analytics"""
        try:
            # Extract event data
            user_id = event_data.get('user_id')
            name = event_data.get('name')
            email = event_data.get('email')
            created_at = event_data.get('created_at')
            
            if not all([user_id, name, email, created_at]):
                logger.error("❌ Missing required fields in event data", data=event_data)
                return False
            
            # Parse registration time
            reg_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            # Extract email domain
            email_domain = email.split('@')[1].lower() if '@' in email else 'unknown'
            
            # Store individual event
            self._store_registration_event(user_id, name, email, email_domain, reg_time)
            
            # Update aggregated analytics
            self._update_domain_analytics(email_domain, reg_time)
            self._update_hourly_analytics(reg_time)
            self._update_daily_analytics(reg_time.date())
            
            self.db.commit()
            
            logger.info("📊 Analytics updated successfully", 
                       user_id=user_id, email=email, domain=email_domain)
            
            return True
            
        except Exception as e:
            logger.error("❌ Failed to process registration event", error=str(e))
            self.db.rollback()
            return False
    
    def _store_registration_event(self, user_id: int, name: str, email: str, 
                                 domain: str, reg_time: datetime):
        """Store individual registration event"""
        event = UserRegistrationEvent(
            user_id=user_id,
            name=name,
            email=email,
            email_domain=domain,
            registration_time=reg_time
        )
        self.db.add(event)
    
    def _update_domain_analytics(self, domain: str, reg_time: datetime):
        """Update domain-specific analytics"""
        domain_analytics = self.db.query(DomainAnalytics).filter_by(domain=domain).first()
        
        if domain_analytics:
            # Update existing domain
            domain_analytics.total_registrations += 1
            domain_analytics.last_seen = reg_time
        else:
            # Create new domain entry
            domain_analytics = DomainAnalytics(
                domain=domain,
                total_registrations=1,
                first_seen=reg_time,
                last_seen=reg_time
            )
            self.db.add(domain_analytics)
        
        # Classify domain popularity
        total_users = self.db.query(func.count(UserRegistrationEvent.id)).scalar()
        if total_users > 0:
            percentage = (domain_analytics.total_registrations / total_users) * 100
            domain_analytics.percentage_of_total = percentage
            
            if percentage >= 10:
                domain_analytics.is_popular = 'Popular'
            elif percentage >= 1:
                domain_analytics.is_popular = 'Common'
            else:
                domain_analytics.is_popular = 'Rare'
    
    def _update_hourly_analytics(self, reg_time: datetime):
        """Update hourly analytics"""
        hour_start = reg_time.replace(minute=0, second=0, microsecond=0)
        
        hourly = self.db.query(HourlyAnalytics).filter_by(hour_start=hour_start).first()
        
        if hourly:
            hourly.registrations_count += 1
        else:
            hourly = HourlyAnalytics(
                hour_start=hour_start,
                registrations_count=1
            )
            self.db.add(hourly)
    
    def _update_daily_analytics(self, reg_date):
        """Update daily analytics"""
        daily = self.db.query(DailyAnalytics).filter(
            func.date(DailyAnalytics.date) == reg_date
        ).first()
        
        if daily:
            daily.total_registrations += 1
        else:
            daily = DailyAnalytics(
                date=datetime.combine(reg_date, datetime.min.time()).replace(tzinfo=timezone.utc),
                total_registrations=1
            )
            self.db.add(daily)
    
    def get_dashboard_stats(self) -> Dict:
        """Get comprehensive dashboard statistics"""
        try:
            # Total registrations
            total_registrations = self.db.query(func.count(UserRegistrationEvent.id)).scalar()
            
            # Today's registrations
            today = datetime.now(timezone.utc).date()
            today_registrations = self.db.query(func.count(UserRegistrationEvent.id)).filter(
                func.date(UserRegistrationEvent.registration_time) == today
            ).scalar()
            
            # Top domains
            top_domains = self.db.query(
                DomainAnalytics.domain,
                DomainAnalytics.total_registrations,
                DomainAnalytics.percentage_of_total
            ).order_by(desc(DomainAnalytics.total_registrations)).limit(5).all()
            
            # Recent registrations (last 24 hours)
            yesterday = datetime.now(timezone.utc) - timedelta(days=1)
            recent_registrations = self.db.query(func.count(UserRegistrationEvent.id)).filter(
                UserRegistrationEvent.registration_time >= yesterday
            ).scalar()
            
            # Peak hour today
            peak_hour_data = self.db.query(
                func.extract('hour', UserRegistrationEvent.registration_time).label('hour'),
                func.count(UserRegistrationEvent.id).label('count')
            ).filter(
                func.date(UserRegistrationEvent.registration_time) == today
            ).group_by('hour').order_by(desc('count')).first()
            
            return {
                "total_registrations": total_registrations or 0,
                "today_registrations": today_registrations or 0,
                "last_24h_registrations": recent_registrations or 0,
                "top_domains": [
                    {
                        "domain": domain,
                        "count": count,
                        "percentage": round(percentage, 2) if percentage else 0
                    }
                    for domain, count, percentage in top_domains
                ],
                "peak_hour": {
                    "hour": int(peak_hour_data.hour) if peak_hour_data else None,
                    "registrations": int(peak_hour_data.count) if peak_hour_data else 0
                },
                "unique_domains": self.db.query(func.count(DomainAnalytics.id)).scalar() or 0
            }
            
        except Exception as e:
            logger.error("❌ Failed to get dashboard stats", error=str(e))
            return {}
    
    def get_hourly_trends(self, days: int = 7) -> List[Dict]:
        """Get hourly registration trends for the last N days"""
        try:
            start_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            hourly_data = self.db.query(
                HourlyAnalytics.hour_start,
                HourlyAnalytics.registrations_count
            ).filter(
                HourlyAnalytics.hour_start >= start_date
            ).order_by(HourlyAnalytics.hour_start).all()
            
            return [
                {
                    "timestamp": hour_start.isoformat(),
                    "registrations": count
                }
                for hour_start, count in hourly_data
            ]
            
        except Exception as e:
            logger.error("❌ Failed to get hourly trends", error=str(e))
            return []