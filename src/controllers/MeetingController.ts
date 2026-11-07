import express from "express";
import prisma from "../config/prismaClient.ts";

export const createMeeting = async (req: express.Request, res: express.Response) => {
    try {
        const creatorId = (req as any).user?.id;
        const { courseId, attendeeIds, startTime, endTime } = req.body;

        if (!creatorId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const courseIdNum = Number(courseId);
        if (!Number.isInteger(courseIdNum)) {
            return res.status(400).json({ message: "A valid courseId is required" });
        }

        if (!Array.isArray(attendeeIds) || attendeeIds.some((id) => typeof id !== "string")) {
            return res.status(400).json({ message: "attendeeIds must be an array of user IDs" });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: "Valid startTime and endTime are required" });
        }
        if (end <= start) {
            return res.status(400).json({ message: "endTime must be after startTime" });
        }

        // The creator is always an attendee; dedupe the rest
        const allIds: string[] = Array.from(new Set<string>([creatorId, ...attendeeIds]));

        const [course, users] = await Promise.all([
            prisma.course.findUnique({ where: { id: courseIdNum } }),
            prisma.user.count({ where: { id: { in: allIds } } }),
        ]);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        if (users !== allIds.length) {
            return res.status(400).json({ message: "One or more attendees do not exist" });
        }

        const meeting = await prisma.meeting.create({
            data: {
                creatorId,
                courseId: courseIdNum,
                attendeeIds: allIds,
                startTime: start,
                endTime: end,
            },
        });

        return res.status(201).json({ message: "Meeting created", meeting });
    } catch (error) {
        console.error("Create Meeting Error:", error);
        return res.status(500).json({ message: "Failed to create meeting" });
    }
};

// Meetings the current user created or attended
export const getMyMeetings = async (req: express.Request, res: express.Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const meetings = await prisma.meeting.findMany({
            where: { OR: [{ creatorId: userId }, { attendeeIds: { has: userId } }] },
            include: { course: { select: { code: true, name: true } } },
            orderBy: { startTime: "desc" },
        });

        return res.status(200).json({ meetings });
    } catch (error) {
        console.error("Get Meetings Error:", error);
        return res.status(500).json({ message: "Failed to fetch meetings" });
    }
};

export const getMeeting = async (req: express.Request, res: express.Response) => {
    try {
        const userId = (req as any).user?.id;
        const meeting = await prisma.meeting.findUnique({
            where: { id: String(req.params.meetingId) },
            include: { course: { select: { code: true, name: true } } },
        });

        if (!meeting || (meeting.creatorId !== userId && !meeting.attendeeIds.includes(userId))) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        return res.status(200).json({ meeting });
    } catch (error) {
        console.error("Get Meeting Error:", error);
        return res.status(500).json({ message: "Failed to fetch meeting" });
    }
};
