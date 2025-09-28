// src/graphql/schema.js - Apollo Server 4 Compatible
const typeDefs = `
  # Scalar types
  scalar JSON
  scalar DateTime

  # Enums
  enum NotificationType {
    user_registration
    email_sent
    custom
    admin_summary
    error
  }

  enum NotificationStatus {
    pending
    sent
    failed
    read
  }

  enum NotificationPriority {
    low
    normal
    high
    urgent
  }

  enum ChannelName {
    console
    discord
    email
    sms
    push
  }

  # Types
  type Channel {
    name: ChannelName!
    status: String!
    sentAt: DateTime!
    error: String
  }

  type NotificationError {
    message: String
    stack: String
    code: String
  }

  type Notification {
    id: ID!
    userId: String!
    userName: String!
    userEmail: String!
    type: NotificationType!
    title: String!
    message: String!
    status: NotificationStatus!
    channels: [Channel!]!
    eventData: JSON
    eventTimestamp: DateTime
    processedAt: DateTime!
    processingDuration: Int
    metadata: JSON
    error: NotificationError
    isRead: Boolean!
    readAt: DateTime
    priority: NotificationPriority!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type NotificationStats {
    total: Int!
    sent: Int!
    failed: Int!
    pending: Int!
    unread: Int!
    byType: [TypeCount!]!
    byStatus: [StatusCount!]!
    byPriority: [PriorityCount!]!
    recentNotifications: [Notification!]!
  }

  type TypeCount {
    type: NotificationType!
    count: Int!
  }

  type StatusCount {
    status: NotificationStatus!
    count: Int!
  }

  type PriorityCount {
    priority: NotificationPriority!
    count: Int!
  }

  type PaginatedNotifications {
    notifications: [Notification!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    currentPage: Int!
    totalPages: Int!
  }

  # Input types
  input NotificationFilter {
    userId: String
    type: NotificationType
    status: NotificationStatus
    priority: NotificationPriority
    isRead: Boolean
    startDate: DateTime
    endDate: DateTime
    search: String
  }

  input CreateNotificationInput {
    userId: String!
    userName: String!
    userEmail: String!
    type: NotificationType
    title: String!
    message: String!
    priority: NotificationPriority
    eventData: JSON
    metadata: JSON
  }

  input UpdateNotificationInput {
    status: NotificationStatus
    isRead: Boolean
    priority: NotificationPriority
  }

  # Queries
  type Query {
    # Get single notification
    notification(id: ID!): Notification

    # Get all notifications with optional filters
    notifications(
      filter: NotificationFilter
      page: Int
      limit: Int
      sortBy: String
      sortOrder: String
    ): PaginatedNotifications!

    # Get notifications by user ID
    notificationsByUser(
      userId: String!
      page: Int
      limit: Int
    ): PaginatedNotifications!

    # Get unread notifications
    unreadNotifications(
      userId: String
      page: Int
      limit: Int
    ): PaginatedNotifications!

    # Get notification statistics
    notificationStats(
      userId: String
      startDate: DateTime
      endDate: DateTime
    ): NotificationStats!

    # Get notifications by date range
    notificationsByDateRange(
      startDate: DateTime!
      endDate: DateTime!
      filter: NotificationFilter
    ): [Notification!]!

    # Search notifications
    searchNotifications(
      query: String!
      page: Int
      limit: Int
    ): PaginatedNotifications!
  }

  # Mutations
  type Mutation {
    # Create notification
    createNotification(input: CreateNotificationInput!): Notification!

    # Update notification
    updateNotification(id: ID!, input: UpdateNotificationInput!): Notification!

    # Mark notification as read
    markAsRead(id: ID!): Notification!

    # Mark multiple notifications as read
    markMultipleAsRead(ids: [ID!]!): [Notification!]!

    # Mark all notifications as read for a user
    markAllAsRead(userId: String!): Int!

    # Delete notification
    deleteNotification(id: ID!): Boolean!

    # Delete multiple notifications
    deleteMultipleNotifications(ids: [ID!]!): Int!

    # Delete all notifications for a user
    deleteAllUserNotifications(userId: String!): Int!
  }
`;

module.exports = typeDefs;