import express from 'express';
import {Server} from "socket.io"

const app = express()

const expressServer = app.listen(4000)

// Create socketio server
const ioServer = new Server(expressServer, {
    cors: [
        'http://localhost:4000'
    ]
})

console.log('Socket.io server listening on port 4000')

ioServer.on('connect', socket => {
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
    socket.on('typing', data=>{
        const {threadId, userId} = data
        ioServer.to(threadId).emit('incoming_typing', data)
    })

    // Sends a message to clients in the room
    socket.on('send_message', data=>{
        ioServer.to(data.threadId).emit('incoming_message', data)
    })
})