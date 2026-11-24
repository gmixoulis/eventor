const NativeEnvironment = require('jest-expo/src/preset/nativeEnvironment');

const webGlobals = { Request, Response, Headers, fetch, TextEncoder, TextDecoder, AbortController, AbortSignal, ReadableStream, crypto };

// Keep jest-expo's teardown fix, but test the server with Node's real Fetch and stream implementations.
module.exports = class ServerEnvironment extends NativeEnvironment {
  customExportConditions = ['node', 'node-addons'];
  handleTestEvent(event) {
    if (event.name === 'setup') {
      for (const [name, value] of Object.entries(webGlobals)) {
        Object.defineProperty(this.global, name, { value, configurable: true, writable: true });
      }
    }
  }
};
