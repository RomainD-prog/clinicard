// src/shims/ws.js
const WS = global.WebSocket;

// Fallback "soft" pour ne pas faire crasher le bundling Node/SSR
function DummyWebSocket() {
  throw new Error("[ws shim] WebSocket is not available in this environment.");
}

const Exported = WS || DummyWebSocket;

module.exports = Exported;
module.exports.WebSocket = Exported;
module.exports.Server = undefined;
module.exports.WebSocketServer = undefined;
