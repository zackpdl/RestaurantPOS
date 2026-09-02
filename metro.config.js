const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { resolve } = require('metro-resolver');

const config = getDefaultConfig(__dirname);

// Use a lightweight shim for `ws` so Supabase Realtime uses native WebSocket.
const wsShimPath = path.resolve(__dirname, 'lib/ws-shim.js');

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ws: wsShimPath,
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws') {
    return resolve(context, wsShimPath, platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
