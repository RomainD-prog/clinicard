const { getDefaultConfig } = require("@expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.resolverMainFields = ["react-native", "main", "module", "browser"];
config.resolver.sourceExts = [
  "ios.ts",
  "native.ts",
  "ts",
  "ios.tsx",
  "native.tsx",
  "tsx",
  "ios.js",
  "native.js",
  "js",
  "jsx",
  "json",
];
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
