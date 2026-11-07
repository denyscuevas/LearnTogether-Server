import express from "express";
import prisma from "../config/prismaClient.ts";

// Create a report against another user
export const createReport = async (req: express.Request, res: express.Response) => {
    try {
        const reporterId = (req as any).user?.id;
        const {reportedUserId, reason, details} = req.body;
        const shareConversation = req.body.shareConversation === true;
        const conversationId = req.body.conversationId;

        if (reporterId === reportedUserId) {
            return res.status(400).json({message: "You cannot report yourself"});
        }
        if (req.body.shareConversation !== undefined && typeof req.body.shareConversation !== "boolean") {
            return res.status(400).json({message: "shareConversation must be a boolean"});
        }
        if (shareConversation && !conversationId) {
            return res.status(400).json({message: "conversationId is required when sharing conversation history"});
        }

        const reportedUser = await prisma.user.findUnique({
            where: {id: reportedUserId},
            select: {id: true}
        });
        if (!reportedUser) {
            return res.status(404).json({message: "User not found"});
        }

        let conversationSharedAt: Date | null = null;
        if (shareConversation) {
            const thread = await prisma.thread.findUnique({
                where: {id: conversationId},
                select: {ThreadParticipant: {select: {profileId: true}}}
            });
            const participantIds = thread?.ThreadParticipant.map(participant => participant.profileId) ?? [];
            if (!thread || !participantIds.includes(reporterId) || !participantIds.includes(reportedUserId)) {
                return res.status(400).json({message: "The selected conversation must include you and the reported user"});
            }
            conversationSharedAt = new Date();
        }

        // Prevent the same reporter from filing multiple pending reports against one user
        const existing = await prisma.report.findFirst({
            where: {reporterId, reportedUserId, status: "PENDING"},
            select: {id: true}
        });
        if (existing) {
            return res.status(409).json({message: "You already have a pending report against this user"});
        }

        const report = await prisma.report.create({
            data: {
                reporterId,
                reportedUserId,
                reason,
                details: details || null,
                shareConversation,
                sharedConversationThreadId: shareConversation ? conversationId : null,
                conversationSharedAt
            },
            select: {id: true, reason: true, status: true, shareConversation: true, createdAt: true}
        });

        return res.status(201).json({message: "Report submitted", report});
    } catch (error) {
        console.error("Report Error:", error);
        return res.status(500).json({message: "Server error"});
    }
}
