// Polyfill navigator for Node's non-browser test environment
if (typeof globalThis.navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      hardwareConcurrency: 4,
    },
    writable: true,
    configurable: true,
  });
}
