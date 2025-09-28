// 📁 src/services/NotificationService.js - Updated with MongoDB
const colors = require('colors');
const Logger = require('../utils/Logger');
const DiscordService = require('./DiscordService');
const Notification = require('../models/Notification');

class NotificationService {
    constructor() {
        this.discordService = new DiscordService();
        
        // Validate Discord configuration on startup
        this.discordService.validateConfiguration();
    }

    async handleUserRegistration(eventData) {
        const startTime = Date.now();
        
        try {
            const userData = eventData.data;
            const timestamp = new Date().toISOString();

            console.log('\n' + '📋 PROCESSING NOTIFICATION'.blue.bold);
            console.log('━'.repeat(40).blue);

            // Send beautiful console notification
            this.sendConsoleNotification(userData);

            // Prepare channels array
            const channels = [];

            // Console channel (always successful if we reach here)
            channels.push({
                name: 'console',
                status: 'success',
                sentAt: new Date()
            });

            // Send Discord notification (if configured)
            const discordResult = await this.sendDiscordNotification(userData);
            if (discordResult) {
                channels.push(discordResult);
            }

            // Create notification record in MongoDB
            const notification = await this.saveNotification({
                userId: userData.user_id,
                userName: userData.name,
                userEmail: userData.email,
                type: 'user_registration',
                title: '🎉 New User Registered',
                message: `${userData.name} (${userData.email}) has successfully registered`,
                status: 'sent',
                channels,
                eventData: userData,
                eventTimestamp: new Date(eventData.timestamp),
                processedAt: new Date(),
                processingDuration: Date.now() - startTime,
                priority: 'normal',
                metadata: {
                    source: 'user-service',
                    environment: process.env.NODE_ENV
                }
            });

            console.log(`💾 Saved to database (ID: ${notification.id})`.green);

            // Log to file
            this.logNotification(userData, eventData, notification);

            // Check and send admin summary (every 5 registrations)
            await this.checkForAdminSummary();

            console.log('━'.repeat(40).blue);
            console.log('✅ All notifications processed successfully!'.green.bold);

            return notification;

        } catch (error) {
            Logger.error('Error handling user registration notification:', error);
            
            // Save error notification to MongoDB
            await this.saveErrorNotification(eventData, error, Date.now() - startTime);
            
            // Send error notification to Discord
            await this.sendErrorToDiscord(error, { userData: eventData.data });
            
            throw error;
        }
    }

    async saveNotification(data) {
        try {
            const notification = new Notification(data);
            await notification.save();
            Logger.info('Notification saved to MongoDB', { id: notification.id });
            return notification;
        } catch (error) {
            Logger.error('Error saving notification to MongoDB:', error);
            throw error;
        }
    }

    async saveErrorNotification(eventData, error, processingDuration) {
        try {
            const notification = new Notification({
                userId: eventData.data?.user_id || 'unknown',
                userName: eventData.data?.name || 'Unknown',
                userEmail: eventData.data?.email || 'unknown@email.com',
                type: 'error',
                title: '❌ Notification Processing Error',
                message: error.message,
                status: 'failed',
                channels: [],
                eventData: eventData.data,
                eventTimestamp: new Date(eventData.timestamp),
                processedAt: new Date(),
                processingDuration,
                priority: 'high',
                error: {
                    message: error.message,
                    stack: error.stack,
                    code: error.code
                }
            });
            
            await notification.save();
            Logger.info('Error notification saved to MongoDB', { id: notification.id });
        } catch (saveError) {
            Logger.error('Failed to save error notification:', saveError);
        }
    }

    sendConsoleNotification(userData) {
        console.log('\n' + '🎉 NEW USER REGISTERED!'.rainbow.bold);
        console.log('┌─────────────────────────────────────┐'.cyan);
        console.log(`│ 👤 Name: ${userData.name?.padEnd(25) || 'N/A'.padEnd(25)}│`.cyan);
        console.log(`│ 📧 Email: ${userData.email?.padEnd(24) || 'N/A'.padEnd(24)}│`.cyan);
        console.log(`│ 🆔 ID: ${String(userData.user_id || 'N/A').padEnd(27)}│`.cyan);
        console.log(`│ 📅 Time: ${new Date().toLocaleString().padEnd(23)}│`.cyan);
        console.log('└─────────────────────────────────────┘'.cyan);
        console.log('🔔 Sending notifications...'.yellow);
    }

    async sendDiscordNotification(userData) {
        try {
            if (!process.env.DISCORD_WEBHOOK_URL) {
                console.log('⚠️  Discord webhook not configured, skipping...'.yellow);
                return null;
            }

            await this.discordService.sendUserRegistrationNotification(userData);
            console.log('📱 Discord notification sent!'.green);

            return {
                name: 'discord',
                status: 'success',
                sentAt: new Date()
            };

        } catch (error) {
            console.log('❌ Discord notification failed:'.red, error.message);
            Logger.error('Discord notification error:', error);
            
            return {
                name: 'discord',
                status: 'failed',
                sentAt: new Date(),
                error: error.message
            };
        }
    }

