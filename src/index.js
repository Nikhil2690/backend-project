import dotenv from "dotenv"
import connectDB from "./db/index.js"
//import mongoose from "mongoose"
//import { DB_NAME } from "./constants"


dotenv.config({
    path: './env'
})

connectDB();

// (async ()=> {
//     try{
//         mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//     } catch(error){

//     }
// })()