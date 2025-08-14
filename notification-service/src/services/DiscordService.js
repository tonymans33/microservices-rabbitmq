const https = require('https');
const { URL } = require('url');
const Logger = require('../utils/Logger');

class DiscordService {
    constructor() {
        this.webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        this.botToken = process.env.DISCORD_BOT_TOKEN;
        this.guildId = process.env.DISCORD_GUILD_ID;
        this.channelId = process.env.DISCORD_CHANNEL_ID;
    }

    // Your existing method (enhanced with more notification types)
    async sendUserRegistrationNotification(userData) {
        if (!this.webhookUrl) {
            throw new Error('Discord webhook URL not configured');
        }

        const embed = {
            title: "🎉 New User Registration!",
            color: 0x00ff00, // Green color
            description: `Welcome to our platform, **${userData.name}**!`,
            thumbnail: {
                url: "https://cdn.discordapp.com/attachments/example/avatar.png" // Optional user avatar
            },
            fields: [
                {
                    name: "👤 Name",
                    value: userData.name || "N/A",
                    inline: true
                },
                {
                    name: "📧 Email", 
                    value: userData.email || "N/A",
                    inline: true
                },
                {
                    name: "🆔 User ID",
                    value: String(userData.user_id || "N/A"),
                    inline: true
                },
                {
                    name: "📅 Registration Time",
                    value: `<t:${Math.floor(Date.now() / 1000)}:F>`, // Discord timestamp
                    inline: false
                },
                {
                    name: "🌍 Registration Source",
                    value: userData.source || "Direct Registration",
                    inline: true
                },
                {
                    name: "📱 Platform",
                    value: userData.platform || "Web",
                    inline: true
                }
            ],
            footer: {
                text: "Notification Service • Microservices Demo",
                icon_url: "https://cdn.discordapp.com/embed/avatars/0.png"
            },
            timestamp: new Date().toISOString()
        };

        const payload = {
            username: "Registration Bot",
            avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
            embeds: [embed]
        };

        return this.sendWebhook(payload);
    }

    // New method: Send admin summary
    async sendAdminSummary(stats) {
        if (!this.webhookUrl) {
            throw new Error('Discord webhook URL not configured');
        }

        const embed = {
            title: "📊 Registration Summary",
            color: 0xffa500, // Orange color
            description: `**${stats.totalNotifications}** users have registered!`,
            fields: [
                {
                    name: "📈 Total Registrations",
                    value: String(stats.totalNotifications),
                    inline: true
                },
                {
                    name: "⏰ Last Processed",
                    value: stats.lastProcessed ? `<t:${Math.floor(new Date(stats.lastProcessed).getTime() / 1000)}:R>` : "N/A",
                    inline: true
                },
                {
                    name: "👥 Recent Users",
                    value: stats.recentUsers.length > 0 
                        ? stats.recentUsers.map(user => `• ${user.name}`).join('\n')
                        : "No recent users",
                    inline: false
                }
            ],
            footer: {
                text: "Admin Summary • Notification Service"
            },
            timestamp: new Date().toISOString()
        };

        const payload = {
            username: "Admin Bot",
            avatar_url: "https://cdn.discordapp.com/embed/avatars/1.png",
            embeds: [embed]
        };

        return this.sendWebhook(payload);
    }

    // New method: Send error notifications
    async sendErrorNotification(error, context = {}) {
        if (!this.webhookUrl) {
            return; // Don't throw error for error notifications
        }

        const embed = {
            title: "🚨 System Error",
            color: 0xff0000, // Red color
            description: "An error occurred in the notification service",
            fields: [
                {
                    name: "❌ Error Message",
                    value: error.message || "Unknown error",
                    inline: false
                },
                {
                    name: "📍 Context",
                    value: JSON.stringify(context, null, 2).substring(0, 1000) || "No context",
                    inline: false
                },
                {
                    name: "⏰ Timestamp",
                    value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: true
                }
            ],
            footer: {
                text: "Error Alert • Notification Service"
            },
            timestamp: new Date().toISOString()
        };

        const payload = {
            username: "Error Bot",
            avatar_url: "https://cdn.discordapp.com/embed/avatars/2.png",
            embeds: [embed]
        };

        try {
            return this.sendWebhook(payload);
        } catch (webhookError) {
            Logger.error('Failed to send error notification to Discord:', webhookError);
        }
    }

    // New method: Send custom notification
    async sendCustomNotification(title, message, color = 0x0099ff, fields = []) {
        if (!this.webhookUrl) {
            throw new Error('Discord webhook URL not configured');
        }

        const embed = {
            title,
            description: message,
            color,
            fields,
            footer: {
                text: "Custom Notification • Notification Service"
            },
            timestamp: new Date().toISOString()
        };

        const payload = {
            username: "Notification Bot",
            avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
            embeds: [embed]
        };

        return this.sendWebhook(payload);
    }

    // Your existing sendWebhook method (enhanced with retry logic)
    async sendWebhook(payload, retries = 3) {
        return new Promise((resolve, reject) => {
            const url = new URL(this.webhookUrl);
            const data = JSON.stringify(payload);

            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                    'User-Agent': 'NotificationService/1.0'
                }
            };

            const req = https.request(options, (res) => {
                let responseBody = '';
                
                res.on('data', (chunk) => {
                    responseBody += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        Logger.info('Discord webhook sent successfully', {
                            statusCode: res.statusCode,
                            payloadSize: data.length
                        });
                        resolve(responseBody);
                    } else if (res.statusCode === 429 && retries > 0) {
                        // Rate limited, retry after delay
                        const retryAfter = parseInt(res.headers['retry-after']) || 1;
                        Logger.warn(`Discord rate limited, retrying after ${retryAfter}s`);
                        setTimeout(() => {
                            this.sendWebhook(payload, retries - 1)
                                .then(resolve)
                                .catch(reject);
                        }, retryAfter * 1000);
                    } else {
                        const error = new Error(`Discord webhook failed: ${res.statusCode} ${res.statusMessage}`);
                        Logger.error('Discord webhook error:', { 
                            statusCode: res.statusCode, 
                            response: responseBody 
                        });
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                Logger.error('Discord webhook request error:', error);
                if (retries > 0) {
                    setTimeout(() => {
                        this.sendWebhook(payload, retries - 1)
                            .then(resolve)
                            .catch(reject);
                    }, 1000);
                } else {
                    reject(error);
                }
            });

            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Discord webhook request timeout'));
            });

            req.write(data);
            req.end();
        });
    }

    // Validate webhook URL
    validateConfiguration() {
        if (!this.webhookUrl) {
            Logger.warn('Discord webhook URL not configured');
            return false;
        }
        
        try {
            new URL(this.webhookUrl);
            Logger.info('Discord webhook configuration is valid');
            return true;
        } catch (error) {
            Logger.error('Invalid Discord webhook URL:', error.message);
            return false;
        }
    }
}

module.exports = DiscordService;