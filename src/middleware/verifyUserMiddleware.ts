import express from "express";
import jwt from "jsonwebtoken";

export const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {

        // Getting the authorization portion of the incoming HTTP request
        const authHeader = req.headers.authorization;

        // Ensuring the header has a Bearer token, and if not then the user is not authorized
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized Request" });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined");
        }

        // Get the authorization token that is sent in the HTTP header, and verifying the authenticity
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token!, process.env.JWT_SECRET) as any;

        // Indicating if the decoded token is valid or not
        if (!decoded?.id) {
            return res.status(401).json({ message: "Unauthorized Request" });
        }

        // Send back the fetched userId and user email
        (req as any).user = { id: decoded.id, email: decoded.email };
        return next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
