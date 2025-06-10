import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"
import logger from "../utils/logger.js"

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables')
        }

        const options = {
            dbName: DB_NAME,
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 5,  // Minimum number of connections in the pool
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            family: 4, // Use IPv4, skip trying IPv6
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            heartbeatFrequencyMS: 10000, // Check the server's status every 10 seconds
        }

        logger.info('Attempting to connect to MongoDB...')
        const connectionInstance = await mongoose.connect(process.env.MONGODB_URI, options)
        
        logger.info(`MongoDB Connected || DB Host: ${connectionInstance.connection.host}`)

        // Handle connection events
        mongoose.connection.on('connected', () => {
            logger.info('Mongoose connected to MongoDB')
        })

        mongoose.connection.on('error', (err) => {
            logger.error('Mongoose connection error:', err)
        })

        mongoose.connection.on('disconnected', () => {
            logger.warn('Mongoose disconnected from MongoDB')
        })

        // Handle application termination
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close()
                logger.info('Mongoose connection closed through app termination')
                process.exit(0)
            } catch (err) {
                logger.error('Error during mongoose connection closure:', err)
                process.exit(1)
            }
        })

    } catch (error) {
        logger.error('MongoDB connection error:', error)
        process.exit(1) // 0->success, 1->failure
    }
}

export default connectDB