import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import path from "path"
import { fileURLToPath } from "url"
import userRoutes from "./routes/user.routes.js"
import snippetRoutes from "./routes/snippet.routes.js"
import { ApiError } from "./utils/ApiError.js"
import logger from "./utils/logger.js"
import { securityMiddleware, limiter } from "./middlewares/security.js"
import { compressionMiddleware, timeoutMiddleware, performanceMiddleware } from "./middlewares/performance.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Security middleware
app.use(securityMiddleware)
app.use(limiter)

// Performance middleware
app.use(compressionMiddleware)
app.use(timeoutMiddleware())
app.use(performanceMiddleware)

app.use(cors({
  origin: [process.env.FRONTEND_URL, 'https://codevalut-frontend.vercel.app'],
  credentials: true
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, "public")))
app.use(cookieParser())

// Temporary logging middleware to debug routing
app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

//Routes
app.use("/api/v1/users", userRoutes)
app.use("/api/v1/snippets", snippetRoutes)

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Global error handler:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || "Something went wrong";

  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

export { app }