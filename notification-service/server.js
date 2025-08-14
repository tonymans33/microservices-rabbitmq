const express = require('express');
const colors = require('colors');
require('dotenv').config();

const RabbitMQConsumer = require('./src/services/RabbitMQConsumer');
const NotificationService = require('./src/services/NotificationService');
const Logger = require('./src/utils/Logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/api/notifications/health', (req, res) => {
    res.json({
        service: 'notification-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.SERVICE_VERSION || '1.0.0'
    });
});

// Service stats endpoint
app.get('/api/notifications/stats', (req, res) => {
    res.json({
        service: 'notification-service',
        processed_messages: global.processedMessages || 0,
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/api/notifications', (req, res) => {
    res.json({
        message: 'Notification Service is running!',
        endpoints: ['/notifications/health', '/notifications/stats'],
        version: process.env.SERVICE_VERSION || '1.0.0'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    Logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.get('/api/notifications/test-discord', async (req, res) => {
    try {
        const testData = {
            name: "Test User",
            email: "test@example.com",
            user_id: 12345,
            created_at: new Date().toISOString()
        };
        
        const notificationService = new NotificationService();
        const success = await notificationService.testDiscordConnection();
        
        res.json({ 
            success, 
            message: success ? 'Discord test successful!' : 'Discord test failed'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start HTTP server
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50).cyan);
    console.log('🚀 NOTIFICATION SERVICE STARTED'.green.bold);
    console.log('='.repeat(50).cyan);
    console.log(`📡 Server running on port: ${PORT}`.yellow);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`.yellow);
    console.log(`📊 Health check: http://localhost:${PORT}/notifications/health`.blue);
    console.log(`📈 Stats: http://localhost:${PORT}/notifications/stats`.blue);
    console.log('='.repeat(50).cyan + '\n');

    // Initialize global counters
    global.processedMessages = 0;

    // Start RabbitMQ consumer
    Logger.info('Starting RabbitMQ consumer...');
    const consumer = new RabbitMQConsumer();
    consumer.start();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n' + '🔴 Shutting down Notification Service...'.red);
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n' + '🔴 Shutting down Notification Service...'.red);
    process.exit(0);
});
