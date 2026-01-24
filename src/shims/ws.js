// src/shims/ws.js
const WS = global.WebSocket;

if (!WS) {
  throw new Error("[ws shim] global.WebSocket is missing (not running in React Native?)");
}

module.exports = WS;
module.exports.WebSocket = WS;
module.exports.Server = undefined;
module.exports.WebSocketServer = undefined;
