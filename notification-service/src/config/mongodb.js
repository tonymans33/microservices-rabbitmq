// src/config/mongodb.js
const mongoose = require('mongoose');
const colors = require('colors');
const Logger = require('../utils/Logger');

class MongoDB {
    constructor() {
        this.isConnected = false;
    }

    async connect() {
        try {
            const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/notifications?authSource=admin';
            
            console.log('\n' + '🔌 Connecting to MongoDB...'.cyan);
            
            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            this.isConnected = true;
            
            console.log('✅ MongoDB connected successfully!'.green.bold);
            console.log(`📊 Database: ${mongoose.connection.name}`.gray);
            
            Logger.info('MongoDB connected', {
                database: mongoose.connection.name,
                host: mongoose.connection.host
            });

            // Handle connection events
            mongoose.connection.on('error', (err) => {
                Logger.error('MongoDB connection error:', err);
                console.log('❌ MongoDB error:'.red, err.message);
            });

            mongoose.connection.on('disconnected', () => {
                this.isConnected = false;
                Logger.warn('MongoDB disconnected');
                console.log('⚠️  MongoDB disconnected'.yellow);
            });

            mongoose.connection.on('reconnected', () => {
                this.isConnected = true;
                Logger.info('MongoDB reconnected');
                console.log('✅ MongoDB reconnected'.green);
            });

        } catch (error) {
            Logger.error('MongoDB connection failed:', error);
            console.log('❌ MongoDB connection failed:'.red.bold, error.message);
            throw error;
        }
    }

    async disconnect() {
        try {
            await mongoose.connection.close();
            this.isConnected = false;
            console.log('👋 MongoDB disconnected gracefully'.cyan);
            Logger.info('MongoDB disconnected gracefully');
        } catch (error) {
            Logger.error('Error disconnecting from MongoDB:', error);
            throw error;
        }
    }

    getConnection() {
        return mongoose.connection;
    }

    isReady() {
        return this.isConnected && mongoose.connection.readyState === 1;
    }
}

module.exports = new MongoDB();