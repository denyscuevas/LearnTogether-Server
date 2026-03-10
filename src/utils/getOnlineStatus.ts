import redis from "../services/redis.ts";

// Returns a map of user IDs and their online status retrieved from Redis
export const mapOnlineStatus = async (userIds: string[]) => {
    // Create a pipeline to get the online status of each participant
    // The redis pipeline is used runs multiple commands in parallel
    const pipeline = redis.pipeline();
    userIds.forEach(id => pipeline.get(`user:${id}:online`))
    const onlineUsers = await pipeline.exec();

    // Create a map with participant IDs as keys and online status as values
    const statusMap = new Map(
        userIds.map((id, i) => {
            // Set online to true if the list exists and the user is online.
            // onlineUsers[i][1] is the timestamp of the last online status
            const isOnline = onlineUsers && onlineUsers[i] && onlineUsers[i][1] !== null
            return [id, isOnline]
        })
    )

    return statusMap;
}