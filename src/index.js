import dotenv from "dotenv"
import connectDb from './db/index.js'
import { app } from "./app.js"

dotenv.config({
    path: './.env'
})

connectDb()
    .then(() => {
        app.on("error", (err) => {
            console.log("ERROR : ", err.message);
            throw new Error
        })

        app.listen(process.env.Port || 8000, () => {
            console.log(`server is running at port ${process.env.PORT || 8000}`);
        })
    })
    .catch((err) => {
        console.log("MOngoDb connection Fail. Error: ", err.message);
    })
