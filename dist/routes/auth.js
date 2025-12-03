import express from 'express';
import { body } from 'express-validator';
import { register, login, resendVerification, verifyEmail, requestPasswordReset, verifyResetOTP, resetPassword } from "../controllers/AuthController.ts";
import { checkRequestErrors } from "../middleware/validationMiddleware.ts";
// Express router paths for auth routes
const router = express.Router();
router.post("/register", [
    body("email").isEmail().trim().toLowerCase().withMessage("Please enter a valid email").matches(/@uwindsor\.ca$/).withMessage("Please enter a valid @uwindsor email"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters").matches(/[a-z]/)
        .withMessage('Password must contain a lowercase letter')
        .matches(/[A-Z]/)
        .withMessage('Password must contain an uppercase letter')
        .matches(/\d/)
        .withMessage('Password must contain a number.')
        .matches(/[\W_]/)
        .withMessage('Password must contain a special character'),
    body("password_confirmation").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
], checkRequestErrors, register);
// Login auth route with validation
router.post("/login", [
    body("email").isEmail().trim().toLowerCase().withMessage("Please enter a valid email").matches(/@uwindsor\.ca$/).withMessage("Please enter a valid @uwindsor email"),
    body("password").notEmpty().withMessage("Valid password required"),
], checkRequestErrors, login);
router.post("/resend-verification", [
    body("email").isEmail().withMessage("Please enter a valid @uwindsor email")
], checkRequestErrors, resendVerification);
router.post("/request-password-reset", [
    body("email").isEmail().withMessage("Please enter a valid @uwindsor email")
], checkRequestErrors, requestPasswordReset);
router.post("/verify-reset-otp", [
    body("email").isEmail().withMessage("Please enter a valid @uwindsor email"),
    body("otp").isLength({ min: 6, max: 6 }).withMessage("Invalid OTP code")
], checkRequestErrors, verifyResetOTP);
router.post("/reset-password", [
    body("userId").notEmpty(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters").matches(/[a-z]/)
        .withMessage('Password must contain a lowercase letter')
        .matches(/[A-Z]/)
        .withMessage('Password must contain an uppercase letter')
        .matches(/\d/)
        .withMessage('Password must contain a number.')
        .matches(/[\W_]/)
        .withMessage('Password must contain a special character'),
    body("password_confirmation").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
], checkRequestErrors, resetPassword);
// Verify email and resend email routes
router.get("/verify-email", [
    body("otpCode").isLength({ min: 6, max: 6 }).withMessage("Invalid OTP code")
], checkRequestErrors, verifyEmail);
export default router;
//# sourceMappingURL=auth.js.map