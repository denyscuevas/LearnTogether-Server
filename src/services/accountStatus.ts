import prisma from "../config/prismaClient.ts";
import redis from "./redis.ts";

const key = (userId: string) => `suspended:${userId}`;

// Active status is cached briefly; suspended status has no expiry because suspension is indefinite
const ACTIVE_CACHE_SECONDS = 300;

// Checks whether a user is suspended, using Redis first and falling back to the database
export const isSuspended = async (userId: string): Promise<boolean> => {
    try {
        const cached = await redis.get(key(userId));
        if (cached === "1") return true;
        if (cached === "0") return false;
    } catch (error) {
        console.error("Redis suspension lookup failed:", error);
    }

    const user = await prisma.user.findUnique({where: {id: userId}, select: {status: true}});
    const suspended = user?.status === "SUSPENDED";

    try {
        if (suspended) {
            await redis.set(key(userId), "1");
        } else {
            await redis.set(key(userId), "0", "EX", ACTIVE_CACHE_SECONDS);
        }
    } catch (error) {
        console.error("Redis suspension cache write failed:", error);
    }
    return suspended;
};

// Side effects to run after a user's status has been set to SUSPENDED in the database
export const applySuspensionEffects = async (userId: string) => {
    await prisma.refreshToken.deleteMany({where: {userId}});
    await redis.set(key(userId), "1");

    // Imported lazily to avoid a circular dependency with the socket server
    const {getSocketServer} = await import("../socket-server/socket.ts");
    const sockets = await getSocketServer().fetchSockets();
    for (const s of sockets) {
        if (s.data.userId === userId) {
            s.disconnect(true);
        }
    }
};

// Side effects to run after a user's status has been set back to ACTIVE in the database
export const clearSuspensionEffects = async (userId: string) => {
    await redis.del(key(userId));
};
