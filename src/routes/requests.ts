import express from 'express';
import {
    acceptConnectionRequest,
    rejectConnectionRequest,
    sendConnectionRequest
} from "../controllers/RequestController.ts";
import { requireAuth } from "../middleware/verifyUserMiddleware.ts";

const router = express.Router();

router.post('/send', requireAuth, sendConnectionRequest);
router.patch('/accept/:requestId', requireAuth, acceptConnectionRequest);
router.delete('/decline/:requestId', requireAuth, rejectConnectionRequest);

export default router;