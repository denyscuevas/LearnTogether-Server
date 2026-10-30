import express from "express";
import {body, param, query} from "express-validator";
import {requireAuth} from "../middleware/verifyUserMiddleware.ts";
import {requireAdmin} from "../middleware/requireAdmin.ts";
import {checkRequestErrors} from "../middleware/validationMiddleware.ts";
import {limiter} from "../middleware/endpointRateLimiter.ts";
import {
    getAuditLog,
    getReport,
    getReports,
    getUsers,
    getUserStats,
    reinstateUser,
    resolveReport,
    suspendUser
} from "../controllers/AdminController.ts";

const router = express.Router();

const adminLimiter = limiter(60 * 1000, 120, "Too many requests. Please slow down.");

router.use(requireAuth, requireAdmin, adminLimiter);

const idParam = param("id").isUUID().withMessage("A valid id is required");
const paging = [
    query("page").optional().isInt({min: 1}).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({min: 1, max: 100}).withMessage("limit must be between 1 and 100"),
];

router.get("/users/stats", getUserStats);

router.get("/users", [
    ...paging,
    query("status").optional().isIn(["ACTIVE", "SUSPENDED"]).withMessage("Invalid status"),
    query("sort").optional().isIn(["asc", "desc"]).withMessage("sort must be asc or desc"),
], checkRequestErrors, getUsers);

router.post("/users/:id/suspend", [
    idParam,
    body("reason").isString().trim().isLength({min: 1, max: 500}).withMessage("A reason (max 500 characters) is required"),
], checkRequestErrors, suspendUser);

router.post("/users/:id/reinstate", [
    idParam,
    body("note").optional({values: "null"}).isString().trim().isLength({max: 500}).withMessage("Note must be at most 500 characters"),
], checkRequestErrors, reinstateUser);

router.get("/reports", [
    ...paging,
    query("status").optional().isIn(["PENDING", "RESOLVED", "DISMISSED", "ALL"]).withMessage("Invalid status"),
], checkRequestErrors, getReports);

router.get("/reports/:id", [idParam], checkRequestErrors, getReport);

router.patch("/reports/:id/resolve", [
    idParam,
    body("outcome").isIn(["RESOLVED", "DISMISSED"]).withMessage("outcome must be RESOLVED or DISMISSED"),
    body("note").optional({values: "null"}).isString().trim().isLength({max: 500}).withMessage("Note must be at most 500 characters"),
    body("suspendUser").optional().isBoolean({strict: true}).withMessage("suspendUser must be a boolean"),
    body("suspensionReason").optional({values: "null"}).isString().trim().isLength({max: 500}).withMessage("Suspension reason must be at most 500 characters"),
], checkRequestErrors, resolveReport);

router.get("/audit-log", [
    ...paging,
    query("adminId").optional().isUUID().withMessage("adminId must be a UUID"),
    query("targetUserId").optional().isUUID().withMessage("targetUserId must be a UUID"),
    query("action").optional().isIn(["USER_SUSPENDED", "USER_REINSTATED", "REPORT_RESOLVED", "REPORT_DISMISSED"]).withMessage("Invalid action"),
], checkRequestErrors, getAuditLog);

export default router;
