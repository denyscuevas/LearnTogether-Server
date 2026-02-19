import express from "express";
import prisma from "../config/prismaClient.ts";

// Logic to create a new user profile
export const createProfile = async (req: express.Request, res: express.Response) => {
    try {
        const userId = (req as any).user?.id;

        // If there is no userId from the middleware response then it's a bad request
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Deconstructing the request payload and getting all the fields
        const {
            name,
            bio,
            major,
            yearOfStudy,
            isTutor,
            isTutee,
            photoUrl,
            tutorCourseIds = [],
            tuteeCourseIds = [],
            availability = [],
        } = req.body;

        // Check if the user has the required fields
        if (!name || !major || !yearOfStudy) {
            return res.status(400).json({
                message: "Missing a required field",
            });
        }

        // Getting the number for year of study
        const year = Number(yearOfStudy);
        if (!year) {
            return res.status(400).json({
                message: "Invalid year of study"
            });
        }

        // Checking if the user has selected tutor, tutee, or both and hasn't left it blank
        if (!Boolean(isTutor) && !Boolean(isTutee)) {
            return res.status(400).json({
                message: "Please select tutor, tutee, or both"
            });
        }

        // Making sure there is not an existing profile for this user
        const existingProfile = await prisma.profile.findFirst({
            where: {
                userId: userId }
        });
        if (existingProfile) {
            return res.status(409).json({
                message: "Profile already exists"
            });
        }

        // Create the profile table with the non-join values first
        await prisma.$transaction(async (tx) => {
            await tx.profile.create({
                data: {
                    userId,
                    name: String(name).trim(),
                    bio: bio ? String(bio).trim() : null,
                    major: String(major).trim(),
                    yearOfStudy: year,
                    isTutor: Boolean(isTutor),
                    isTutee: Boolean(isTutee),
                    profilePicture: photoUrl ? String(photoUrl) : null,
                },
            });

            // Checking if the user has added tutor courses, and adding them to their profile
            if (tutorCourseIds.length) {
                await tx.profileTutorCourse.createMany({
                    data: tutorCourseIds.map((courseId: any) => ({
                        profileId: userId,
                        courseId: Number(courseId) })),
                    skipDuplicates: true,
                });
            }

            // Checking if the user has added tutee courses, and adding them to their profile
            if (tuteeCourseIds.length) {
                await tx.profileTuteeCourse.createMany({
                    data: tuteeCourseIds.map((courseId: any) => ({
                        profileId: userId,
                        courseId: Number(courseId) })),
                    skipDuplicates: true,
                });
            }

            // Getting the users availability, storing the day, start minute, and end minute
            if (availability.length) {
                await tx.availabilitySlot.createMany({
                    data: availability.map((slot: any) => ({
                        profileId: userId,
                        day: slot.day,
                        startMin: Number(slot.startMin),
                        endMin: Number(slot.endMin),
                    })),
                });
            }
        });

        // Getting the full profile structure for that user
        const profile = await prisma.profile.findUnique({
            where: { userId },
            include: {
                tutorCourses: { include: { course: true } },
                tuteeCourses: { include: { course: true } },
                availability: true,
            },
        });

        // Returning a success message, and including the profile data
        return res.status(201).json({
            message: "Profile created", profile
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error", error
        });
    }
};

// Logic to get the user information for the logged-in user (ME)
export const getMyProfile = async (req: express.Request, res: express.Response) => {
    try {

        // Get the user object in the request
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        // Retrieve the profile-related information for the user
        const profile = await prisma.profile.findUnique({
            where: { userId },
            include: {
                user: { select: { id: true } },
                tutorCourses: { include: { course: true } },
                tuteeCourses: { include: { course: true } },
                availability: true,
            },
        });

        if (!profile) {
            return res.status(404).json({
                message: "Profile not found"
            });
        }

        // Return the profile information
        return res.status(200).json({
            profile,
            isOwnProfile: true,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error", error
        });
    }
};

