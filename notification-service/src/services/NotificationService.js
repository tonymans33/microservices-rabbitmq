// 📁 src/services/NotificationService.js - Updated version
const colors = require('colors');
const Logger = require('../utils/Logger');
const DiscordService = require('./DiscordService');

class NotificationService {
    constructor() {
        this.discordService = new DiscordService();
        this.userRegistrations = []; // In-memory storage for demo
        
        // Validate Discord configuration on startup
        this.discordService.validateConfiguration();
    }

    async handleUserRegistration(eventData) {
        try {
            const userData = eventData.data;
            const timestamp = new Date().toISOString();

            console.log('\n' + '📋 PROCESSING NOTIFICATION'.blue.bold);
            console.log('━'.repeat(40).blue);

            // Store user registration data
            this.userRegistrations.push({
                ...userData,
                processedAt: timestamp,
                eventTimestamp: eventData.timestamp
            });

            // Send beautiful console notification
            this.sendConsoleNotification(userData);

            // Send Discord notification (if configured)
            await this.sendDiscordNotification(userData);

            // Log to file
            this.logNotification(userData, eventData);

            // Send admin summary (every 5 registrations)
            await this.checkForAdminSummary();

            console.log('━'.repeat(40).blue);
            console.log('✅ All notifications sent successfully!'.green.bold);

        } catch (error) {
            Logger.error('Error handling user registration notification:', error);
            
            // Send error notification to Discord
            await this.sendErrorToDiscord(error, { userData: eventData.data });
            
            throw error;
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
                return;
            }

            await this.discordService.sendUserRegistrationNotification(userData);
            console.log('📱 Discord notification sent!'.green);

        } catch (error) {
            console.log('❌ Discord notification failed:'.red, error.message);
            Logger.error('Discord notification error:', error);
            // Don't throw here, just log the error
        }
    }

    logNotification(userData, eventData) {
        const logData = {
            type: 'user_registration_notification',
            user: {
                id: userData.user_id,
                name: userData.name,
                email: userData.email
            },
            event: eventData,
            processedAt: new Date().toISOString(),
            totalUsers: this.userRegistrations.length
        };

        Logger.info('User registration notification processed', logData);
        console.log('📝 Logged to file successfully!'.green);
    }

    async checkForAdminSummary() {
        const totalUsers = this.userRegistrations.length;
        
        // Send summary every 5 registrations
        if (totalUsers % 5 === 0 && totalUsers > 0) {
            await this.sendAdminSummary();
        }
    }

    async sendAdminSummary() {
        console.log('\n' + '📊 ADMIN SUMMARY'.magenta.bold);
        console.log('═'.repeat(50).magenta);
        console.log(`Total registrations processed: ${this.userRegistrations.length}`.white);
        console.log(`Last 3 users:`.white);
        
        const recentUsers = this.userRegistrations.slice(-3);
        recentUsers.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.name} (${user.email})`.gray);
        });
        
        console.log('═'.repeat(50).magenta);
        
        const stats = this.getStats();
        Logger.info('Admin summary generated', stats);

        // Send to Discord
        try {
            await this.discordService.sendAdminSummary(stats);
            console.log('📱 Admin summary sent to Discord!'.green);
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

    // Method to get stats (used by API endpoint)
    getStats() {
        return {
            totalNotifications: this.userRegistrations.length,
            recentUsers: this.userRegistrations.slice(-5),
            lastProcessed: this.userRegistrations.length > 0 
                ? this.userRegistrations[this.userRegistrations.length - 1].processedAt 
                : null
        };
    }

    // New method: Send custom notifications
    async sendCustomNotification(title, message, color, fields = []) {
        try {
            await this.discordService.sendCustomNotification(title, message, color, fields);
            console.log(`📱 Custom notification sent: ${title}`.green);
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