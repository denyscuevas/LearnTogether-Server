import express from 'express';
import prisma from "./config/prismaClient.ts";
import {Server} from "socket.io"
import jwt from "jsonwebtoken";
import {createMessage} from "./services/message.ts";

const app = express()

const expressServer = app.listen(4000)

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
    try{
        const token = socket.handshake.auth.token

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined");
        }

        // Decode the JWT token and verify its authenticity
        const decoded = jwt.verify(token!, process.env.JWT_SECRET) as any;

        // Set the socket's id to the user's id retrieved from the JWT
        socket.data.userId = decoded.id;
        next();
    }catch (e) {
        const error = new Error("Not authorized")
        next(error)
    }
})


ioServer.on('connection', socket => {
    // Emit a welcome message to the client on connection
    socket.emit('welcome', 'Hello from server!')

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
    socket.on('typing', threadId=>{
        ioServer.to(threadId).emit('incoming_typing', {threadId, userId: socket.data.userId})
    })

    // Sends a message to clients in the room
    socket.on('send_message', async data => {
        try{
            // Create a new message in the db with the data provided by the client
            const message = await createMessage({threadId: data.threadId, senderId: socket.data.userId, content: data.content})
            // Send the message to the room
            ioServer.to(data.threadId).emit('incoming_message', message)
        }catch (e) {
           //  If an error occurs, send an error message to the client
           socket.emit('message_error', "An error occurred while sending your message. Please try again later.")
        }
    })
})

