import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from the root directory
const envPath = path.join(__dirname, '..', '.env')
console.log('Loading .env from:', envPath)
dotenv.config({ path: envPath })

// Verify environment variables are loaded
if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set in environment variables')
    console.error('Current working directory:', process.cwd())
    console.error('Environment variables loaded:', process.env)
    process.exit(1)
}

import connectDb from './db/index.js'
import { app } from "./app.js"
import { scheduleBackups } from './utils/backup.js'
import logger from './utils/logger.js'

let server;

const startServer = async () => {
    try {
        // Log environment variables for debugging
        logger.info('Environment variables:', {
            NODE_ENV: process.env.NODE_ENV,
            MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
            PORT: process.env.PORT
        })

        // Connect to database
        await connectDb()
        
        // Initialize backup scheduler in production
        if (process.env.NODE_ENV === 'production') {
            scheduleBackups()
            logger.info('Database backup scheduler initialized')
        }

        app.on("error", (err) => {
            logger.error("Server error:", err.message)
            throw err
        })

        const port = process.env.PORT || 8000
        server = app.listen(port, () => {
            logger.info(`Server is running at port ${port}`)
        })

        // Handle graceful shutdown
        process.on('SIGTERM', gracefulShutdown)
        process.on('SIGINT', gracefulShutdown)

    } catch (err) {
        logger.error("Failed to start server:", err)
        process.exit(1)
    }
}

const gracefulShutdown = async () => {
    logger.info('Received shutdown signal')
    
    if (server) {
        server.close(() => {
            logger.info('Server closed')
            process.exit(0)
        })
    } else {
        process.exit(0)
    }
}

startServer()
