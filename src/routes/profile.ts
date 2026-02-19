import express from "express";
import { requireAuth } from "../middleware/verifyUserMiddleware.ts";
import {
    createProfile,
    getProfile,
    updateMyProfile
} from "../controllers/ProfileController.ts";
import { uploadProfileImage} from "../middleware/uploadMiddleware.ts"

// Express router paths for profiles routes
const router = express.Router();

// The profile-related routes related to CREATE, READ, and UPDATE
router.post("/", requireAuth, uploadProfileImage, createProfile);
router.get("/me", requireAuth, getProfile);
router.get("/:userId", requireAuth, getProfile);
router.put("/me", requireAuth, uploadProfileImage, updateMyProfile);

export default router;