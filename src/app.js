import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import userRoutes from "./routes/user.routes.js"
import snippetRoutes from "./routes/snippet.routes.js"
import {ApiError} from "./utils/ApiError.js"

dotenv.config(
  {
    path: './.env'
  }
)

const app = express()

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true}))
app.use(express.static("public"))
app.use(cookieParser())
 

//Routes
app.use("/api/v1/users",userRoutes)
app.use("/api/v1/snippets",snippetRoutes)


// Global error handler
app.use((err, req, res, next) => {
  throw new ApiError(err.statusCode || 500, err.message || "Something went wrong")
});

export { app }