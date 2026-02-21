import prisma from "../config/prismaClient.ts";
import type {Request, Response} from "express";
import {formatTime} from "../utils/formatDateTime.ts";


const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

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

        // The actual logic for determine matched users, which utilizes a weight-based scoring approach
        const scoredMatches = candidates.map((candidate) => {
            let score = 0;

            // Creating the arrays to hold why users were matched together
            const structuredReasons = {
                canHelpYou: [] as string[],
                youCanHelpThem: [] as string[],
                availabilityOverlap: [] as string[],
                commonDetails: [] as string[]
            };

            // Looking for users whose list of courses they can tutor contain courses in the logged-in user's tutee courses
            // If there is any match, award 100 points for each course match
            const tutorMeMatch = candidate.tutorCourses.filter(tc => isTuteeCourses.includes(tc.courseId));
            if (tutorMeMatch.length > 0) {
                score += tutorMeMatch.length * 100;
                structuredReasons.canHelpYou = tutorMeMatch.map(tc => `${tc.course.code} (${tc.course.name})`);
            }

            // Looking for users whose list of courses that they need help in contains courses in the logged-in users can tutor courses
            // If there is any match, award 80 points for each course match
            const tutorThemMatch = candidate.tuteeCourses.filter(tc => isTutorCourses.includes(tc.courseId));
            if (tutorThemMatch.length > 0) {
                score += tutorThemMatch.length * 100;
                structuredReasons.youCanHelpThem = tutorThemMatch.map(tc => `${tc.course.code} (${tc.course.name})`);
            }

            // Looking for users that have overlapping availability slots
            // These people would have the same day, and to check the existence of an overlap, the latest start time is compared to the earliest end time
            candidate.availability.forEach(theirTime => {
                const overlap = myProfile.availability.find(myTime =>
                    theirTime.day === myTime.day &&
                    Math.max(myTime.startMin, theirTime.startMin) < Math.min(myTime.endMin, theirTime.endMin)
                );

                // If there is an overlap, award the points, and if they have availability today, then award bonus points for instant connection opportunity
                if (overlap) {
                    let overlapPoints = 40;

                    if (theirTime.day === today) {
                        overlapPoints += 20;
                        structuredReasons.availabilityOverlap.push(`Available TODAY: ${formatTime(Math.max(theirTime.startMin, overlap.startMin))} - ${formatTime(Math.min(theirTime.endMin, overlap.endMin))}`);
                    } else {
                        const start = formatTime(Math.max(theirTime.startMin, overlap.startMin));
                        const end = formatTime(Math.min(theirTime.endMin, overlap.endMin));
                        structuredReasons.availabilityOverlap.push(`${theirTime.day}: ${start} - ${end}`);
                    }

                    score += overlapPoints;
                }
            });

            // Comparing if the user's have matching majors, which will award points as well
            if (candidate.major === myProfile.major) {
                score += 30;
                structuredReasons.commonDetails.push(`Both are ${candidate.major} majors`);
            }

            return {
                ...candidate,
                matchScore: score,
                matchReasons: structuredReasons
            };
        });

        // Returning the top 10 match results
        const topMatches = scoredMatches
            .filter(m => m.matchScore > 0)
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 10);

        return res.status(200).json({
            message: "Match results retrieved",
            topMatches
        });

    } catch (error) {
        console.error("Match Error:", error);
        return res.status(500).json({
            message: "Server error in matching algorithm"
        });
    }
}