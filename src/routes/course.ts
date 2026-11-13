import express from "express";
import { getCourse } from "../controllers/CourseController.ts";
import { requireAuth } from "../middleware/verifyUserMiddleware.ts";

const router = express.Router();

router.get("/:courseId", requireAuth, getCourse);

export default router;
