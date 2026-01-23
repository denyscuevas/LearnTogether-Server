import express from "express";
import cors from 'cors'
import dotenv from "dotenv";
import authRoutes from './routes/auth.ts'
import profileRoutes from './routes/profile.ts'
import messageRoutes from './routes/message.ts'
import threadRoutes from './routes/thread.ts'

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/threads", threadRoutes);

app.get("/", (_, res) => {
    res.send("API running");
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
