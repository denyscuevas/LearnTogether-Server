import express from "express";
import { requireAuth } from "../middleware/verifyUserMiddleware.ts";
import {
    createProfile,
    getMyProfile,
    getOtherProfile,
    getProfile,
    updateMyProfile
} from "../controllers/ProfileController.ts";

// Express router paths for profiles routes
const router = express.Router();

// The profile-related routes related to CREATE, READ, and UPDATE
router.post("/", requireAuth, createProfile);
router.get("/me", requireAuth, getProfile);
router.get("/:userId", requireAuth, getProfile);
router.put("/me", requireAuth, updateMyProfile);

export default router;
