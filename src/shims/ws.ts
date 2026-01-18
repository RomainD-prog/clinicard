// src/shims/ws.ts
// Shim "ws" (Node) pour React Native : on utilise le WebSocket global.
const WS = (global as any).WebSocket;

if (!WS) {
  throw new Error(
    "[ws shim] Global WebSocket is not available. Make sure you're running in React Native."
  );
}

// Le package "ws" exporte une classe + la propriété WebSocket.
// On imite ce comportement.
module.exports = WS;
module.exports.WebSocket = WS;
