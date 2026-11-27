// Starts a static server, runs the Cypress specs headlessly, then shuts the server down.
// Works on every OS (no process-tree killing involved).
const path = require("path");
const httpServer = require("http-server");
const cypress = require("cypress");

const PORT = 8080;
const root = path.resolve(__dirname, "..");

(async () => {
  const server = httpServer.createServer({ root, cache: -1 });
  await new Promise((resolve) => server.listen(PORT, resolve));

  let code = 1;
  try {
    const results = await cypress.run({ config: { baseUrl: `http://localhost:${PORT}` } });
    // `status: "failed"` means Cypress itself couldn't run; otherwise count failed tests.
    code = results.status !== "failed" && results.totalFailed === 0 ? 0 : 1;
  } catch (err) {
    console.error(err);
  } finally {
    server.close();
  }
  process.exit(code);
})();
