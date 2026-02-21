import prisma from "../config/prismaClient.ts";
import type {Request, Response} from "express";

// Method which gets recommended matches for a user based on their profile data
export const getRecommendedMatches = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        // Get the data of the logged-in user to compare other users to
        const myProfile = await prisma.profile.findUnique({
            where: { userId },
            include: {
                availability: true,
                tutorCourses: true,
                tuteeCourses: true
            }
        });

        // If a user is not found
        if (!myProfile) {
            return res.status(404).json({message: "Profile not found"});
        }

        // Converting the user's tutor and tutee courses to ID arrays for easier comparison
        const isTutorCourses = myProfile.tutorCourses.map(c => c.courseId);
        const isTuteeCourses = myProfile.tuteeCourses.map(c => c.courseId);

        // Ensuring that user's that have existing connection requests are not shown since they are already aware
        const existingRequests = await prisma.connectionRequest.findMany({
            where: {
                OR: [{
                    senderId: userId },
                    { receiverId: userId }]
            },
            select: {
                senderId: true,
                receiverId: true
            }
        });

        // Creating a set of all the IDs in order to remove duplicates
        const excludedUserIds = new Set([
            userId,
            ...existingRequests.map(r => r.senderId),
            ...existingRequests.map(r => r.receiverId)
        ]);

        // Getting the profile data of user's that are not in the excluded array (don't have current connection requests between them)
        const candidates = await prisma.profile.findMany({
            where: {
                userId: {
                    notIn: Array.from(excludedUserIds)
                }
            },
            include: {
                availability: true,
                tutorCourses: {
                    include: {
                        course: true
                    }
                },
                tuteeCourses: {
                    include: {
                        course: true
                    }
                }
            }
        });
} catch (error) {
        console.log(error);
    }
}