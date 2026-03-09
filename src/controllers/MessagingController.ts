import express from "express";
import type {Request, Response} from "express";
import prisma from "../config/prismaClient.ts";
import profile from "../routes/profile.ts";
import type {Message, ThreadParticipant, User} from "../generated/prisma/client.ts";
import message from "../routes/message.ts";
import {decrypt} from "../services/message.ts";
import redis from "../services/redis.ts";
import {mapOnlineStatus} from "../utils/getOnlineStatus.ts";

// Create a new thread between two users //
export const createThread = async (req: Request, res: Response) => {
    try {

        // Get the user's id from the middleware
        const userId = (req as any).user?.id;
        const {participant1, participant2} = req.body;

        // Ensure a thread cannot be created between two users other than themselves
        if (userId !== participant1 && userId !== participant2) {
            return res.status(401).json({
                message: "You can only create a thread between yourself and another user",
                userId: userId
            });
        }

        if (!participant1 || !participant2) {
            return res.status(400).json({message: "Two participants are required to create a thread"});
        }

        // Find any existing threads between the two participants
        const threads = await prisma.thread.findMany({
            where: {
                ThreadParticipant: {
                    every: {
                        profileId: {in: [participant1, participant2]}
                    }
                }
            }, include: {ThreadParticipant: true,}
        })

        // If no threads exist between the two participants, create a new one
        if (threads.length < 1) {
            // Create an empty thread
            const newThread = await prisma.thread.create({
                data: {}
            })

            // Creat two thread participants associated with the new thread
            const newThreadParticipant = await prisma.threadParticipant.createMany({
                data: [
                    {threadId: newThread.id, profileId: participant1},
                    {threadId: newThread.id, profileId: participant2},
                ]
            })

            // Return the new thread and participants
            return res.status(201).json({
                message: "Thread created successfully",
                data: {
                    participants: {
                        newThreadParticipant
                    },
                    thread: {
                        newThread
                    }
                }
            });
            //     If a thread exists between the two participants, return a conflict error
        } else {
            return res.status(409).json({
                message: "Thread already exists between these participants"
            });
        }
    } catch (error) {
        return res.status(500).json({message: "Server error", error});
    }
}

// Get all threads associated with a user //

export const getThreads = async (req: Request, res: Response) => {
    try {
        // Get the user's id from the middleware to prevent anyone's threads to be accessed
        const userId = (req as any).user?.id;

        // Check if user ID is provided
        if (!userId) {
            return res.status(400).json({message: "User ID is required"});
        }

        // Find all threads where the user is a participant
        const threads = await prisma.thread.findMany({
            where: {
                isAccepted: true,
                ThreadParticipant: {
                    some: {
                        profileId: {in: [userId]}
                    }
                }
                // Include participant profiles in the thread object
                // Exclude the user's own profile from the participant list
            }, include: {
                ThreadParticipant: {
                    where: {profileId: {not: userId,},},
                    include: {user: {select: {profile: true, email: true},},},
                },
            }
        })

        // Create a map of thread participant ids from the list of threads
        const participants = threads.flatMap(u => u.ThreadParticipant.map(p => p.profileId))

        // Call the mapOnlineStatus function to get the online status of each participant
        const statusMap = await mapOnlineStatus(participants)

        // Update the threads and add the online status to each participant
        const threadsWithStatus = threads.map(thread => ({
            ...thread,
            ThreadParticipant: thread.ThreadParticipant.map(participant => ({
                ...participant,
                user: {
                    ...participant.user,
                    profile: {
                        ...participant.user.profile,
                        isOnline: statusMap.get(participant.profileId)
                    }
                }
            }))
        }))

        // Return the threads with online status
        return res.status(200).json({
            message: "Threads fetched successfully",
            threads: threadsWithStatus
        });
    } catch (error) {
        return res.status(500).json({message: "Server error", error});
    }
}

// Store the message encryption key
const key = process.env.MESSAGE_ENCRYPT_SECRET

// Get all messages in a thread //
export const getMessages = async (req: Request, res: Response) => {
    try {
        const threadId = req.params.threadId;
        const userId = (req as any).user?.id;

        // Check if thread ID is provided
        if (!threadId) {
            return res.status(400).json({message: "Thread ID is required"});
        }

        // Get all messages in the thread. Include the sender's profile in the message object
        const messages = await prisma.message.findMany({
            where: {threadId},
            include: {sender: {select: {profile: true}}}
        })

        if (!key) {
            return res.status(400).json({message: "Encryption error"});
        }

        // Decrypt each message's content using the key and iv stored in the message object
        const decryptedMessages = messages.map(msg => ({
                ...msg,
                content: decrypt(msg.content, key, msg.iv, msg.authTag)
            }
        ))

        // Return the messages
        return res.status(200).json({
            message: "Messages fetched successfully",
            data: decryptedMessages
        });
    } catch (error) {
        return res.status(500).json({message: "Server error", error});
    }
}


//// MESSAGE CREATION IS HANDLED IN THE message.ts SERVICE ////

// // Create a new message //
// export const createMessage = async (req: Request, res: Response) => {
//     try {
//         const {threadId, senderId, content} = req.body;
//
//         // Check if all required fields are provided
//         if (!threadId || !senderId || !content) {
//             return res.status(400).json({message: "Thread ID, sender ID, and content are required to create a message"});
//         }
//
//         // Create the new message
//         const newMessage = await prisma.message.create({
//             data: {
//                 threadId,
//                 senderId,
//                 content
//             }
//         })
//
//         // Return the new message
//         return res.status(201).json({
//             message: "Message created successfully",
//             data: newMessage
//         });
//     } catch (error) {
//         return res.status(500).json({message: "Server error", error});
//     }
// }
