import express from 'express';
import {body, param} from 'express-validator';
import {requireAuth} from "../middleware/verifyUserMiddleware.ts";
import {createThread, getMessages, getThreads} from "../controllers/MessagingController.ts";

const router = express.Router();

// POST route to create a thread
router.post('/', [
    body("participant1").isUUID().notEmpty().withMessage("Participant 1 is required"),
    body("participant2").isUUID().notEmpty().withMessage("Participant 2 is required"),
], requireAuth, createThread)

// GET route to get threads for a user
router.get('/', [
], requireAuth, getThreads)

export default router;