import mongoose from "mongoose"
import { DB_NAME } from "../constants.js";



const connectDB = async () => {
    try {
        const ConnectionInstance= await mongoose.connect(`${process.env.MOGODB_URI}/${DB_NAME}`)
        console.log(`MongoDB Connected || Db host: ${ConnectionInstance.connection.host}`)
    } catch (error) {
        console.log("MongoDB connection error", error)
        process.exit(1) // 0->success, 1->failure   
    }
}

export default connectDB