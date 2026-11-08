import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

import "./config/connectDB.js";
import allClients from "./controllers/private/client.js";
import teamMembers from "./controllers/private/team.js";
import bookingDetails from "./controllers/private/bookings.js";
import settingsRouter from "./controllers/private/settings.js";
import authMiddleware from "./middleware/auth.js";
import adminLogin from "./controllers/public/login.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, "../frontend");

const app = express();

// CORS Middleware configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:4056"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

const port = process.env.PORT || 4056;

// Health check endpoint for Render service monitoring
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", msg: "This api is up and running" });
});

// Serve static frontend assets
app.use(express.static(frontendPath));

// Public routes (login, OTP verification)
app.use(adminLogin);

// Protected routes (guarded by authMiddleware)
app.use("/clients", authMiddleware, allClients);
app.use("/team", authMiddleware, teamMembers);
app.use("/bookings", authMiddleware, bookingDetails);
app.use("/settings", authMiddleware, settingsRouter);

// Fallback for client-side routing (non-API requests serve index.html)
app.use((req, res) => {
  if (
    req.path.startsWith("/clients") ||
    req.path.startsWith("/team") ||
    req.path.startsWith("/bookings") ||
    req.path.startsWith("/settings")
  ) {
    return res.status(404).json({ message: "API endpoint not found" });
  }
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Listen on all network interfaces for Render container environment
app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});
