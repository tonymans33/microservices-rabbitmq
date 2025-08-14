const amqp = require('amqplib');
const colors = require('colors');
const Logger = require('../utils/Logger');
const NotificationService = require('./NotificationService');

class RabbitMQConsumer {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.notificationService = new NotificationService();
    }

    async connect() {
        try {
            const rabbitMQUrl = `amqp://${process.env.RABBITMQ_USERNAME}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}${process.env.RABBITMQ_VHOST}`;
            
            // Debug logging
            console.log('🔍 DEBUG CONNECTION DETAILS:'.cyan);
            console.log(`   HOST: ${process.env.RABBITMQ_HOST}`.yellow);
            console.log(`   PORT: ${process.env.RABBITMQ_PORT}`.yellow);
            console.log(`   USERNAME: ${process.env.RABBITMQ_USERNAME}`.yellow);
            console.log(`   PASSWORD: ${process.env.RABBITMQ_PASSWORD ? '***' : 'MISSING'}`.yellow);
            console.log(`   VHOST: ${process.env.RABBITMQ_VHOST}`.yellow);
            console.log(`   FULL URL: ${rabbitMQUrl.replace(/\/\/.*@/, '//***:***@')}`.yellow);
            
            Logger.info('Connecting to RabbitMQ...', { url: rabbitMQUrl.replace(/\/\/.*@/, '//***:***@') });
            
            this.connection = await amqp.connect(rabbitMQUrl);
            this.channel = await this.connection.createChannel();
            
            console.log('✅ Connected to RabbitMQ successfully!'.green);
            return true;
        } catch (error) {
            Logger.error('Failed to connect to RabbitMQ:', error);
            console.error('❌ RabbitMQ connection failed:'.red, error.message);
            console.error('❌ Full error:'.red, error);
            return false;
        }
    }

    async setupQueues() {
        try {
            // Ensure queues exist (they should from definitions.json)
            const queues = [
                'email.user.registered',
                'notification.user.registered'
            ];

            for (const queue of queues) {
                await this.channel.assertQueue(queue, { durable: true });
                Logger.info(`Queue '${queue}' is ready`);
            }

            console.log('✅ All queues are ready!'.green);
            return true;
        } catch (error) {
            Logger.error('Failed to setup queues:', error);
            return false;
        }
    }

    async consumeUserEvents() {
        const queueName = 'notification.user.registered';
        
        try {
            console.log(`\n🎯 Starting to consume from: ${queueName}`.cyan.bold);
            
            // Set QoS to process one message at a time
            await this.channel.prefetch(1);
            
            await this.channel.consume(queueName, async (message) => {
                if (message) {
                    try {
                        const content = message.content.toString();
                        const eventData = JSON.parse(content);
                        
                        console.log(`\n📨 Received event:`.green.bold);
                        console.log(`   Event Type: ${eventData.event}`.yellow);
                        console.log(`   User: ${eventData.data?.name} (${eventData.data?.email})`.yellow);
                        console.log(`   Timestamp: ${eventData.timestamp}`.yellow);
                        
                        Logger.info('Processing user registration notification', eventData);
                        
                        // Process the notification
                        await this.notificationService.handleUserRegistration(eventData);
                        
                        // Acknowledge the message
                        this.channel.ack(message);
                        
                        // Update counter
                        global.processedMessages = (global.processedMessages || 0) + 1;
                        
                        console.log(`✅ Message processed successfully! (Total: ${global.processedMessages})`.green);
                        
                    } catch (error) {
                        Logger.error('Error processing message:', error);
                        console.error('❌ Error processing message:'.red, error.message);
                        
                        // Reject message (don't requeue to avoid infinite loop)
                        this.channel.nack(message, false, false);
                    }
                }
            }, {
                noAck: false // Manual acknowledgment
            });
            
            console.log('👂 Waiting for messages... (Press Ctrl+C to exit)'.cyan);
            
        } catch (error) {
            Logger.error('Error setting up message consumer:', error);
            console.error('❌ Failed to setup consumer:'.red, error.message);
        }
    }

    async start() {
        console.log('\n🐰 Initializing RabbitMQ Consumer...'.magenta.bold);
        
        // Connect to RabbitMQ
        const connected = await this.connect();
        if (!connected) {
            console.error('❌ Cannot start consumer without RabbitMQ connection'.red);
            return;
        }

        // Setup queues
        const queuesReady = await this.setupQueues();
        if (!queuesReady) {
            console.error('❌ Cannot start consumer without queues'.red);
            return;
        }

        // Start consuming messages
        await this.consumeUserEvents();
    }

    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            console.log('🔌 RabbitMQ connection closed'.yellow);
        } catch (error) {
            Logger.error('Error closing RabbitMQ connection:', error);
        }
    }
}

module.exports = RabbitMQConsumer;