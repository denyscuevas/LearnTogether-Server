import express from "express";
import cors from 'cors'
import dotenv from "dotenv";
import authRoutes from './routes/auth.ts'
import profileRoutes from './routes/profile.ts'
import messageRoutes from './routes/message.ts'
import threadRoutes from './routes/thread.ts'
import requestRoutes from './routes/requests.ts'
import matchRoutes from './routes/matches.ts'
import notificationRoutes from './routes/notifications.ts'
import cookieParser from "cookie-parser";
import {cleanupNotifications, cleanupPendingRequests} from "./services/cleanup.ts";
import {createSocketServer} from "./socket-server/socket.ts";
import {createServer} from "node:http";

dotenv.config();

const app = express();

// Explicitly create a new HTTP server so we can attach Socket.IO
const expressServer = createServer(app)

// Initialize a new Socket.IO server
createSocketServer(expressServer)

cleanupPendingRequests().catch(err => console.error("ConnectionRequest Cron failed:", err));
cleanupNotifications().catch(err => console.error("Notification Cron failed:", err));

app.use(cookieParser())
app.use(cors({origin: process.env.CLIENT_URL, credentials: true}));
app.use(express.json());
app.set('trust proxy', 1)

app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/threads", threadRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (_, res) => {
    res.send("API running");
});

const PORT = process.env.PORT || 8080;

expressServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
