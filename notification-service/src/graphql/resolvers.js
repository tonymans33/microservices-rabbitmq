// src/graphql/resolvers.js
const Notification = require('../models/Notification');
const { GraphQLJSON } = require('graphql-type-json');
const { GraphQLDateTime } = require('graphql-scalars');

const resolvers = {
    JSON: GraphQLJSON,
    DateTime: GraphQLDateTime,

    Query: {
        // Get single notification by ID
        notification: async (_, { id }) => {
            return await Notification.findById(id);
        },

        // Get all notifications with filters and pagination
        notifications: async (_, { filter = {}, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' }) => {
            const query = buildFilterQuery(filter);
            const skip = (page - 1) * limit;
            const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const notifications = await Notification.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit);

            const totalCount = await Notification.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            return {
                notifications,
                totalCount,
                pageInfo: {
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                    currentPage: page,
                    totalPages
                }
            };
        },

        // Get notifications by user ID
        notificationsByUser: async (_, { userId, page = 1, limit = 10 }) => {
            const skip = (page - 1) * limit;

            const notifications = await Notification.find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const totalCount = await Notification.countDocuments({ userId });
            const totalPages = Math.ceil(totalCount / limit);

            return {
                notifications,
                totalCount,
                pageInfo: {
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                    currentPage: page,
                    totalPages
                }
            };
        },

        // Get unread notifications
        unreadNotifications: async (_, { userId, page = 1, limit = 10 }) => {
            const query = { isRead: false };
            if (userId) query.userId = userId;

            const skip = (page - 1) * limit;

            const notifications = await Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const totalCount = await Notification.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            return {
                notifications,
                totalCount,
                pageInfo: {
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                    currentPage: page,
                    totalPages
                }
            };
        },

        // Get notification statistics
        notificationStats: async (_, { userId, startDate, endDate }) => {
            const query = {};
            if (userId) query.userId = userId;
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            const [stats, byType, byStatus, byPriority, recentNotifications] = await Promise.all([
                Notification.getStats(),
                Notification.aggregate([
                    { $match: query },
                    { $group: { _id: '$type', count: { $sum: 1 } } }
                ]),
                Notification.aggregate([
                    { $match: query },
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ]),
                Notification.aggregate([
                    { $match: query },
                    { $group: { _id: '$priority', count: { $sum: 1 } } }
                ]),
                Notification.find(query).sort({ createdAt: -1 }).limit(5)
            ]);

            return {
                ...stats,
                byType: byType.map(item => ({ type: item._id, count: item.count })),
                byStatus: byStatus.map(item => ({ status: item._id, count: item.count })),
                byPriority: byPriority.map(item => ({ priority: item._id, count: item.count })),
                recentNotifications
            };
        },

        // Get notifications by date range
        notificationsByDateRange: async (_, { startDate, endDate, filter = {} }) => {
            const query = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                ...buildFilterQuery(filter)
            };

            return await Notification.find(query).sort({ createdAt: -1 });
        },

        // Search notifications
        searchNotifications: async (_, { query, page = 1, limit = 10 }) => {
            const searchQuery = {
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { message: { $regex: query, $options: 'i' } },
                    { userName: { $regex: query, $options: 'i' } },
                    { userEmail: { $regex: query, $options: 'i' } }
                ]
            };

            const skip = (page - 1) * limit;

            const notifications = await Notification.find(searchQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const totalCount = await Notification.countDocuments(searchQuery);
            const totalPages = Math.ceil(totalCount / limit);

            return {
                notifications,
                totalCount,
                pageInfo: {
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                    currentPage: page,
                    totalPages
                }
            };
        }
    },

    Mutation: {
        // Create notification
        createNotification: async (_, { input }) => {
            const notification = new Notification({
                ...input,
                processedAt: new Date()
            });
            return await notification.save();
        },

        // Update notification
        updateNotification: async (_, { id, input }) => {
            return await Notification.findByIdAndUpdate(
                id,
                { $set: input },
                { new: true }
            );
        },

        // Mark notification as read
        markAsRead: async (_, { id }) => {
            const notification = await Notification.findById(id);
            if (!notification) throw new Error('Notification not found');
            return await notification.markAsRead();
        },

        // Mark multiple notifications as read
        markMultipleAsRead: async (_, { ids }) => {
            await Notification.updateMany(
                { _id: { $in: ids } },
                { $set: { isRead: true, readAt: new Date() } }
            );
            return await Notification.find({ _id: { $in: ids } });
        },

        // Mark all notifications as read for a user
        markAllAsRead: async (_, { userId }) => {
            const result = await Notification.updateMany(
                { userId, isRead: false },
                { $set: { isRead: true, readAt: new Date() } }
            );
            return result.modifiedCount;
        },

        // Delete notification
        deleteNotification: async (_, { id }) => {
            const result = await Notification.findByIdAndDelete(id);
            return !!result;
        },

        // Delete multiple notifications
        deleteMultipleNotifications: async (_, { ids }) => {
            const result = await Notification.deleteMany({ _id: { $in: ids } });
            return result.deletedCount;
        },

        // Delete all notifications for a user
        deleteAllUserNotifications: async (_, { userId }) => {
            const result = await Notification.deleteMany({ userId });
            return result.deletedCount;
        }
    }
};

// Helper function to build filter query
function buildFilterQuery(filter) {
    const query = {};

    if (filter.userId) query.userId = filter.userId;
    if (filter.type) query.type = filter.type;
    if (filter.status) query.status = filter.status;
    if (filter.priority) query.priority = filter.priority;
    if (filter.isRead !== undefined) query.isRead = filter.isRead;

    if (filter.startDate || filter.endDate) {
        query.createdAt = {};
        if (filter.startDate) query.createdAt.$gte = new Date(filter.startDate);
        if (filter.endDate) query.createdAt.$lte = new Date(filter.endDate);
    }

    if (filter.search) {
        query.$or = [
            { title: { $regex: filter.search, $options: 'i' } },
            { message: { $regex: filter.search, $options: 'i' } },
            { userName: { $regex: filter.search, $options: 'i' } },
            { userEmail: { $regex: filter.search, $options: 'i' } }
        ];
    }

    return query;
}

module.exports = resolvers;