// src/models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    // User Information
    userId: {
        type: String,
        required: true,
        index: true
    },
    userName: {
        type: String,
        required: true
    },
    userEmail: {
        type: String,
        required: true,
        index: true
    },
    
    // Notification Details
    type: {
        type: String,
        enum: ['user_registration', 'email_sent', 'custom', 'admin_summary', 'error'],
        default: 'user_registration',
        index: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    
    // Status
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'read'],
        default: 'sent',
        index: true
    },
    
    // Channels where notification was sent
    channels: [{
        name: {
            type: String,
            enum: ['console', 'discord', 'email', 'sms', 'push']
        },
        status: {
            type: String,
            enum: ['success', 'failed']
        },
        sentAt: {
            type: Date,
            default: Date.now
        },
        error: String
    }],
    
    // Event Data
    eventData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    eventTimestamp: {
        type: Date,
        index: true
    },
    
    // Processing Information
    processedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    processingDuration: {
        type: Number // in milliseconds
    },
    
    // Metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Error Information (if failed)
    error: {
        message: String,
        stack: String,
        code: String
    },
    
    // Read status
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: Date,
    
    // Priority
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
        index: true
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: 'notifications'
});

// Indexes for better query performance
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, status: 1 });
NotificationSchema.index({ 'channels.name': 1 });

// Virtual for notification age
NotificationSchema.virtual('age').get(function() {
    return Date.now() - this.createdAt;
});

// Instance method to mark as read
NotificationSchema.methods.markAsRead = async function() {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
};

// Static method to get unread count
NotificationSchema.statics.getUnreadCount = function(userId) {
    return this.countDocuments({ userId, isRead: false });
};

// Static method to get notifications by date range
NotificationSchema.statics.getByDateRange = function(startDate, endDate, filters = {}) {
    return this.find({
        createdAt: { $gte: startDate, $lte: endDate },
        ...filters
    }).sort({ createdAt: -1 });
};

// Static method to get stats
NotificationSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                sent: {
                    $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
                },
                failed: {
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                },
                pending: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                unread: {
                    $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
                }
            }
        }
    ]);
    
    return stats[0] || {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
        unread: 0
    };
};

// Pre-save middleware
NotificationSchema.pre('save', function(next) {
    // Calculate processing duration if eventTimestamp exists
    if (this.eventTimestamp && !this.processingDuration) {
        this.processingDuration = Date.now() - this.eventTimestamp.getTime();
    }
    next();
});

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;