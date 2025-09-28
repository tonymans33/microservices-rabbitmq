// src/graphql/server.js
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const colors = require('colors');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const Logger = require('../utils/Logger');

class GraphQLServer {
    constructor() {
        this.app = express();
        this.server = null;
        this.httpServer = null;
    }

    async initialize() {
        try {
            // Create Apollo Server
            this.server = new ApolloServer({
                typeDefs,
                resolvers,
                context: ({ req }) => {
                    // Add any context you need (auth, user, etc.)
                    return {
                        user: req.headers.user || null,
                        // Add more context as needed
                    };
                },
                formatError: (error) => {
                    Logger.error('GraphQL Error:', error);
                    return error;
                },
                introspection: process.env.GRAPHQL_PLAYGROUND === 'true',
                playground: process.env.GRAPHQL_PLAYGROUND === 'true',
                debug: process.env.NODE_ENV === 'development'
            });

            // Start Apollo Server
            await this.server.start();

            // Apply middleware
            this.server.applyMiddleware({ 
                app: this.app,
                path: process.env.GRAPHQL_PATH || '/graphql'
            });

            // Health check endpoint
            this.app.get('/health', (req, res) => {
                res.status(200).json({ 
                    status: 'ok',
                    service: 'graphql-api',
                    timestamp: new Date().toISOString()
                });
            });

            console.log('✅ GraphQL server initialized'.green);
            Logger.info('GraphQL server initialized');

        } catch (error) {
            Logger.error('Failed to initialize GraphQL server:', error);
            console.log('❌ GraphQL initialization failed:'.red, error.message);
            throw error;
        }
    }

    async start() {
        const port = process.env.GRAPHQL_PORT || 3001;
        
        return new Promise((resolve) => {
            this.httpServer = this.app.listen(port, () => {
                console.log('\n' + '🚀 GRAPHQL API STARTED'.green.bold);
                console.log('━'.repeat(50).green);
                console.log(`📡 GraphQL API: http://localhost:${port}${this.server.graphqlPath}`.cyan);
                console.log(`🎮 GraphQL Playground: http://localhost:${port}${this.server.graphqlPath}`.cyan);
                console.log(`💚 Health check: http://localhost:${port}/health`.cyan);
                console.log('━'.repeat(50).green);
                
                Logger.info('GraphQL server started', {
                    port,
                    graphqlPath: this.server.graphqlPath,
                    playground: process.env.GRAPHQL_PLAYGROUND === 'true'
                });
                
                resolve();
            });
        });
    }

    async stop() {
        try {
            if (this.httpServer) {
                await new Promise((resolve) => {
                    this.httpServer.close(resolve);
                });
            }
            
            if (this.server) {
                await this.server.stop();
            }
            
            console.log('👋 GraphQL server stopped gracefully'.cyan);
            Logger.info('GraphQL server stopped');
        } catch (error) {
            Logger.error('Error stopping GraphQL server:', error);
            throw error;
        }
    }
}

module.exports = GraphQLServer;