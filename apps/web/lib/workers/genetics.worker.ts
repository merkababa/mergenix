/// <reference lib="webworker" />
// Thin worker shim: side-effect import registers the message handler via
// self.addEventListener('message', ...) inside the genetics-engine worker module.
import '@mergenix/genetics-engine/src/worker';
