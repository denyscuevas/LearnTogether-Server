import type {Request, Response} from "express";
import prisma from "../config/prismaClient.ts";

// Logic for getting a user's notifications
export const getNotifications = async (req: Request, res: Response) => {

    try  {

        // Get the userId
        const userId = (req as any).user?.id;

        // Find the logged-in user's profile
        const userProfile = await prisma.profile.findUnique({
            where: {
                userId: userId
            }
        });

        // Indicate if no profile is found
        if (!userProfile) {
            res.status(404).json({
                message: "Profile not found"
            });
        }

        // Get the 10 most recent notifications for this user
        const notifications = await prisma.notification.findMany({
            where: {
                recipientId: userId
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10,
            include: {
                sender: {
                    select: {
                        name: true,
                        profilePicture: true
                    }
                }
            }
        });

        // Get the number of unread notifications
        const unreadCount = await prisma.notification.count({
            where: {
                recipientId: userId,
                isRead: false
            }
        });

        // Return the notifications and unread count
        return res.status(200).json(
            { notifications, unreadCount }
        );
    } catch (error) {
        return res.status(500).json(
            { message: "Failed to fetch notifications" }
        );
    }
}

// Logic for marking all of a user's notifications as READ when they click the bell icon
export const markAllAsRead = async (req: Request, res: Response) => {
    try {

        // Get the userId
        const userId = (req as any).user?.id;

        // Get the user's profile, and select their id in order to query their notifications
        const profile = await prisma.profile.findUnique({
            where: {
                userId: userId
            },
            select: {
                id: true
            }
        });

        // If the user's profile is not found
        if (!profile) {
            return res.status(404).json({
                message: "Profile not found"
            });
        }

        // Updating all notifications for this user where isRead was false to true to make them READ
        await prisma.notification.updateMany({
            where: {
                recipientId: userId,
                isRead: false
            },
            data: {
                isRead: true
            }
        });

        // Sending back the response message
        return res.status(200).json({
            message: "notifications.ts marked as read"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to mark as read"
        });
    }
}
