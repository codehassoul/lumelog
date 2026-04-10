/**
 * Backend-style logging: startup, lifecycle, errors, scoped subsystems.
 * Run: node examples/server.js
 */
import http from "node:http";
import log from "../src/index.js";

const port = Number(process.env.PORT) || 3456;
const api = log.scope("api");
const db = log.scope("db");

log.step("Loading configuration…");
log.info({ env: process.env.NODE_ENV ?? "development", port });

db.step("Connecting to database…");
// Simulate connection
db.success("Pool ready (max 10 connections)");

const server = http.createServer((req, res) => {
  api.info(`${req.method} ${req.url}`);

  if (req.url === "/error") {
    api.error(new Error("Simulated handler failure"));
    res.writeHead(500);
    res.end("error");
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, path: req.url }));
});

server.listen(port, () => {
  log.success(`HTTP server listening on http://127.0.0.1:${port}`);
  log.info("Try: curl http://127.0.0.1:3456/  and  /error");
});

server.on("error", (err) => {
  log.error(err);
  process.exit(1);
});
