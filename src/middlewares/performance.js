import compression from 'compression';
import logger from '../utils/logger.js';

// Compression middleware
export const compressionMiddleware = compression();

// Timeout middleware
export const timeoutMiddleware = (timeout = 30000) => {
    return (req, res, next) => {
        res.setTimeout(timeout, () => {
            logger.error('Request timeout');
            res.status(408).json({ error: 'Request timeout' });
        });
        next();
    };
};

// Performance monitoring middleware
export const performanceMiddleware = (req, res, next) => {
    const start = process.hrtime();
    
    res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds * 1000 + nanoseconds / 1000000;
        
        logger.info('Request performance', {
            method: req.method,
            path: req.path,
            duration: `${duration.toFixed(2)}ms`,
            status: res.statusCode
        });
    });
    
    next();
}; 