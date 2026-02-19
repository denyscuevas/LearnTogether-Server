import express from "express";
import prisma from "../config/prismaClient.ts";
import redis from "../services/redis.ts";
import {deleteFromCloudinary, uploadToCloudinary} from "../utils/cloudinary.ts";

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
            isTutee
        } = req.body;

        let {
            tutorCourseIds,
            tuteeCourseIds,
            availability,
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

        // Parse the arrays from the formdata strings into actual arrays
        try {
            tutorCourseIds = tutorCourseIds ? (typeof tutorCourseIds === 'string' ? JSON.parse(tutorCourseIds) : tutorCourseIds) : [];
            tuteeCourseIds = tuteeCourseIds ? (typeof tuteeCourseIds === 'string' ? JSON.parse(tuteeCourseIds) : tuteeCourseIds) : [];
            availability = availability ? (typeof availability === 'string' ? JSON.parse(availability) : availability) : [];
        } catch (e) {
            return res.status(400).json({ message: "Invalid format for courses or availability" });
        }

        // Get the profilePicture from the request, and call the uploadToCloudinary method to get the URL
        let imageURL = req.body.profilePicture;

        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer);
            imageURL = (uploadResult as any).secure_url;
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
                    isTutor: isTutor === "true",
                    isTutee: isTutee === "true",
                    profilePicture: imageURL ? String(imageURL) : null,
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

// Logic to get information about a profile
export const getProfile = async (req: express.Request, res: express.Response) => {
    try {

        // Get the userId in the request, and the ID of the profile to be reviewed from the query params
        const viewerId = (req as any).user?.id;
        const intendedId = req.params.userId || viewerId;

        if (!intendedId) {
            return res.status(400).json({
                message: "Missing ID"
            });
        }

        // Checking if the user is viewing their own profile
        const isSelf = viewerId === intendedId;

        // Creating the Redis cache key depending on if the user is viewing their own profile or someone elses
        const profileCacheKey = isSelf ? `profile:private:${intendedId}` : `profile:public:${intendedId}`;
        const cachedData = await redis.get(profileCacheKey);

        // If the profile is already cached, get it from there and send back the results instantly
        if(cachedData) {
            console.log("Profile info retrieved from cache")
            return res.status(200).json({
                profile: JSON.parse(cachedData), isSelf: isSelf
            });
        }

        // Retrieve the profile-related information for the user
        const profile = await prisma.profile.findUnique({
            where: { userId: intendedId },
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

        // Setting the profile data to the cache key, expiring after 60 minutes if no cache invalidation occurs
        await redis.set(profileCacheKey, JSON.stringify(profile), 'EX', 3600);

        // Return the profile information
        console.log("Profile info retrieved from DB");
        return res.status(200).json({
            profile,
            isSelf: isSelf
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
        } = req.body;

        let {
            tutorCourseIds,
            tuteeCourseIds,
            availability,
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

        // Parse the arrays from the formdata strings into actual arrays
        try {
            tutorCourseIds = tutorCourseIds ? (typeof tutorCourseIds === 'string' ? JSON.parse(tutorCourseIds) : tutorCourseIds) : [];
            tuteeCourseIds = tuteeCourseIds ? (typeof tuteeCourseIds === 'string' ? JSON.parse(tuteeCourseIds) : tuteeCourseIds) : [];
            availability = availability ? (typeof availability === 'string' ? JSON.parse(availability) : availability) : [];
        } catch (e) {
            return res.status(400).json({ message: "Invalid format for courses or availability" });
        }

        // Get the profilePicture from the request, and call the uploadToCloudinary method to get the URL
        let imageURL = req.body.profilePicture;

        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer);
            imageURL = (uploadResult as any).secure_url;

            // Deleting the old image from Cloudinary
            if (existing?.profilePicture && existing.profilePicture.includes('cloudinary')) {
                await deleteFromCloudinary(existing.profilePicture)
            }
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
                    isTutor: isTutor === "true",
                    isTutee: isTutee === "true",
                    profilePicture: imageURL ? String(imageURL) : null,
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

        // Clear all redis keys for this profile to invalidate the cache and force a DB read on the next GET endpoint to get the updated info for subsequent caching
        await redis.del(`profile:private:${userId}`);
        await redis.del(`profile:public:${userId}`);

        // Returning a success message, and including the profile data
        return res.status(200).json({
            message: "Profile updated",
            profile
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error", error
        });
    }
};