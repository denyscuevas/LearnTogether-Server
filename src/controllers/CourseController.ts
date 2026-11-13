import type { Request, Response } from "express";
import prisma from "../config/prismaClient.ts";

export const getCourse = async (req: Request, res: Response) => {
    const courseId = req.params.courseId;
    const id = Number(courseId);
    if (!courseId || !/^\d+$/.test(courseId) || !Number.isInteger(id) || id < 1 || id > 2147483647) {
        return res.status(400).json({ message: "A valid course ID is required" });
    }

    try {
        const course = await prisma.course.findUnique({
            where: { id },
            select: { code: true, name: true },
        });

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        return res.status(200).json(course);
    } catch (error) {
        console.error("Get Course Error:", error);
        return res.status(500).json({ message: "Failed to fetch course" });
    }
};
