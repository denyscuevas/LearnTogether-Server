import { validationResult } from "express-validator";
import express, {} from "express";
// Check if the request has any validation errors and display them in the response
// Continue and run the controller method if there are no errors
export const checkRequestErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
    }
    // Continue
    next();
};
//# sourceMappingURL=validationMiddleware.js.map