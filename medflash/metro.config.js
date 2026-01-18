// metro.config.js
// Stabilise Metro resolution for Expo SDK 54 / RN 0.81.
//
// Key fixes:
// 1) Add support for `.cjs` / `.mjs` so Metro can load packages that ship CJS/ESM
//    entrypoints (e.g. nanoid/non-secure -> index.cjs).
// 2) Alias the Node-only `ws` package to the React Native global WebSocket.
// 3) Provide a defensive resolver for `nanoid/non-secure` if Metro mis-resolves
//    the entrypoint.

const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;

// Path to the local shim used in native runtimes.
const wsShimPath = path.resolve(projectRoot, 'src/shims/ws.js');

// Optional helper: return filePath for a given relative path if it exists.
function resolveIfExists(relativePath) {
  try {
    return require.resolve(relativePath, { paths: [projectRoot] });
  } catch {
    return null;
  }
}

const config = getDefaultConfig(projectRoot);

// Ensure Metro can load common CJS/ESM extensions.
config.resolver.sourceExts = Array.from(
  new Set([...(config.resolver.sourceExts || []), 'cjs', 'mjs'])
);

// Route Node-only modules to shims.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  ws: wsShimPath,
};

// Prefer react-native -> browser -> module -> main when "exports" is bypassed.
// This helps packages that ship multiple builds.
config.resolver.resolverMainFields = ['react-native', 'browser', 'module', 'main'];

// Disable package-exports resolution for now.
// Expo SDK 54 enables it by default and several popular deps have broken/partial
// exports maps which produce noisy warnings or hard failures.
config.resolver.unstable_enablePackageExports = false;

// Defensive resolver for a handful of problematic subpaths.
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // nanoid/non-secure sometimes points at an entry with a .cjs "main" that Metro
  // fails to load unless sourceExts includes cjs. We also hard-map to index.js/cjs.
  if (moduleName === 'nanoid/non-secure') {
    const candidates = [
      resolveIfExists('nanoid/non-secure/index.cjs'),
      resolveIfExists('nanoid/non-secure/index.js'),
      resolveIfExists('nanoid/non-secure'),
    ].filter(Boolean);

    if (candidates.length) {
      return {
        type: 'sourceFile',
        filePath: candidates[0],
      };
    }
  }

  // Let Metro handle everything else.
  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
