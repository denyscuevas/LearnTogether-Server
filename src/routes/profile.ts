import express from "express";
import { requireAuth } from "../middleware/verifyUserMiddleware.ts";
import { createProfile, getMyProfile, getOtherProfile } from "../controllers/ProfileController.ts";

// Express router paths for profiles routes
const router = express.Router();

router.post("/", requireAuth, createProfile);
router.get("/me", requireAuth, getMyProfile);
router.get("/:id", requireAuth, getOtherProfile);

export default router;
