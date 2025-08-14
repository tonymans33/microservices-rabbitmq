import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
import structlog
from app.models.analytics import Base

# Configure structured logging
logger = structlog.get_logger(__name__)

class DatabaseManager:
    def __init__(self):
        self.engine = None
        self.SessionLocal = None
        self._initialize_database()
    
    def _initialize_database(self):
        """Initialize database connection and create tables"""
        try:
            # Build connection URL
            db_url = self._build_database_url()
            
            # Create engine with connection pooling
            self.engine = create_engine(
                db_url,
                poolclass=QueuePool,
                pool_size=10,
                max_overflow=20,
                pool_pre_ping=True,
                echo=False  # Set to True for SQL debugging
            )
            
            # Create session factory
            self.SessionLocal = sessionmaker(
                autocommit=False, 
                autoflush=False, 
                bind=self.engine
            )
            
            # Create all tables
            self._create_tables()
            
            logger.info("✅ Database initialized successfully", 
                       database=os.getenv('DB_DATABASE', 'analytics_service'))
            
        except Exception as e:
            logger.error("❌ Failed to initialize database", error=str(e))
            raise
    
    def _build_database_url(self) -> str:
        """Build PostgreSQL connection URL from environment variables"""
        host = os.getenv('DB_HOST', 'localhost')
        port = os.getenv('DB_PORT', '5432')
        database = os.getenv('DB_DATABASE', 'analytics_service')
        username = os.getenv('DB_USERNAME', 'postgres')
        password = os.getenv('DB_PASSWORD', 'password')
        
        return f"postgresql://{username}:{password}@{host}:{port}/{database}"
    
    def _create_tables(self):
        """Create all database tables"""
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("📊 Database tables created/verified")
        except Exception as e:
            logger.error("❌ Failed to create tables", error=str(e))
            raise
    
    def get_session(self) -> Session:
        """Get database session"""
        if not self.SessionLocal:
            raise RuntimeError("Database not initialized")
        return self.SessionLocal()
    
    def close(self):
        """Close database connections"""
        if self.engine:
            self.engine.dispose()
            logger.info("🔒 Database connections closed")

# Global database manager instance
db_manager = DatabaseManager()

def get_db() -> Session:
    """Dependency for FastAPI to get database session"""
    db = db_manager.get_session()
    try:
        yield db
    finally:
        db.close()