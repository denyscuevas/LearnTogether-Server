import {type ValidationError, validationResult} from "express-validator";
import express, {type NextFunction} from "express";

// Check if the request has any validation errors and display them in the response
// Continue and run the controller method if there are no errors
export const checkRequestErrors = (req: express.Request, res: express.Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Only get the error message from the errors array
        const errorMessage = errors.array().map(error => error.msg as string)[0]
        return res.status(400).json({message: errorMessage})
    }
    // Continue
    next()
}