import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from the root directory
const envPath = path.join(__dirname, '..', '.env')
console.log('Loading .env from:', envPath)
dotenv.config({ path: envPath })

// Verify required environment variables
const requiredEnvVars = {
    MONGODB_URI: 'Database connection string',
    SMTP_USER: 'Gmail account for sending emails',
    SMTP_PASS: 'Gmail app password for sending emails',
    ACCESS_TOKEN_SECRET: 'JWT access token secret',
    REFRESH_TOKEN_SECRET: 'JWT refresh token secret'
};

const missingEnvVars = Object.entries(requiredEnvVars)
    .filter(([key]) => !process.env[key])
    .map(([key, description]) => `${key} (${description})`);

if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:');
    missingEnvVars.forEach(varName => console.error(`- ${varName}`));
    console.error('\nPlease create a .env file with these variables.');
    process.exit(1);
}

// Log environment variables for debugging (without sensitive values)
console.log('Environment variables loaded:', {
    NODE_ENV: process.env.NODE_ENV,
    MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
    SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Not set',
    SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Not set',
    PORT: process.env.PORT
});

import connectDb from './db/index.js'
import { app } from "./app.js"
import { scheduleBackups } from './utils/backup.js'
import logger from './utils/logger.js'

let server;

const startServer = async () => {
    try {
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
