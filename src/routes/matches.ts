import express from 'express';
import {requireAuth} from "../middleware/verifyUserMiddleware.ts";
import {getRecommendedMatches} from "../controllers/MatchingController.ts";

const router = express.Router();

router.get('/recommendations', requireAuth, getRecommendedMatches)

export default router;