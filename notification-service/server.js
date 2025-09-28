const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const colors = require('colors');
require('dotenv').config();

const RabbitMQConsumer = require('./src/services/RabbitMQConsumer');
const NotificationService = require('./src/services/NotificationService');
const Logger = require('./src/utils/Logger');
const MongoDB = require('./src/config/mongodb');
const typeDefs = require('./src/graphql/schema');
const resolvers = require('./src/graphql/resolvers');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const notificationService = new NotificationService();
let consumer;
let apolloServer;

// Health check endpoint (before JSON middleware)
app.get('/health', (req, res) => {
    res.json({
        service: 'notification-service',
        status: 'healthy',
        mongodb: MongoDB.isReady() ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        version: process.env.SERVICE_VERSION || '1.0.0'
    });
});

// Service stats endpoint
app.get('/api/notifications/stats', async (req, res) => {
    try {
        const stats = await notificationService.getStats();
        res.json({
            service: 'notification-service',
            ...stats,
            uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        Logger.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// Root endpoint
app.get('/api/notifications', (req, res) => {
    res.json({
        message: 'Notification Service is running!',
        endpoints: {
            rest: {
                health: '/health',
                stats: '/api/notifications/stats',
                testDiscord: '/api/notifications/test-discord',
                customNotification: 'POST /api/notifications/custom'
            },
            graphql: '/graphql'
        },
        version: process.env.SERVICE_VERSION || '1.0.0'
    });
});

// Test Discord connection endpoint
app.get('/api/notifications/test-discord', async (req, res) => {
    try {
        const success = await notificationService.testDiscordConnection();
        
        res.json({ 
            success, 
            message: success ? 'Discord test successful!' : 'Discord test failed'
        });
    } catch (error) {
        Logger.error('Error testing Discord:', error);
        res.status(500).json({ error: error.message });
    }
});

// Print startup banner
function printBanner() {
    console.clear();
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════╗'.cyan);
    console.log('║                                                        ║'.cyan);
    console.log('║           📬 NOTIFICATION SERVICE v1.0.0              ║'.cyan.bold);
    console.log('║                                                        ║'.cyan);
    console.log('╚════════════════════════════════════════════════════════╝'.cyan);
    console.log('\n');
    console.log('🎯 Features:'.yellow.bold);
    console.log('  ✓ RabbitMQ Message Consumption');
    console.log('  ✓ Discord Notifications');
    console.log('  ✓ MongoDB Persistence');
    console.log('  ✓ GraphQL API (Apollo Server 4)');
    console.log('  ✓ REST API Endpoints');
    console.log('  ✓ Beautiful Console Notifications');
    console.log('\n');
}

// Main startup function
async function startServer() {
    try {
        printBanner();

        // Step 1: Connect to MongoDB
        console.log('📦 STEP 1: DATABASE CONNECTION'.cyan.bold);
        console.log('─'.repeat(50).cyan);
        await MongoDB.connect();

        // Step 2: Initialize Apollo Server 4
        console.log('\n📦 STEP 2: GRAPHQL SETUP'.cyan.bold);
        console.log('─'.repeat(50).cyan);
        
        apolloServer = new ApolloServer({
            typeDefs,
            resolvers,
            formatError: (formattedError, error) => {
                Logger.error('GraphQL Error:', error);
                return formattedError;
            },
            introspection: process.env.NODE_ENV === 'development',
        });

        await apolloServer.start();
        
        // IMPORTANT: Apply JSON middleware BEFORE GraphQL middleware
        app.use(express.json());
        
        // Apply GraphQL middleware to Express (Apollo Server 4 way)
        app.use(
            '/graphql',
            expressMiddleware(apolloServer, {
                context: async ({ req }) => ({
                    user: req.headers.user || null,
                }),
            })
        );
        
        console.log('✅ GraphQL initialized on /graphql'.green);

        // Send custom notification endpoint (needs JSON middleware, so placed after)
        app.post('/api/notifications/custom', async (req, res) => {
            try {
                const { title, message, color, fields } = req.body;
                
                if (!title || !message) {
                    return res.status(400).json({ 
                        error: 'Title and message are required' 
                    });
                }
                
                await notificationService.sendCustomNotification(
                    title, 
                    message, 
                    color || 0x00ff00, 
                    fields || []
                );
                
                res.json({ 
                    success: true, 
                    message: 'Custom notification sent successfully' 
                });
            } catch (error) {
                Logger.error('Error sending custom notification:', error);
                res.status(500).json({ error: 'Failed to send custom notification' });
            }
        });

        // Global error handler
        app.use((err, req, res, next) => {
            Logger.error('Unhandled error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });

        // Step 3: Start HTTP Server (handles both REST and GraphQL)
        console.log('\n📦 STEP 3: HTTP SERVER'.cyan.bold);
        console.log('─'.repeat(50).cyan);
        
        const server = await new Promise((resolve) => {
            const httpServer = app.listen(PORT, () => {
                console.log('='.repeat(50).cyan);
                console.log('🚀 SERVER STARTED'.green.bold);
                console.log('='.repeat(50).cyan);
                console.log(`📡 Port: ${PORT}`.yellow);
                console.log(`🌍 Environment: ${process.env.NODE_ENV}`.yellow);
                console.log('\n🔗 Endpoints:'.cyan.bold);
                console.log(`  💚 Health:    http://localhost:${PORT}/health`.blue);
                console.log(`  📊 Stats:     http://localhost:${PORT}/api/notifications/stats`.blue);
                console.log(`  🎮 GraphQL:   http://localhost:${PORT}/graphql`.blue);
                console.log(`  🧪 Test:      http://localhost:${PORT}/api/notifications/test-discord`.blue);
                console.log('='.repeat(50).cyan);

                Logger.info('HTTP server started', { port: PORT });
                resolve(httpServer);
            });
        });

        app._server = server; // Store for graceful shutdown

        // Step 4: Initialize RabbitMQ Consumer
        console.log('\n📦 STEP 4: MESSAGE QUEUE CONSUMER'.cyan.bold);
        console.log('─'.repeat(50).cyan);
        
        Logger.info('Starting RabbitMQ consumer...');
        consumer = new RabbitMQConsumer();
        await consumer.start();

        // Initialize global counters
        global.processedMessages = 0;

        // Success message
        console.log('\n' + '🎉 ALL SERVICES STARTED SUCCESSFULLY!'.rainbow.bold);
        console.log('━'.repeat(60).rainbow);
        console.log(`\n📡 Single Server:  http://localhost:${PORT}`.green);
        console.log(`🎮 GraphQL:        http://localhost:${PORT}/graphql`.green);
        console.log(`🗄️  MongoDB:        mongodb://admin:password@localhost:27017/notifications`.green);
        console.log(`🐰 RabbitMQ:       http://localhost:15672 (admin/password)`.green);
        console.log(`\n✨ Ready to receive notifications!\n`.cyan.bold);

    } catch (error) {
        Logger.error('Failed to start server:', error);
        console.log('\n' + '💥 STARTUP FAILED'.red.bold);
        console.log(error);
        process.exit(1);
    }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
    console.log(`\n\n${'🛑 SHUTTING DOWN'.yellow.bold} (${signal})`);
    console.log('━'.repeat(50).yellow);

    try {
        // Stop Apollo Server
        if (apolloServer) {
            await apolloServer.stop();
            console.log('✅ GraphQL server stopped'.green);
        }

        // Stop HTTP server
        if (app._server) {
            await new Promise((resolve) => {
                app._server.close(resolve);
            });
            console.log('✅ HTTP server closed'.green);
        }

        // Stop RabbitMQ consumer
        if (consumer && consumer.disconnect) {
            await consumer.disconnect();
            console.log('✅ RabbitMQ consumer disconnected'.green);
        }

        // Close MongoDB connection
        await MongoDB.disconnect();

        console.log('━'.repeat(50).green);
        console.log('👋 Graceful shutdown complete'.green.bold);
        Logger.info('Server shutdown complete');
        
        process.exit(0);
    } catch (error) {
        Logger.error('Error during shutdown:', error);
        console.log('❌ Shutdown error:'.red, error.message);
        process.exit(1);
    }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    Logger.error('Uncaught Exception:', error);
    console.log('💥 Uncaught Exception:'.red.bold, error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    Logger.error('Unhandled Rejection:', { reason, promise });
    console.log('💥 Unhandled Rejection:'.red.bold, reason);
    gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();