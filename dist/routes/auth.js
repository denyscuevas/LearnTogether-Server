import express from 'express';
import { body } from 'express-validator';
import { register } from "../controllers/AuthController.ts";
// Express router paths for auth routes
const router = express.Router();
// Register auth route with validation
router.post('/register', [
    body('name').isLength({ min: 8 }).withMessage('Name is required to be 8 characters'),
], register);
export default router;
//# sourceMappingURL=auth.js.map