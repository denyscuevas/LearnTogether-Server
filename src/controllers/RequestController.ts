import type {Request, Response} from 'express';
import prisma from "../config/prismaClient.ts";
import {createMessage} from "../services/message.ts";
import type { Message } from "../services/message.ts";

// Method which handles the creation of requests for connecting between users
export const sendConnectionRequest = async (req: Request, res: Response) => {
    try {

        // Getting the senderId, receiverId, and messageContent from the request
        const senderId = (req as any).user?.id;
        const { receiverId, messageContent } = req.body;

        console.log(senderId);
        console.log(messageContent);
        console.log(receiverId);

        // Ensure the ID of both came in the request
        if (!senderId || !receiverId) {
            return res.status(400).json({
                message: "Sender and Receiver IDs are required"
            });
        }

        // Ensure the user isn't somehow requesting themselves
        if (senderId === receiverId) {
            return res.status(400).json({
                message: "You cannot request yourself"
            });
        }

        // Look for an existing connection request between them
        const existingConnection = await prisma.connectionRequest.findUnique({
            where: {
                senderId_receiverId: { senderId, receiverId }
            }
        });

        // If there is then they can;t create another
        if (existingConnection) {
            return res.status(409).json({
                message: "Request already exists between these users"
            });
        }

        // Get the request sender's profile
        const senderProfile = await prisma.profile.findUnique({
            where: {
                userId: senderId
            }
        })

        // The multiple-table queries for creating the records
        const result = await prisma.$transaction(async (tx) => {

            // Create the Thread between the two users initially
            const thread = await tx.thread.create({
                data: {
                    isAccepted: false,
                    lastMessagePreview: messageContent || "New connection request",
                    lastMessageAt: new Date(),
                    ThreadParticipant: {
                        create: [
                            { profileId: senderId },
                            { profileId: receiverId }
                        ]
                    }
                }
            });

            // Create the connection request object
            const connectionRequest = await tx.connectionRequest.create({
                data: {
                    senderId,
                    receiverId,
                    message: messageContent || `New connection request from ${senderProfile!.name}`,
                    threadId: thread.id,
                    status: 'PENDING'
                }
            });

            // Creating the initial message, if it exists
            if (messageContent) {
                const firstMessage: Message = {
                    threadId: thread.id,
                    senderId: senderId,
                    content: messageContent
                }
                await createMessage(firstMessage, tx);
            }

            return { connectionRequest, thread };
        });

        return res.status(201).json({
            message: "Request sent successfully",
            data: result
        });

    } catch (error) {
        console.error("Request Error:", error);
        return res.status(500).json({ message: "Failed to send request", error });
    }
};