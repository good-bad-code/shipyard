import { createServer } from "node:http";
import { loadConfig } from "@shipyard/config";
import type { HealthStatusResponse } from "@shipyard/core";

const config = loadConfig(process.env);
const version = process.env.npm_package_version ?? "0.1.0";

const server = createServer((req, res) => {
  if (req.url !== "/health") {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
    return;
  }

  const body: HealthStatusResponse = {
    service: "shipyard",
    version,
    status: "ok",
    timestamp: new Date().toISOString(),
    services: [
      { name: "database", status: "unknown", detail: `${config.database.host}:${config.database.port}` },
      { name: "redis", status: "unknown", detail: `${config.redis.host}:${config.redis.port}` },
      { name: "email", status: "unknown", detail: `${config.email.host}:${config.email.port}` }
    ]
  };

  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
});

server.listen(config.env.PORT, () => {
  console.log(`status-api listening on http://localhost:${config.env.PORT}/health`);
});
