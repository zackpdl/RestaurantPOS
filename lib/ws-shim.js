/* eslint-disable @typescript-eslint/no-explicit-any */
// Use a lazy-loaded WebSocket to avoid ReferenceError on startup if WebSocket is not yet defined globally.
class WS {
  constructor(url, protocols, _options) {
    const NativeWebSocket = typeof WebSocket !== 'undefined' ? WebSocket : (global && global.WebSocket);
    if (!NativeWebSocket) {
      console.error('WebSocket is not defined. Ensure you are running in a React Native environment.');
      // Return a dummy object or throw a more descriptive error if needed
      return {};
    }
    return new NativeWebSocket(url, protocols);
  }
}

// Ensure the class can be used with 'new' and has static constants if needed by 'ws' package
WS.CONNECTING = 0;
WS.OPEN = 1;
WS.CLOSING = 2;
WS.CLOSED = 3;

module.exports = WS;