    logNotification(userData, eventData, notification) {
        const logData = {
            type: 'user_registration_notification',
            notificationId: notification.id,
            user: {
                id: userData.user_id,
                name: userData.name,
                email: userData.email
            },
            event: eventData,
            processedAt: new Date().toISOString()
        };

        Logger.info('User registration notification processed', logData);
        console.log('📝 Logged to file successfully!'.green);
    }

    async checkForAdminSummary() {
        // Get total count from MongoDB
        const totalUsers = await Notification.countDocuments({ 
            type: 'user_registration',
            status: 'sent'
        });
        
        // Send summary every 5 registrations
        if (totalUsers % 5 === 0 && totalUsers > 0) {
            await this.sendAdminSummary();
        }
    }

    async sendAdminSummary() {
        console.log('\n' + '📊 ADMIN SUMMARY'.magenta.bold);
        console.log('═'.repeat(50).magenta);
        
        const stats = await this.getStats();
        
        console.log(`Total registrations processed: ${stats.totalNotifications}`.white);
        console.log(`Last 3 users:`.white);
        
        stats.recentUsers.slice(0, 3).forEach((notification, index) => {
            console.log(`  ${index + 1}. ${notification.userName} (${notification.userEmail})`.gray);
        });
        
        console.log('═'.repeat(50).magenta);
        
        Logger.info('Admin summary generated', stats);

        // Send to Discord
        try {
            await this.discordService.sendAdminSummary(stats);
            console.log('📱 Admin summary sent to Discord!'.green);
            
            // Save admin summary notification
            await this.saveNotification({
                userId: 'system',
                userName: 'System',
                userEmail: 'system@notification.service',
                type: 'admin_summary',
                title: '📊 Admin Summary Generated',
                message: `Total registrations: ${stats.totalNotifications}`,
                status: 'sent',
                channels: [
                    { name: 'console', status: 'success', sentAt: new Date() },
                    { name: 'discord', status: 'success', sentAt: new Date() }
                ],
                eventData: stats,
                processedAt: new Date(),
                priority: 'low'
            });
            
        } catch (error) {
            console.log('❌ Failed to send admin summary to Discord:'.red, error.message);
        }
    }

    async sendErrorToDiscord(error, context = {}) {
        try {
            await this.discordService.sendErrorNotification(error, context);
            console.log('🚨 Error notification sent to Discord!'.yellow);
        } catch (discordError) {
            Logger.error('Failed to send error notification to Discord:', discordError);
        }
    }

    // Method to get stats from MongoDB
    async getStats() {
        try {
            const stats = await Notification.getStats();
            const recentUsers = await Notification.find({ type: 'user_registration' })
                .sort({ createdAt: -1 })
                .limit(5);

            return {
                totalNotifications: stats.total,
                sent: stats.sent,
                failed: stats.failed,
                pending: stats.pending,
                unread: stats.unread,
                recentUsers,
                lastProcessed: recentUsers.length > 0 ? recentUsers[0].processedAt : null
            };
        } catch (error) {
            Logger.error('Error getting stats from MongoDB:', error);
            return {
                totalNotifications: 0,
                sent: 0,
                failed: 0,
                pending: 0,
                unread: 0,
                recentUsers: [],
                lastProcessed: null
            };
        }
    }

    // New method: Send custom notifications
    async sendCustomNotification(title, message, color, fields = []) {
        try {
            await this.discordService.sendCustomNotification(title, message, color, fields);
            console.log(`📱 Custom notification sent: ${title}`.green);
            
            // Save to MongoDB
            await this.saveNotification({
                userId: 'system',
                userName: 'System',
                userEmail: 'system@notification.service',
                type: 'custom',
                title,
                message,
                status: 'sent',
                channels: [
                    { name: 'discord', status: 'success', sentAt: new Date() }
                ],
                processedAt: new Date(),
                priority: 'normal',
                metadata: { fields }
            });
            
        } catch (error) {
            console.log(`❌ Failed to send custom notification: ${error.message}`.red);
        }
    }

    // Method to test Discord connection
    async testDiscordConnection() {
        try {
            await this.discordService.sendCustomNotification(
                "🧪 Test Notification",
                "Discord integration is working correctly!",
                0x00ff00,
                [{
                    name: "Status",
                    value: "✅ Connected",
                    inline: true
                }, {
                    name: "Timestamp",
                    value: new Date().toISOString(),
                    inline: true
                }]
            );
            return true;
        } catch (error) {
            Logger.error('Discord connection test failed:', error);
            return false;
        }
    }
}

module.exports = NotificationService;