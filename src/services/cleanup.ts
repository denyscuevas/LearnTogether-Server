import cron from 'node-cron';
import prisma from '../config/prismaClient.ts';

// Method to clean up unresponded requests to prevent a backlog of pending requests
export const cleanupPendingRequests = () => {

    // Running the cleanup every day at midnight
    cron.schedule('0 0 * * *', async () => {

        // Setting the expiration checkup to 3 days after creation
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() - 3);

        try {
            const pendingRequests = await prisma.connectionRequest.findMany({
                where: {
                    status: 'PENDING',
                    createdAt: {
                        lt: expirationDate
                    }
                },
                select: {
                    id: true,
                    threadId: true
                }
            });

            if (pendingRequests.length === 0) {
                return;
            }

            // Getting the ids of the requests and the threads
            const threadIds = pendingRequests.map(r => r.threadId).filter(id => id !== null) as string[];
            const requestIds = pendingRequests.map(r => r.id);

            // Deleting the Threads, Requests, and child records
            await prisma.$transaction([
                prisma.thread.deleteMany({
                    where: {
                        id: {
                            in: threadIds
                        }
                    }
                }),
                prisma.connectionRequest.deleteMany({
                    where: {
                        id: {
                            in: requestIds
                        }
                    }
                })
            ]);

            console.log(`Successfully deleted ${pendingRequests.length} expired requests.`);
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    });
};