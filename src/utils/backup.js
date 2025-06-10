import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'
import logger from './logger.js'

const BACKUP_DIR = path.join(process.cwd(), 'backups')

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

export const backupDatabase = async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`)
    
    // Create backup directory for this backup
    fs.mkdirSync(backupPath, { recursive: true })

    const command = `mongodump --uri="${process.env.MONGODB_URI}" --out="${backupPath}"`

    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                logger.error('Database backup failed:', error)
                reject(error)
                return
            }
            logger.info(`Database backup completed successfully at ${backupPath}`)
            resolve(backupPath)
        })
    })
}

export const restoreDatabase = async (backupPath) => {
    const command = `mongorestore --uri="${process.env.MONGODB_URI}" --dir="${backupPath}"`

    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                logger.error('Database restore failed:', error)
                reject(error)
                return
            }
            logger.info(`Database restored successfully from ${backupPath}`)
            resolve()
        })
    })
}

// Schedule daily backups
export const scheduleBackups = () => {
    // Run backup every day at 2 AM
    const scheduleBackup = () => {
        const now = new Date()
        const nextBackup = new Date(now)
        nextBackup.setHours(2, 0, 0, 0)
        
        if (now > nextBackup) {
            nextBackup.setDate(nextBackup.getDate() + 1)
        }
        
        const timeUntilBackup = nextBackup - now
        
        setTimeout(async () => {
            try {
                await backupDatabase()
                // Schedule next backup
                scheduleBackup()
            } catch (error) {
                logger.error('Scheduled backup failed:', error)
                // Retry in 1 hour if backup fails
                setTimeout(scheduleBackup, 60 * 60 * 1000)
            }
        }, timeUntilBackup)
    }

    scheduleBackup()
} 