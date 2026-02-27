import express from 'express';
import {getNotifications} from "../controllers/NotificationController.ts";
import {requireAuth} from "../middleware/verifyUserMiddleware.ts";

// Create router
const router = express.Router();

// Notification-related endpoints
router.get('/', requireAuth, getNotifications);

export default router;