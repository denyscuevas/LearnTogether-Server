import express from "express";
import { requireAuth } from "../middleware/verifyUserMiddleware.ts";
import { createReview, getReviews } from "../controllers/ReviewController.ts";

// Express router paths for profiles routes
const router = express.Router();


// should getting reviews for your own profile fall under profile endpoint??


// The profile-related routes related to CREATE, READ, and UPDATE
router.post("/", requireAuth, createReview);
router.get("/me", requireAuth, getReviews);
router.get("/:userId", requireAuth, getReviews);

export default router;