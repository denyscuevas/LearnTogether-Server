import cron from 'node-cron';
import prisma from '../config/prismaClient.ts';

// Method to clean up unresponded requests to prevent a backlog of pending requests
export const cleanupPendingRequests  = async () => {

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

// Method to clean up notifications after 7 days to prevent unmanaged table growth
export const cleanupNotifications = async () => {

    // Run the task every day at midnight
    cron.schedule('0 0 * * *', async () => {

        try {

            // Setting the expiration checkup to 7 days after creation
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() - 7);

            // Deleting all notifications that have been active for 7 days or longer
            const deletedNotifications = await prisma.notification.deleteMany({
                where: {
                    createdAt: {
                        lt: expirationDate
                    },
                }
            });

            if (deletedNotifications.count > 0) {
                console.log(`Successfully deleted ${deletedNotifications.count} notifications`);
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    });
};