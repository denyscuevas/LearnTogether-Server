import express from 'express';
import {getNotifications, markAllAsRead} from "../controllers/NotificationController.ts";
import {requireAuth} from "../middleware/verifyUserMiddleware.ts";

// Create router
const router = express.Router();

// Notification-related endpoints
router.get('/', requireAuth, getNotifications);
router.patch('/read', requireAuth, markAllAsRead);

export default router;