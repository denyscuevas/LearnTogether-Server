import express from 'express';
import {Server} from "socket.io"
import jwt from "jsonwebtoken";
import {createMessage} from "./services/message.ts";
import {deleteOnlineStatus, setOnlineStatus} from "./services/redisAuthService.ts";
import notifications from "./routes/notifications.ts";

const app = express()

const expressServer = app.listen(4000)

const userList = new Map<string, string>();

// Create socketio server
const ioServer = new Server(expressServer, {
    cors: {
        origin: [process.env.CLIENT_URL as string],
        credentials: true
    }
})

console.log('Socket.io server listening on port 4000')

// Middleware to authenticate socket connections using JWT tokens
ioServer.use((socket, next) => {
    try {
        const token = socket.handshake.auth.token

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined");
        }

        // Decode the JWT token and verify its authenticity
        const decoded = jwt.verify(token!, process.env.JWT_SECRET) as any;

        // Set the socket's id to the user's id retrieved from the JWT
        socket.data.userId = decoded.id;
        next();
    } catch (e) {
        const error = new Error("Not authorized")
        next(error)
    }
})


ioServer.on('connection', socket => {
    // Get the user's id from the socket's data object
    const userId = socket.data.userId;

    // Map the user's socket id to their id
    userList.set(userId.toString(), socket.id.toString())
    console.log("User added to list", userList)

    console.log('Socket connected:', userId)
    // Sets the user's online status to true in Redis
    setOnlineStatus(socket.data.userId).then(() => console.log('User online status set to true'))

    // Join a room. Emitted when a user enters a thread
    socket.on('join_room', roomId => {
        socket.join(roomId)
        console.log('User joined room:', roomId)
    })

    // Leave a room. Emitted when a user leaves a thread
    socket.on('leave_room', roomId => {
        socket.leave(roomId)
        console.log('User left room:', roomId)
    })

    // Emitted when a user starts typing. Used for typing indicators on the frontend
    socket.on('typing', threadId => {
        ioServer.to(threadId).emit('incoming_typing', {threadId, userId})
    })

    // Sends a message to clients in the room
    socket.on('send_message', async data => {
        try {
            console.log("DATA", data.threadId, userId, data.content)
            // Create a new message in the db with the data provided by the client
            const message = await createMessage(
                {
                    threadId: data.threadId,
                    senderId: userId,
                    content: data.content
                }
            )

            console.log('Message created:', message)
            // Send the message to the room
            ioServer.to(data.threadId).emit('incoming_message', message)
        } catch (e) {
            //  If an error occurs, send an error message to the client
            socket.emit('message_error', "An error occurred while sending your message. Please try again later.")
        }
    })

    // Remove the user's online status from Redis when they disconnect
    socket.on('disconnect', () => {
        deleteOnlineStatus(userId).then(() => console.log('User online status set to false'))
    })
})



export interface Notification  {
    receiverId: string,
    name?: string,
    profilePicture?: string,
    content: string,
    notificationType: "CONNECTION_REQUEST" | "REQUEST_ACCEPTED",
    createdAt: Date,
}

export const sendNotification = (notification: Notification) => {
    console.log("userList contents:", [...userList.entries()])
    console.log("Looking for receiverId:", notification.receiverId)
    const connectedUser = userList.get(notification.receiverId)
    if (connectedUser){
        console.log("noti sent to user")
        ioServer.to(connectedUser).emit("notification", notification)
    }
}

