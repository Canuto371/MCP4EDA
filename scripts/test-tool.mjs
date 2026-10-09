#!/usr/bin/env node
// Minimal, direct MCP client for manually testing a tool call against
// build/index.js without going through the MCP Inspector (whose UI/CLI
// timeout knobs don't reliably override the SDK's 60s default).
//
// Usage:
//   node scripts/test-tool.mjs <tool-name> <json-args-file-or-'-'> [timeoutMs]
//
// Examples:
//   node scripts/test-tool.mjs run_openlane scripts/examples/counter.json
//   echo '{"verilog_code":"...", "top_module":"x"}' | node scripts/test-tool.mjs synthesize_verilog -
//
// Default timeout is 900000ms (15 min), comfortably above the server's own
// 10-minute internal timeout for run_openlane.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, "..", "build", "index.js");

const [, , toolName, argsSource, timeoutArg] = process.argv;

if (!toolName || !argsSource) {
  console.error("Usage: node scripts/test-tool.mjs <tool-name> <json-args-file-or-'-'> [timeoutMs]");
  process.exit(1);
}

const timeoutMs = timeoutArg ? Number(timeoutArg) : 900000;

function readArgsJson(source) {
  const raw = source === "-" ? readFileSync(0, "utf8") : readFileSync(source, "utf8");
  return JSON.parse(raw);
}

async function main() {
  const toolArgs = readArgsJson(argsSource);

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
  });

  const client = new Client({ name: "mcp4eda-test-client", version: "1.0.0" });

  console.error(`Connecting to ${serverPath} ...`);
  await client.connect(transport);

  console.error(`Calling '${toolName}' with timeout=${timeoutMs}ms ...`);
  const start = Date.now();

  try {
    const result = await client.callTool(
      { name: toolName, arguments: toolArgs },
      undefined,
      { timeout: timeoutMs },
    );
    const elapsedS = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`Done in ${elapsedS}s`);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("FAILED:", err?.message || err);
  process.exit(1);
});
