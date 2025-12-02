import express from 'express';
import {body} from 'express-validator'
import {register, login, resendVerification, verifyEmail, requestPasswordReset} from "../controllers/AuthController.ts";

// Express router paths for auth routes
const router = express.Router();

router.post("/register",
    [
        body("email").isEmail().trim().toLowerCase().withMessage("Please enter a valid email").matches(/@uwindsor\.ca$/).withMessage("Please enter a valid @uwindsor email"),
        body("password").isLength({min: 8}).withMessage("Password must be at least 8 characters").matches(/[a-z]/)
            .withMessage('Password must contain a lowercase letter')
            .matches(/[A-Z]/)
            .withMessage('Password must contain an uppercase letter')
            .matches(/\d/)
            .withMessage('Password must contain a number.')
            .matches(/[\W_]/)
            .withMessage('Password must contain a special character'),
        body("password_confirmation").isLength({min: 8}).withMessage("Password must be at least 8 characters")
    ],
    register);

// Login auth route with validation
router.post(
    "/login",
    [
        body("email").isEmail().trim().toLowerCase().withMessage("Please enter a valid email").matches(/@uwindsor\.ca$/).withMessage("Please enter a valid @uwindsor email"),
        body("password").notEmpty().withMessage("Valid password required"),
    ],
    login
)

router.post("/resend-verification",
    [
        body("email").isEmail().withMessage("Please enter a valid @uwindsor email")
    ],
    resendVerification);

router.post("/request-password-reset",
    [
        body("email").isEmail().withMessage("Please enter a valid @uwindsor email")
    ],
    requestPasswordReset);

// Verify email and resend email routes
router.get("/verify-email",
    [
        body("otpCode").isLength({min: 6, max: 6})
    ],
    verifyEmail);



export default router;