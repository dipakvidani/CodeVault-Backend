import dotenv from "dotenv"
dotenv.config({
    path: './.env'
})
import connectDb from './db/index.js'
import { app } from "./app.js"
import { scheduleBackups } from './utils/backup.js'
import logger from './utils/logger.js'

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
        app.listen(port, () => {
            logger.info(`Server is running at port ${port}`)
        })
    } catch (err) {
        logger.error("Failed to start server:", err)
        process.exit(1)
    }
}

startServer()
