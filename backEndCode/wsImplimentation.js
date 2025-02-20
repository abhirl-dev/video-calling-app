import { IncomingMessage } from "http";
import { WebSocket, WebSocketServer } from "ws";

/**
 * @type {Array<WebSocket>}
 */
var sockets = [];

/**
 * To listen for all websocket connections and events
 * @param {WebSocketServer} socket 
 */
function startWssListners(socket) {
    socket.on("connection", _requestHandler);
    socket.on("close", () => {
        const i = sockets.indexOf(socket);
        if (i >= -1)
            sockets.splice(i, 1);
    })
}

/**
 * @param {WebSocket} socket 
 * @param {IncomingMessage} req 
 * @param {WebSocket} currentSocket 
 */
async function _requestHandler(socket, req) {
    sockets.push(socket);
    socket.onmessage = (e) => {
        console.log(e.data);
        for (var _socket of sockets) {
            if (_socket !== socket)
                _socket.send(e.data);
        }
    }
}


export { startWssListners };
