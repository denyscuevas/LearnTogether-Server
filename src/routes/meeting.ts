import express from "express";
import { requireAuth } from "../middleware/verifyUserMiddleware.ts";
import { createMeeting, getMyMeetings, getMeeting, confirmMeeting } from "../controllers/MeetingController.ts";

const router = express.Router();

router.post("/create-meeting", requireAuth, createMeeting);
router.post("/:meetingId/confirm", requireAuth, confirmMeeting);
router.get("/me", requireAuth, getMyMeetings);
router.get("/:meetingId", requireAuth, getMeeting);

export default router;
