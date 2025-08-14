#!/bin/bash

echo "🚀 Setting up Kong API Gateway..."

# Wait for Kong to be ready
echo "⏳ Waiting for Kong to be ready..."
until curl -s http://localhost:8001/status > /dev/null; do
  echo "Waiting for Kong..."
  sleep 2
done

echo "✅ Kong is ready!"

# ===================================
# SERVICE 1: USER SERVICE
# ===================================

echo "🔧 Setting up User Service..."

# Create service
curl -X POST http://localhost:8001/services \
  --data "name=user-service" \
  --data "url=http://nginx-user:80" \
  --data "retries=3" \
  --data "connect_timeout=30000" \
  --data "write_timeout=30000" \
  --data "read_timeout=30000"

# Create route for user service
curl -X POST http://localhost:8001/services/user-service/routes \
  --data "name=user-service-route" \
  --data "paths[]=/api/users" \
  --data "strip_path=false"

echo "✅ User service configured!"

# ===================================
# SERVICE 2: EMAIL SERVICE
# ===================================

echo "🔧 Setting up Email Service..."

# Create service
curl -X POST http://localhost:8001/services \
  --data "name=email-service" \
  --data "url=http://nginx-email:80" \
  --data "retries=3" \
  --data "connect_timeout=30000" \
  --data "write_timeout=30000" \
  --data "read_timeout=30000"

# Create route for email service
curl -X POST http://localhost:8001/services/email-service/routes \
  --data "name=email-service-route" \
  --data "paths[]=/api/emails" \
  --data "strip_path=false"

echo "✅ Email service configured!"

# ===================================
# SERVICE 3: NOTIFICATION SERVICE
# ===================================

echo "🔧 Setting up Notification Service..."

# Create service
curl -X POST http://localhost:8001/services \
  --data "name=notification-service" \
  --data "url=http://notification-service:3000" \
  --data "retries=3" \
  --data "connect_timeout=30000" \
  --data "write_timeout=30000" \
  --data "read_timeout=30000"

# Create route for notification service
curl -X POST http://localhost:8001/services/notification-service/routes \
  --data "name=notification-service-route" \
  --data "paths[]=/api/notifications" \
  --data "strip_path=false"

echo "✅ Notification service configured!"

# ===================================
# SERVICE 4: ANALYTICS SERVICE
# ===================================

echo "🔧 Setting up Analytics Service..."

# Create service
curl -X POST http://localhost:8001/services \
  --data "name=analytics-service" \
  --data "url=http://analytics-service:4000" \
  --data "retries=3" \
  --data "connect_timeout=30000" \
  --data "write_timeout=30000" \
  --data "read_timeout=30000"

# Create route for analytics service
curl -X POST http://localhost:8001/services/analytics-service/routes \
  --data "name=analytics-service-route" \
  --data "paths[]=/api/analytics" \
  --data "strip_path=false"

echo "✅ Analytics service configured!"

# ===================================
# ADD RATE LIMITING (Optional)
# ===================================

echo "🔧 Adding rate limiting..."

# Add rate limiting to all services (100 requests per minute)
for service in user-service email-service notification-service analytics-service; do
  curl -X POST http://localhost:8001/services/${service}/plugins \
    --data "name=rate-limiting" \
    --data "config.minute=100" \
    --data "config.hour=1000"
done

echo "✅ Rate limiting configured!"

# ===================================
# SHOW CONFIGURATION
# ===================================

echo ""
echo "🎉 Kong setup complete!"
echo ""
echo "📋 Your API Gateway is now available at:"
echo "   http://localhost:8000"
echo ""
echo "🔗 Service Routes:"
echo "   User Service:         http://localhost:8000/api/users"
echo "   Email Service:        http://localhost:8000/api/emails"
echo "   Notification Service: http://localhost:8000/api/notifications"
echo "   Analytics Service:    http://localhost:8000/api/analytics"
echo ""
echo "⚙️  Kong Admin Panel:"
echo "   http://localhost:8001"
echo ""
echo "🧪 Test with:"
echo "   curl http://localhost:8000/api/users"
echo "   curl http://localhost:8000/api/emails"
echo ""