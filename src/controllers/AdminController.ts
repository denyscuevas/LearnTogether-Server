import express from "express";
import prisma from "../config/prismaClient.ts";
import {applySuspensionEffects, clearSuspensionEffects} from "../services/accountStatus.ts";

// Explicit selects so sensitive fields such as passwordHash are never returned
const userSummary = {id: true, email: true, profile: {select: {name: true}}} as const;

const parsePaging = (req: express.Request) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
    return {page, limit, skip: (page - 1) * limit};
};

// Total registered users, counts by status, and recent signups
export const getUserStats = async (_req: express.Request, res: express.Response) => {
    try {
        const day = 24 * 60 * 60 * 1000;
        const [total, active, suspended, unverified, last7Days, last30Days] = await prisma.$transaction([
            prisma.user.count(),
            prisma.user.count({where: {status: "ACTIVE"}}),
            prisma.user.count({where: {status: "SUSPENDED"}}),
            prisma.user.count({where: {isVerified: false}}),
            prisma.user.count({where: {createdAt: {gte: new Date(Date.now() - 7 * day)}}}),
            prisma.user.count({where: {createdAt: {gte: new Date(Date.now() - 30 * day)}}}),
        ]);

        return res.status(200).json({
            message: "Stats fetched successfully",
            stats: {total, active, suspended, unverified, newLast7Days: last7Days, newLast30Days: last30Days}
        });
    } catch (error) {
        console.error("Admin stats error:", error);
        return res.status(500).json({message: "Server error"});
    }
};

// Paginated list of users with their join date and account status
export const getUsers = async (req: express.Request, res: express.Response) => {
    try {
        const {page, limit, skip} = parsePaging(req);
        const {status, search, sort} = req.query;

        const where: any = {};
        if (status) where.status = status;
        if (search) {
            where.OR = [
                {email: {contains: String(search), mode: "insensitive"}},
                {profile: {name: {contains: String(search), mode: "insensitive"}}},
            ];
        }

        const [total, users] = await prisma.$transaction([
            prisma.user.count({where}),
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: {createdAt: sort === "asc" ? "asc" : "desc"},
                select: {
                    id: true,
                    email: true,
                    createdAt: true,
                    isVerified: true,
                    status: true,
                    role: true,
                    suspendedAt: true,
                    suspensionReason: true,
                    profile: {select: {name: true}},
                    _count: {select: {reportsReceived: {where: {status: "PENDING"}}}}
                }
            })
        ]);

        const data = users.map(({_count, ...u}) => ({...u, pendingReports: _count.reportsReceived}));
        return res.status(200).json({
            message: "Users fetched successfully",
            users: data,
            pagination: {page, limit, total, totalPages: Math.ceil(total / limit)}
        });
    } catch (error) {
        console.error("Admin users error:", error);
        return res.status(500).json({message: "Server error"});
    }
};

// Paginated list of reports, pending by default
export const getReports = async (req: express.Request, res: express.Response) => {
    try {
        const {page, limit, skip} = parsePaging(req);
        const status = req.query.status ? String(req.query.status) : "PENDING";
        const where: any = status === "ALL" ? {} : {status};

        const [total, reports] = await prisma.$transaction([
            prisma.report.count({where}),
            prisma.report.findMany({
                where,
                skip,
                take: limit,
                orderBy: {createdAt: "asc"},
                include: {
                    reporter: {select: userSummary},
                    reportedUser: {select: {...userSummary, status: true}},
                }
            })
        ]);

        return res.status(200).json({
            message: "Reports fetched successfully",
            reports,
            pagination: {page, limit, total, totalPages: Math.ceil(total / limit)}
        });
    } catch (error) {
        console.error("Admin reports error:", error);
        return res.status(500).json({message: "Server error"});
    }
};

// A single report plus the reported user's other reports
export const getReport = async (req: express.Request, res: express.Response) => {
    try {
        const report = await prisma.report.findUnique({
            where: {id: String(req.params.id)},
            include: {
                reporter: {select: userSummary},
                reportedUser: {select: {...userSummary, status: true, createdAt: true}},
                resolvedBy: {select: userSummary},
            }
        });
        if (!report) {
            return res.status(404).json({message: "Report not found"});
        }

        const otherReports = await prisma.report.findMany({
            where: {reportedUserId: report.reportedUserId, id: {not: report.id}},
            orderBy: {createdAt: "desc"},
            select: {id: true, reason: true, status: true, createdAt: true}
        });

        return res.status(200).json({message: "Report fetched successfully", report, otherReports});
    } catch (error) {
        console.error("Admin report error:", error);
        return res.status(500).json({message: "Server error"});
    }
};

