const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// 1) Permet de résoudre les fichiers .cjs (fix nanoid/non-secure)
config.resolver.sourceExts = Array.from(
  new Set([...(config.resolver.sourceExts || []), "cjs"])
);

// 2) Force Metro à préférer les builds "browser" avant "main" (évite ws/stream côté natif)
config.resolver.resolverMainFields = ["react-native", "browser", "module", "main"];

// 3) Sécurité : si "ws" est quand même résolu, on le mappe vers ton shim
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  ws: path.resolve(__dirname, "src/shims/ws.js"),
};

module.exports = config;
