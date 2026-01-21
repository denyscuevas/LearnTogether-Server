import express from "express";
import { requireAuth } from "../middleware/verifyUserMiddleware.ts";
import { createProfile } from "../controllers/ProfileController.ts";

// Express router paths for profiles routes
const router = express.Router();

router.post("/", requireAuth, createProfile);

export default router;