// Resolve or dismiss a pending report, optionally suspending the reported user in the same transaction
export const resolveReport = async (req: express.Request, res: express.Response) => {
    try {
        const adminId = (req as any).user.id;
        const reportId = String(req.params.id);
        const {outcome, note, suspendUser, suspensionReason} = req.body;

        const report = await prisma.report.findUnique({where: {id: reportId}});
        if (!report) {
            return res.status(404).json({message: "Report not found"});
        }
        if (report.status !== "PENDING") {
            return res.status(409).json({message: "Report has already been handled"});
        }

        const shouldSuspend = suspendUser === true && outcome === "RESOLVED";
        if (suspendUser === true && outcome === "DISMISSED") {
            return res.status(400).json({message: "A dismissed report cannot suspend a user"});
        }

        let suspended = false;
        if (shouldSuspend) {
            const target = await prisma.user.findUnique({
                where: {id: report.reportedUserId},
                select: {id: true, role: true, status: true}
            });
            if (!target) {
                return res.status(404).json({message: "Reported user not found"});
            }
            if (target.id === adminId || target.role === "ADMIN") {
                return res.status(403).json({message: "Admin accounts cannot be suspended"});
            }
            suspended = target.status === "ACTIVE";
        }

        const handled = await prisma.$transaction(async tx => {
            // Conditional update guards against two admins handling the same report
            const updated = await tx.report.updateMany({
                where: {id: reportId, status: "PENDING"},
                data: {status: outcome, resolvedById: adminId, resolvedAt: new Date(), resolutionNote: note || null}
            });
            if (updated.count === 0) return false;

            await tx.adminAuditLog.create({
                data: {
                    adminId,
                    action: outcome === "RESOLVED" ? "REPORT_RESOLVED" : "REPORT_DISMISSED",
                    targetUserId: report.reportedUserId,
                    reportId,
                    note: note || null
                }
            });

            if (suspended) {
                await tx.user.update({
                    where: {id: report.reportedUserId},
                    data: {status: "SUSPENDED", suspendedAt: new Date(), suspensionReason: suspensionReason || note || null}
                });
                await tx.adminAuditLog.create({
                    data: {
                        adminId,
                        action: "USER_SUSPENDED",
                        targetUserId: report.reportedUserId,
                        reportId,
                        note: suspensionReason || note || null
                    }
                });
            }
            return true;
        });

        if (!handled) {
            return res.status(409).json({message: "Report has already been handled"});
        }
        if (suspended) {
            await applySuspensionEffects(report.reportedUserId);
        }

        return res.status(200).json({message: `Report ${outcome.toLowerCase()}`, suspended});
    } catch (error) {
        console.error("Admin resolve error:", error);
        return res.status(500).json({message: "Server error"});
    }
};

// Indefinitely suspend an account
export const suspendUser = async (req: express.Request, res: express.Response) => {
    try {
        const adminId = (req as any).user.id;
        const targetId = String(req.params.id);
        const {reason} = req.body;

        if (targetId === adminId) {
            return res.status(403).json({message: "You cannot suspend yourself"});
        }

        const target = await prisma.user.findUnique({
            where: {id: targetId},
            select: {id: true, role: true, status: true}
        });
        if (!target) {
            return res.status(404).json({message: "User not found"});
        }
        if (target.role === "ADMIN") {
            return res.status(403).json({message: "Admin accounts cannot be suspended"});
        }
        if (target.status === "SUSPENDED") {
            return res.status(409).json({message: "User is already suspended"});
        }

        await prisma.$transaction([
            prisma.user.update({
                where: {id: targetId},
                data: {status: "SUSPENDED", suspendedAt: new Date(), suspensionReason: reason}
            }),
            prisma.adminAuditLog.create({
                data: {adminId, action: "USER_SUSPENDED", targetUserId: targetId, note: reason}
            }),
        ]);
        await applySuspensionEffects(targetId);

        return res.status(200).json({message: "User suspended"});
    } catch (error) {
        console.error("Admin suspend error:", error);
        return res.status(500).json({message: "Server error"});
    }
};

// Reinstate a suspended account
export const reinstateUser = async (req: express.Request, res: express.Response) => {
    try {
        const adminId = (req as any).user.id;
        const targetId = String(req.params.id);
        const {note} = req.body;

        const target = await prisma.user.findUnique({where: {id: targetId}, select: {status: true}});
        if (!target) {
            return res.status(404).json({message: "User not found"});
        }
        if (target.status !== "SUSPENDED") {
            return res.status(409).json({message: "User is not suspended"});
        }

        await prisma.$transaction([
            prisma.user.update({
                where: {id: targetId},
                data: {status: "ACTIVE", suspendedAt: null, suspensionReason: null}
            }),
            prisma.adminAuditLog.create({
                data: {adminId, action: "USER_REINSTATED", targetUserId: targetId, note: note || null}
            }),
        ]);
        await clearSuspensionEffects(targetId);

        return res.status(200).json({message: "User reinstated"});
    } catch (error) {
        console.error("Admin reinstate error:", error);
        return res.status(500).json({message: "Server error"});
    }
};

// Paginated audit log of admin actions
export const getAuditLog = async (req: express.Request, res: express.Response) => {
    try {
        const {page, limit, skip} = parsePaging(req);
        const {adminId, targetUserId, action} = req.query;

        const where: any = {};
        if (adminId) where.adminId = String(adminId);
        if (targetUserId) where.targetUserId = String(targetUserId);
        if (action) where.action = String(action);

        const [total, entries] = await prisma.$transaction([
            prisma.adminAuditLog.count({where}),
            prisma.adminAuditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: {createdAt: "desc"},
                include: {admin: {select: userSummary}, targetUser: {select: userSummary}}
            })
        ]);

        return res.status(200).json({
            message: "Audit log fetched successfully",
            entries,
            pagination: {page, limit, total, totalPages: Math.ceil(total / limit)}
        });
    } catch (error) {
        console.error("Admin audit log error:", error);
        return res.status(500).json({message: "Server error"});
    }
};
