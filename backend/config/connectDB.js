import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import adminModel from "../models/Admin.js";
dotenv.config();

async function connectDB(){
    try {
        const db_uri = process.env.MONGODB_URI;
        if (!db_uri) {
            console.error("Warning: MONGODB_URI is not defined. Please set MONGODB_URI in your environment variables.");
            return;
        }
        await mongoose.connect(db_uri);
        console.log("Database Connected Successfully");

        const rawEmail = process.env.ADMIN_EMAIL;
        const rawPassword = process.env.ADMIN_PASSWORD;

        if (rawEmail && rawPassword) {
            const email = rawEmail.trim().toLowerCase();
            const password = rawPassword.trim();
            const hashedPassword = await bcrypt.hash(password, 10);

            // Ensure only this admin exists
            await adminModel.deleteMany({ email: { $ne: email } });

            await adminModel.findOneAndUpdate(
                { email },
                { $set: { email, password: hashedPassword } },
                { upsert: true, returnDocument: "after" }
            );
            console.log(`Admin connected`);
        }
    } catch (error) {
        console.error("Database connection error:", error.message);
    }
}

connectDB();