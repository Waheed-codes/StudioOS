import express from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import adminModel from "../../models/Admin.js"

const router =express.Router()


router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const cleanEmail = email.trim().toLowerCase();
        let admin = await adminModel.findOne({ email: cleanEmail });

        if (!admin) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(password.trim(), admin.password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Issue token for now until OTP verification function is written
        const token = jwt.sign(
            { id: admin._id, email: admin.email },
            process.env.SECRET_KEY,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            message: "Login successful",
            token,
            admin: { email: admin.email }
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// Placeholder for verify-otp until full OTP verification is written
router.post("/verify-otp", async (req, res) => {
    try {
        const { email } = req.body;
        const token = jwt.sign(
            { email: email || "admin" },
            process.env.SECRET_KEY,
            { expiresIn: "7d" }
        );
        return res.status(200).json({
            message: "OTP verified (temporary placeholder)",
            token
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router