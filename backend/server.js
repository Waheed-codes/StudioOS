import express from "express"
import dotenv from "dotenv"
dotenv.config()
import path from "path"
import { fileURLToPath } from "url"
import "./config/connectDB.js"
import allClients from "./controllers/private/client.js"
import teamMembers from "./controllers/private/team.js"
import bookingDetails from "./controllers/private/bookings.js"
import settingsRouter from "./controllers/private/settings.js"
import authMiddleware from "./middleware/auth.js"
import adminLogin from "./controllers/public/login.js"
import cors from "cors"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendPath = path.join(__dirname, "../frontend")

const app = express()

// CORS Middleware
app.use(cors())

app.use(express.json())
const port = process.env.PORT || 4056

// Health check endpoint for Render health monitoring
app.get("/health", async (req, res) => {
    try {
        res.status(200).json({ msg: "This api is up and running" })
    } catch (error) {
        console.error(error.message)
        res.status(500).json({ msg: "Internal Server Error" })
    }
})

// Serve static frontend files
app.use(express.static(frontendPath))

// Public routes
app.use(adminLogin)

// Protected routes (guarded by authMiddleware)
app.use(authMiddleware)
app.use("/clients", allClients)
app.use("/team", teamMembers)
app.use("/bookings", bookingDetails)
app.use("/settings", settingsRouter)

// Fallback to index.html for any unhandled GET request (Express 5 compatible)
app.use((req, res, next) => {
    if (req.method === "GET") {
        return res.sendFile(path.join(frontendPath, "index.html"))
    }
    next()
})

app.listen(port, () => {
    console.log(`Server is running at ${port}`)
})