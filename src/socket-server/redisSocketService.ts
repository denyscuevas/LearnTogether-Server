import redis from "../services/redis.ts";

// Method to set a user's online status to true for 5 minutes
export const setOnlineStatus = async (userId: string | number) => {
    return redis.set(`user:${userId}:online`, Date.now(), 'EX', 300);
};

// Method to get a user's online status
export const getOnlineStatus = async (userId: string | number) => {
    return redis.get(`user:${userId}:online`);
};

// Method to delete a user's online status
export const deleteOnlineStatus = async (userId: string | number) => {
    return redis.del(`user:${userId}:online`);
}

// Set a socket key to store the socket id associated with a user when they connect to the socket server
export const setSocket = async (userId: string, socketId: string) => {
    redis.set(`socket:${userId}`, socketId);
}

// Get the socket id
export const getSocket = async (userId: string) => {
    return redis.get(`socket:${userId}`);
}

// Delete the socket id
export const deleteSocket = async (userId: string) => {
    return redis.del(`socket:${userId}`);
}