// Logic to get the user information for another profile
export const getOtherProfile = async (req: express.Request, res: express.Response) => {
    try {

        // Get the id of the user that's making the request, and the id of the user being viewed
        const viewerId = (req as any).user?.id;
        const { userId } = req.params;

        if (!viewerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!userId) {
            return res.status(400).json({
                message: "Missing userId"
            });
        }

        // Retrieve the profile-related information for the user
        const profile = await prisma.profile.findUnique({
            where: { userId },
            include: {
                user: { select: { id: true, email: true } },
                tutorCourses: { include: { course: true } },
                tuteeCourses: { include: { course: true } },
                availability: true,
            },
        });

        if (!profile) {
            return res.status(404).json({
                message: "Profile not found"
            });
        }

        // Return the profile information
        return res.status(200).json({
            profile,
            isOwnProfile: viewerId === userId,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error", error
        });
    }
};

// Logic to update a user's profile information (ME)
export const updateMyProfile = async (req: express.Request, res: express.Response) => {
    try {
        const userId = (req as any).user?.id;

        // If there is no userID from the middleware then it's a bad request
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Deconstructing the request payload and getting all the fields
        const {
            name,
            bio,
            major,
            yearOfStudy,
            isTutor,
            isTutee,
            profilePicture,
            tutorCourseIds = [],
            tuteeCourseIds = [],
            availability = [],
        } = req.body;

        // Check if the user has the required fields
        if (!name || !major || !yearOfStudy) {
            return res.status(400).json({
                message: "Missing required fields"
            });
        }

        // Getting the number for year of study
        const year = Number(yearOfStudy);
        if (!year) {
            return res.status(400).json({
                message: "Invalid year of study"
            });
        }

        // Checking if the user has selected tutor, tutee, or both and hasn't left it blank
        if (!Boolean(isTutor) && !Boolean(isTutee)) {
            return res.status(400).json({
                message: "Please select tutor, tutee, or both"
            });
        }

        // Ensuring the user has a profile already which is required to update it
        const existing = await prisma.profile.findUnique({
            where: {
                userId: userId }
        });
        if (!existing) {
            return res.status(404).json({
                message: "Profile not found"
            });
        }

        // Update the profile table with the non-join values first
        await prisma.$transaction(async (tx) => {
            await tx.profile.update({
                where: { userId },
                data: {
                    name: String(name).trim(),
                    bio: bio ? String(bio).trim() : null,
                    major: String(major).trim(),
                    yearOfStudy: year,
                    isTutor: Boolean(isTutor),
                    isTutee: Boolean(isTutee),
                    profilePicture: profilePicture ? String(profilePicture) : null,
                },
            });

            // Updating the ProfileTutorCourses by deleting the existing ones and adding the new ones
            await tx.profileTutorCourse.deleteMany({ where: {
                profileId: userId }
            });
            if (tutorCourseIds.length) {
                await tx.profileTutorCourse.createMany({
                    data: tutorCourseIds.map((courseId: any) => ({
                        profileId: userId,
                        courseId: Number(courseId),
                    })),
                    skipDuplicates: true,
                });
            }

            // Updating the ProfileTuteeCourses by deleting the existing ones and adding the new ones
            await tx.profileTuteeCourse.deleteMany({ where: {
                profileId: userId }
            });
            if (tuteeCourseIds.length) {
                await tx.profileTuteeCourse.createMany({
                    data: tuteeCourseIds.map((courseId: any) => ({
                        profileId: userId,
                        courseId: Number(courseId),
                    })),
                    skipDuplicates: true,
                });
            }

            // Updating the Availability slots by deleting the existing ones and adding new ones
            await tx.availabilitySlot.deleteMany({ where: {
                profileId: userId }
            });
            if (availability.length) {
                await tx.availabilitySlot.createMany({
                    data: availability.map((slot: any) => ({
                        profileId: userId,
                        day: slot.day,
                        startMin: Number(slot.startMin),
                        endMin: Number(slot.endMin),
                    })),
                });
            }
        });

        // Getting the full profile structure for that user with tne updates applied
        const profile = await prisma.profile.findUnique({
            where: { userId },
            include: {
                tutorCourses: { include: { course: true } },
                tuteeCourses: { include: { course: true } },
                availability: true,
            },
        });

        // Returning a success message, and including the profile data
        return res.status(200).json({
            message: "Profile updated",
            profile,
            isOwnProfile: true,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error", error
        });
    }
};