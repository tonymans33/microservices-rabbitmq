import os
import threading
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
from colorama import init, Fore, Style
from app.api.analytics_routes import router as analytics_router
from app.services.rabbitmq_consumer import consumer
from app.database.connection import db_manager

# Initialize colorama for colored output
init(autoreset=True)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

def start_rabbitmq_consumer():
    """Start RabbitMQ consumer in background thread"""
    try:
        print(f"{Fore.CYAN}🐰 Starting RabbitMQ consumer thread...")
        consumer.start_consuming()
    except Exception as e:
        logger.error("RabbitMQ consumer failed", error=str(e))
        print(f"{Fore.RED}❌ RabbitMQ consumer failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    print(f"\n{Fore.GREEN}{'='*60}")
    print(f"{Fore.GREEN}🐍 PYTHON ANALYTICS SERVICE STARTED")
    print(f"{Fore.GREEN}{'='*60}")
    print(f"{Fore.GREEN}📊 FastAPI server running on port: 4000")
    print(f"{Fore.GREEN}🌍 Environment: {os.getenv('ENVIRONMENT', 'development')}")
    print(f"{Fore.GREEN}📊 Health check: http://localhost:4000/api/analytics/health")
    print(f"{Fore.GREEN}📈 Dashboard API: http://localhost:4000/api/analytics/dashboard")
    print(f"{Fore.GREEN}📖 API Docs: http://localhost:4000/docs")
    print(f"{Fore.GREEN}{'='*60}\n")
    
    logger.info("Analytics service starting up")
    
    # Start RabbitMQ consumer in background thread
    consumer_thread = threading.Thread(target=start_rabbitmq_consumer, daemon=True)
    consumer_thread.start()
    
    # Give the consumer a moment to start
    time.sleep(2)
    
    yield
    
    # Shutdown
    print(f"\n{Fore.YELLOW}🔄 Shutting down Analytics Service...")
    logger.info("Analytics service shutting down")
    
    # Stop RabbitMQ consumer
    consumer.stop_consuming()
    
    # Close database connections
    db_manager.close()
    
    print(f"{Fore.YELLOW}👋 Analytics Service stopped")

# Create FastAPI application
app = FastAPI(
    title="Analytics Service",
    description="Microservice for user registration analytics and insights",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(analytics_router)

@app.get("/")
def root():
    """Root endpoint"""
    return {
        "service": "analytics-service",
        "message": "Python Analytics Service is running!",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/analytics/health"
    }

@app.get("/health")
def health():
    """Alternative health endpoint"""
    return {
        "service": "analytics-service",
        "status": "healthy",
        "database": "connected" if db_manager.engine else "disconnected",
        "rabbitmq": "consuming" if consumer.is_consuming else "disconnected"
    }

if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=4000,
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info"
    )