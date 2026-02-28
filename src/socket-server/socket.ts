import {Server} from "socket.io";
import {startSocketServer} from "./socketServer.ts";

let ioServer: Server;

// Create a new socket server singleton. If it already exists, throw an error
export function createSocketServer(expressServer: any) {
    console.log("Creating socket server")

    if (ioServer) {
        throw new Error("Socket server already initialized")
    }

    ioServer = new Server(expressServer, {
        cors: {
            origin: [process.env.CLIENT_URL as string],
            credentials: true
        }
    })

    // Initialize the socket server
    startSocketServer(ioServer)
}

// Return the socket server if it exists
export const getSocketServer = () => {
    if (!ioServer) {
        throw new Error("Socket server not initialized")
    }
    return ioServer
}