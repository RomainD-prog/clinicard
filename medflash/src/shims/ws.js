// src/shims/ws.js
// Shim du package Node "ws" pour React Native : on utilise le WebSocket global.
// Objectif : eviter l'import de modules Node (stream, http, etc.) dans le bundle natif.

const WS = global.WebSocket;

if (!WS) {
  throw new Error(
    "[ws shim] global.WebSocket is missing. Are you running in React Native / Expo?"
  );
}

// Export CommonJS, conforme au package "ws"
module.exports = WS;
module.exports.WebSocket = WS;

// Certains consommateurs testent ces champs (non supportes en RN)
module.exports.Server = undefined;
module.exports.WebSocketServer = undefined;
