import os
import json
import pika
import time
import threading
from typing import Optional
import structlog
from colorama import init, Fore, Style
from app.database.connection import db_manager
from app.services.analytics_service import AnalyticsService

# Initialize colorama for colored console output
init(autoreset=True)

logger = structlog.get_logger(__name__)

class RabbitMQConsumer:
    def __init__(self):
        self.connection: Optional[pika.BlockingConnection] = None
        self.channel: Optional[pika.channel.Channel] = None
        self.queue_name = "analytics.user.registered"
        self.processed_messages = 0
        self.is_consuming = False
        
    def connect(self) -> bool:
        """Connect to RabbitMQ with retry logic"""
        max_retries = 10
        retry_delay = 5
        
        for attempt in range(1, max_retries + 1):
            try:
                # Build connection parameters
                credentials = pika.PlainCredentials(
                    username=os.getenv('RABBITMQ_USERNAME', 'admin'),
                    password=os.getenv('RABBITMQ_PASSWORD', 'password')
                )
                
                parameters = pika.ConnectionParameters(
                    host=os.getenv('RABBITMQ_HOST', 'localhost'),
                    port=int(os.getenv('RABBITMQ_PORT', 5672)),
                    virtual_host=os.getenv('RABBITMQ_VHOST', '/'),
                    credentials=credentials,
                    heartbeat=600,
                    blocked_connection_timeout=300,
                )
                
                print(f"{Fore.CYAN}🔗 Connecting to RabbitMQ... (Attempt {attempt}/{max_retries})")
                print(f"{Fore.YELLOW}   HOST: {parameters.host}")
                print(f"{Fore.YELLOW}   PORT: {parameters.port}")
                print(f"{Fore.YELLOW}   USERNAME: {credentials.username}")
                print(f"{Fore.YELLOW}   VHOST: {parameters.virtual_host}")
                
                self.connection = pika.BlockingConnection(parameters)
                self.channel = self.connection.channel()
                
                print(f"{Fore.GREEN}✅ Connected to RabbitMQ successfully!")
                logger.info("Connected to RabbitMQ", attempt=attempt)
                return True
                
            except Exception as e:
                print(f"{Fore.RED}❌ RabbitMQ connection failed (Attempt {attempt}/{max_retries}): {e}")
                logger.error("RabbitMQ connection failed", attempt=attempt, error=str(e))
                
                if attempt == max_retries:
                    print(f"{Fore.RED}❌ Max retry attempts reached. Giving up.")
                    return False
                
                print(f"{Fore.YELLOW}⏳ Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
        
        return False
    
    def setup_queues(self):
        """Declare queues and exchanges"""
        try:
            # Declare the analytics queue
            self.channel.queue_declare(
                queue=self.queue_name,
                durable=True
            )
            
            print(f"{Fore.GREEN}📋 Queue '{self.queue_name}' is ready")
            logger.info("Queue declared", queue=self.queue_name)
            
        except Exception as e:
            print(f"{Fore.RED}❌ Failed to setup queues: {e}")
            logger.error("Failed to setup queues", error=str(e))
            raise
    
    def process_message(self, channel, method, properties, body):
        """Process incoming RabbitMQ message"""
        try:
            # Parse message
            message = json.loads(body)
            
            # Handle both "event" and "event_type" fields for compatibility
            event_type = message.get('event_type') or message.get('event')
            event_data = message.get('data', {})
            
            print(f"\n{Fore.CYAN}📨 Received event:")
            print(f"{Fore.CYAN}   Event Type: {event_type}")
            print(f"{Fore.CYAN}   User: {event_data.get('name')} ({event_data.get('email')})")
            print(f"{Fore.CYAN}   Timestamp: {event_data.get('created_at')}")
            
            # Process analytics
            if event_type == 'user.registered':
                db = db_manager.get_session()
                try:
                    analytics_service = AnalyticsService(db)
                    success = analytics_service.process_user_registration(event_data)
                    
                    if success:
                        self.processed_messages += 1
                        
                        print(f"\n{Fore.GREEN}📊 ANALYTICS PROCESSED")
                        print(f"{Fore.GREEN}{'='*50}")
                        print(f"{Fore.GREEN}🎯 User Analytics Updated!")
                        print(f"{Fore.GREEN}┌─────────────────────────────────────┐")
                        print(f"{Fore.GREEN}│ 👤 Name: {event_data.get('name'):<23} │")
                        print(f"{Fore.GREEN}│ 📧 Email: {event_data.get('email'):<22} │")
                        print(f"{Fore.GREEN}│ 🏷️  Domain: {event_data.get('email', '').split('@')[1] if '@' in event_data.get('email', '') else 'unknown':<21} │")
                        print(f"{Fore.GREEN}│ 🆔 ID: {event_data.get('user_id'):<27} │")
                        print(f"{Fore.GREEN}└─────────────────────────────────────┘")
                        print(f"{Fore.GREEN}📈 Stored in analytics database")
                        print(f"{Fore.GREEN}📊 Updated domain statistics")
                        print(f"{Fore.GREEN}⏰ Updated hourly trends")
                        print(f"{Fore.GREEN}📅 Updated daily aggregates")
                        print(f"{Fore.GREEN}{'='*50}")
                        print(f"{Fore.GREEN}✅ Message processed successfully! (Total: {self.processed_messages})")
                        
                        # Show summary every 5 messages
                        if self.processed_messages % 5 == 0:
                            self._show_analytics_summary(analytics_service)
                        
                        # Acknowledge message
                        channel.basic_ack(delivery_tag=method.delivery_tag)
                        
                    else:
                        print(f"{Fore.RED}❌ Failed to process analytics")
                        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
                        
                finally:
                    db.close()
            else:
                print(f"{Fore.YELLOW}⚠️  Unknown event type: {event_type}")
                channel.basic_ack(delivery_tag=method.delivery_tag)
                
        except json.JSONDecodeError:
            print(f"{Fore.RED}❌ Invalid JSON message")
            logger.error("Invalid JSON message", body=body.decode())
            channel.basic_ack(delivery_tag=method.delivery_tag)  # Discard invalid message
            
        except Exception as e:
            print(f"{Fore.RED}❌ Error processing message: {e}")
            logger.error("Error processing message", error=str(e))
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    def _show_analytics_summary(self, analytics_service: AnalyticsService):
        """Show analytics summary every few messages"""
        try:
            stats = analytics_service.get_dashboard_stats()
            
            print(f"\n{Fore.MAGENTA}📊 ANALYTICS SUMMARY")
            print(f"{Fore.MAGENTA}{'='*60}")
            print(f"{Fore.MAGENTA}Total registrations processed: {stats.get('total_registrations', 0)}")
            print(f"{Fore.MAGENTA}Unique email domains: {stats.get('unique_domains', 0)}")
            print(f"{Fore.MAGENTA}Today's registrations: {stats.get('today_registrations', 0)}")
            
            top_domains = stats.get('top_domains', [])[:3]
            if top_domains:
                print(f"{Fore.MAGENTA}Top domains:")
                for i, domain in enumerate(top_domains, 1):
                    print(f"{Fore.MAGENTA}  {i}. {domain['domain']} ({domain['count']} users)")
            
            print(f"{Fore.MAGENTA}{'='*60}")
            
        except Exception as e:
            logger.error("Failed to show analytics summary", error=str(e))
    
    def start_consuming(self):
        """Start consuming messages"""
        if not self.connect():
            return False
        
        try:
            self.setup_queues()
            
            # Configure QoS
            self.channel.basic_qos(prefetch_count=1)
            
            # Start consuming
            self.channel.basic_consume(
                queue=self.queue_name,
                on_message_callback=self.process_message
            )
            
            self.is_consuming = True
            
            print(f"\n{Fore.GREEN}🎯 Starting to consume from: {self.queue_name}")
            print(f"{Fore.GREEN}👂 Waiting for analytics events... (Press Ctrl+C to exit)")
            print(f"{Fore.GREEN}{'='*60}\n")
            
            self.channel.start_consuming()
            
        except KeyboardInterrupt:
            print(f"\n{Fore.YELLOW}⏹️  Stopping consumer...")
            self.stop_consuming()
            
        except Exception as e:
            print(f"{Fore.RED}❌ Error during consumption: {e}")
            logger.error("Error during consumption", error=str(e))
            return False
    
    def stop_consuming(self):
        """Stop consuming messages gracefully"""
        self.is_consuming = False
        if self.channel:
            self.channel.stop_consuming()
        if self.connection:
            self.connection.close()
        print(f"{Fore.YELLOW}🔒 RabbitMQ consumer stopped")

# Global consumer instance
consumer = RabbitMQConsumer()