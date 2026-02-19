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
        return res.status(500).json({
            message: "Failed to send request", error
        });
    }
};

// Method which handles accepting connect requests between users
export const acceptConnectionRequest = async (req: Request, res: Response) => {
    try {

        // Getting the ID of the user that the request was accepted by, and the requestID itself
        const userId = (req as any).user?.id;
        const { requestId } = req.params;

        // Making sure the request exists
        const connectionRequest = await prisma.connectionRequest.findUnique({
            where : {
                id: requestId!
            }
        });

        // If there is no connection request record indicate to the user of this
        if (!connectionRequest) {
            return res.status(404).json({
                message: "Request not found"
            });
        }

        // Ensuring the logged in user is the intended recipient of this request
        if (connectionRequest.receiverId !== userId) {
            return res.status(403).json({
                message: "You are not authorized to accept this request"
            });
        }

        // PENDING is the only status that a live request can have
        if (connectionRequest.status !== 'PENDING') {
            return res.status(400).json({
                message: "This request has already been processed"
            });
        }

       // Modify the Thread and ConnectionRequest records to reflect the acceptance
        await prisma.$transaction([
            prisma.connectionRequest.update({
                where: {
                    id: requestId!
                },
                data: {
                    status: 'ACCEPTED'
                }
            }),

            // Change the Thread status to accepted, which will allow messages to begin
            prisma.thread.update({
                where: {
                    id: connectionRequest.threadId!
                },
                data: {
                    isAccepted: true
                }
            })
        ]);

        return res.status(200).json({
            message: "Request accepted"
        });

    } catch (error) {
        console.error("Accept Error:", error);
        return res.status(500).json({
            message: "Failed to accept request"
        });
    }
};

// Method that handles the declining of connect requests between users
export const rejectConnectionRequest = async (req: Request, res: Response) => {
    try {

        // Getting the ID of the user that the request was rejected by, and the requestID itself
        const userId = (req as any).user?.id;
        const { requestId } = req.params;

        // Making sure the request exists
        const connectionRequest = await prisma.connectionRequest.findUnique({
            where: {
                id: requestId!
            },
        });

        // If there is no connection request record indicate to the user of this
        if (!connectionRequest) {
            return res.status(404).json({
                message: "Request not found"
            });
        }

        // Ensuring the logged-in user is the intended recipient of this request
        if (connectionRequest.receiverId !== userId) {
            return res.status(403).json({
                message: "You are not authorized to decline this request"
            });
        }

        // Deleting the Thread and ConnectionRequest records to reflect the rejection
        await prisma.$transaction([
            prisma.connectionRequest.delete({
                where: {
                    id: requestId!
                }
            }),

            prisma.thread.delete({
                where: {
                    id: connectionRequest.threadId!
                }
            }),
        ]);

        return res.status(200).json({
            message: "Request declined"
        });

    } catch (error) {
        console.error("Reject Error:", error);
        return res.status(500).json({
            message: "Failed to reject request"
        });
    }
};