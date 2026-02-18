import express from 'express';
import {acceptConnectionRequest, sendConnectionRequest} from "../controllers/RequestController.ts";
import { requireAuth } from "../middleware/verifyUserMiddleware.ts";

const router = express.Router();

router.post('/send', requireAuth, sendConnectionRequest);
router.patch('/accept/:requestId', requireAuth, acceptConnectionRequest);

export default router;