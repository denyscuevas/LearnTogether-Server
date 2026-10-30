import express from "express";
import {body, validationResult} from "express-validator";
import {requireAuth} from "../middleware/verifyUserMiddleware.ts";
import {createReport} from "../controllers/ReportController.ts";

const router = express.Router();

const reasons = ["HARASSMENT", "SPAM", "INAPPROPRIATE_CONTENT", "FAKE_PROFILE", "OTHER"];

// POST route to report another user
router.post("/", requireAuth, [
    body("reportedUserId").isUUID().withMessage("A valid reportedUserId is required"),
    body("reason").isIn(reasons).withMessage(`Reason must be one of: ${reasons.join(", ")}`),
    body("details").optional({values: "null"}).isString().trim().isLength({max: 1000})
        .withMessage("Details must be at most 1000 characters"),
], (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({message: "Invalid input", errors: errors.array()});
    }
    return next();
}, createReport);

export default router;
