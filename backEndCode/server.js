import http from "http";
import { WebSocketServer } from "ws";
import { startWssListners } from "./wsImplimentation.js";

const httpServer = http.createServer();
const socket = new WebSocketServer({ server: httpServer, path: "/ws" });

const PORT = 8002;

function startServer() {
    httpServer.listen(PORT, () => {
        console.log(`Websocket server is running on port ${PORT}`);
        startWssListners(socket);
    })
}

export { startServer, socket };