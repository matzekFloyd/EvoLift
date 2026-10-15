const { createCapacitorConfig, readDebugServerFile } = require("./shell/server-config.cjs");

module.exports = createCapacitorConfig({
  env: process.env,
  debugServer: readDebugServerFile(),
});
