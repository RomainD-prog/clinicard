// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),

  // Shim ws (si tu l’utilises)
  ws: path.resolve(projectRoot, "src/shims/ws.js"),

  // Neutraliser react-native-url-polyfill (si tu as gardé cette approche)
  "react-native-url-polyfill/auto": path.resolve(
    projectRoot,
    "src/shims/react-native-url-polyfill-auto.js"
  ),
  "react-native-url-polyfill": path.resolve(
    projectRoot,
    "src/shims/react-native-url-polyfill.js"
  ),
};

module.exports = config;
