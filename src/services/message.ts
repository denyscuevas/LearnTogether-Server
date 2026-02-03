// Interface to hold message data
import prisma from "../config/prismaClient.ts";

interface Message {
    threadId: string;
    senderId: string;
    content: string;
}

// Create a new message in the database
export const createMessage = async (data: Message) => {
    const {threadId, senderId, content} = data

    // Check if all required fields are provided
    if (!threadId || !senderId || !content){
        throw new Error("Invalid message data")
    }

    // Create a new message and return
    return prisma.message.create({
        data: {
            threadId,
            senderId,
            content
        },include: {sender: {select: {profile: true}}}
    });
}
