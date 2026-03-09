import prisma from "../config/prismaClient.ts";
import {setOnlineStatus} from "../socket-server/redisSocketService.ts";

// Seeds the redis database with online status for half of the users in the database
const seedOnlineStatus = async () => {
    // Get all users
    const users = await prisma.user.findMany()

    // Set online status for half of the users
    for(let i = 0; i < (users.length / 2); i++){
        await setOnlineStatus(users[i]!.id)
    }
}

seedOnlineStatus().then(() => console.log("Online status seeded"))