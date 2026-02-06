import express from 'express';
import {requireAuth} from "../middleware/verifyUserMiddleware.ts";
import {getMessages} from "../controllers/MessagingController.ts";

const router = express.Router();

// POST route to create a message
// router.post('/', [
//     body('threadId').notEmpty().withMessage('Thread ID is required'),
//     body('senderId').notEmpty().withMessage('Sender ID is required'),
//     body('message').notEmpty().withMessage('Message is required')
// ], requireAuth, createMessage)

// GET route to get messages within a thread
router.get('/:threadId', requireAuth, getMessages)

export default router;