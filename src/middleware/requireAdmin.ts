import express from "express";
import prisma from "../config/prismaClient.ts";

// Must run after requireAuth. Reads the role from the database rather than the token so revoked admins lose access immediately
export const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({message: "Unauthorized Request"});
        }

        const user = await prisma.user.findUnique({
            where: {id: userId},
            select: {role: true, status: true}
        });

        if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") {
            return res.status(403).json({message: "Admin access required"});
        }

        (req as any).user.role = user.role;
        return next();
    } catch (error) {
        return res.status(500).json({message: "Server error"});
    }
};
