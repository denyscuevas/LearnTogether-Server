import express from 'express';
import {requireAuth} from "../middleware/verifyUserMiddleware.ts";
import {getFilteredUsers, getRecommendedMatches} from "../controllers/MatchingController.ts";

const router = express.Router();

router.get('/recommendations', requireAuth, getRecommendedMatches)
router.get('/filter', requireAuth, getFilteredUsers)

export default router;