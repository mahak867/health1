// Singleton publisher singleton — allows modules to fire WebSocket events
// without importing the full gateway (which pulls in the `ws` package).
let _publish = (_channel, _payload) => {};

export function getPublisher() { return _publish; }
export function setPublisher(fn) { _publish = fn; }
