import express from "express"
import dotenv from "dotenv"
dotenv.config()
import "./config/connectDB.js"
import allClients from "./controllers/private/client.js"
import teamMembers from "./controllers/private/team.js"
import bookingDetails from "./controllers/private/bookings.js"
import settingsRouter from "./controllers/private/settings.js"
import authMiddleware from "./middleware/auth.js"
import adminLogin from "./controllers/public/login.js"
import cors from "cors"

const app = express()

// CORS Middleware
app.use(cors({
    allowedOriginal:"http://localhost:5500"
}))

app.use(express.json())
const port = process.env.PORT || 4056

app.get("/health", async (req, res) => {
    try {
        res.status(200).json({ msg: "This api is up and running" })
    } catch (error) {
        console.error(error.message)
        res.status(500).json({ msg: "Internal Server Error" })
    }
})

// Public routes
app.use(adminLogin)

// Protected routes (guarded by authMiddleware)
app.use(authMiddleware)
app.use("/clients", allClients)
app.use("/team", teamMembers)
app.use("/bookings", bookingDetails)
app.use("/settings", settingsRouter)

app.listen(port, () => {
    console.log(`Server is running at ${port}`);
})