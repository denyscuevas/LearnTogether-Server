import {getSocketServer} from "./socket.ts";
import {getSocket} from "./redisSocketService.ts";

export interface Notification  {
    receiverId: string,
    name?: string,
    profilePicture?: string,
    content: string,
    notificationType: "CONNECTION_REQUEST" | "REQUEST_ACCEPTED",
    createdAt: Date,
}

export const sendNotification = async (notification: Notification) => {
    // Get the socket server
    const ioServer = getSocketServer()

    // Get the socket id of the user connected to the server from redis, if they are connected
    const socketId = await getSocket(notification.receiverId)
    console.log("socket id", socketId)

    // Send the notification to the user if they are connected and the server exists
    if (socketId && ioServer){
        ioServer.to(socketId).emit("notification", notification)
        console.log("notification sent to user")
    }
}
