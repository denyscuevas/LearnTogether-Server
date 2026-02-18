import express from 'express';
import { sendConnectionRequest } from "../controllers/RequestController.ts";
import { requireAuth } from "../middleware/verifyUserMiddleware.ts";

const router = express.Router();

router.post('/send', requireAuth, sendConnectionRequest);

export default router;