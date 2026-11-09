globalThis.__WEBMCP_TELEMETRY__ = false;
globalThis.fetch = async function unitTestNetworkDisabled() {
  throw new Error('Network requests are disabled in JamFlow unit tests.');
};
