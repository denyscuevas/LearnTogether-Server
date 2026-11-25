import express from 'express';
import {
    
    acceptConnectionRequest, 
    getConnectionRequests,
    rejectConnectionRequest,
    cancelConnectionRequest,
    sendConnectionRequest,
    getSentRequests

    } from "../controllers/RequestController.ts";



import { requireAuth } from "../middleware/verifyUserMiddleware.ts";

const router = express.Router();

router.post('/send', requireAuth, sendConnectionRequest);
router.patch('/accept/:requestId', requireAuth, acceptConnectionRequest);
router.delete('/decline/:requestId', requireAuth, rejectConnectionRequest);
router.delete('/cancel/:requestId', requireAuth, cancelConnectionRequest);
router.get('/received', requireAuth, getConnectionRequests);
router.get("/sent", requireAuth, getSentRequests);
export default router;