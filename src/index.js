import express from "express";
import cors from 'cors'
import dotenv from "dotenv";
import authRoutes from './routes/auth.ts'
import profileRoutes from './routes/profile.ts'
import messageRoutes from './routes/message.ts'
import threadRoutes from './routes/thread.ts'
import requestRoutes from './routes/requests.ts'
import matchRoutes from './routes/matches.ts'
import cookieParser from "cookie-parser";
import {cleanupPendingRequests} from "./services/cleanup.ts";

dotenv.config();

const app = express();

cleanupPendingRequests()

app.use(cookieParser())
app.use(cors({origin: process.env.CLIENT_URL, credentials: true}));
app.use(express.json());
app.set('trust proxy', 1)

app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/threads", threadRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/matches", matchRoutes)

app.get("/", (_, res) => {
    res.send("API running");
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
