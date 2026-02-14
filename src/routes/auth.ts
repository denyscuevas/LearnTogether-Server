import express from 'express';
import {body} from 'express-validator'
import {
    register,
    login,
    resendVerification,
    verifyEmail,
    requestPasswordReset,
    verifyResetOTP, resetPassword
} from "../controllers/AuthController.ts";
import {checkRequestErrors} from "../middleware/validationMiddleware.ts";
import { limiter } from "../middleware/endpointRateLimiter.ts";

// Express router paths for auth routes
const router = express.Router();

const rateLimiterLax = limiter(15 * 60 * 1000, 5, "Too many attempts. Please try again later.")
const rateLimiterStrict = limiter(60 * 60 * 1000, 5, "You've reached the limit for this action. Please try again in an hour.")

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
    ], checkRequestErrors, rateLimiterStrict,
    register);

// Login auth route with validation
router.post(
    "/login",
    [
        body("email").isEmail().trim().toLowerCase().withMessage("Please enter a valid email").matches(/@uwindsor\.ca$/).withMessage("Please enter a valid @uwindsor email"),
        body("password").notEmpty().withMessage("Valid password required"),
    ], checkRequestErrors, rateLimiterLax,
    login);

router.post("/resend-verification",
    [
        body("email").isEmail().matches(/@uwindsor\.ca$/).withMessage("Please enter a valid @uwindsor email")
    ], checkRequestErrors,
    resendVerification);

router.post("/request-password-reset",
    [
        body("email").isEmail().matches(/@uwindsor\.ca$/).withMessage("Please enter a valid @uwindsor email")
    ], checkRequestErrors, rateLimiterLax,
    requestPasswordReset);

router.post("/verify-reset-otp",
    [
    body("email").isEmail().matches(/@uwindsor\.ca$/).withMessage("Please enter a valid @uwindsor email"),
    body("otp").isLength({min: 6, max: 6}).withMessage("Invalid OTP code")
    ], checkRequestErrors, rateLimiterLax,
    verifyResetOTP)

router.post("/reset-password",
    [
        body("userId").notEmpty(),
        body("password").isLength({min: 8}).withMessage("Password must be at least 8 characters").matches(/[a-z]/)
            .withMessage('Password must contain a lowercase letter')
            .matches(/[A-Z]/)
            .withMessage('Password must contain an uppercase letter')
            .matches(/\d/)
            .withMessage('Password must contain a number.')
            .matches(/[\W_]/)
            .withMessage('Password must contain a special character'),
        body("password_confirmation").isLength({min: 8}).withMessage("Password must be at least 8 characters")
    ], checkRequestErrors, rateLimiterStrict,
    resetPassword);

// Verify email and resend email routes
router.post("/verify-email",
    [
        body("otpCode").isLength({min: 6, max: 6}).withMessage("Invalid OTP code")
    ], checkRequestErrors, rateLimiterLax,
    verifyEmail);


export default router;