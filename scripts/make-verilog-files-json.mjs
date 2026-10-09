#!/usr/bin/env node
// Builds a tool-args JSON file (for scripts/test-tool.mjs, or for pasting
// into the Inspector / Claude Desktop) from a directory of .v files, using
// the new multi-file "verilog_files" shape.
//
// Usage:
//   node scripts/make-verilog-files-json.mjs <src-dir> <design-name> <top-module> <out.json> [clockPort] [clockPeriodNs]
//
// Example (SERV):
//   node scripts/make-verilog-files-json.mjs ~/eda-harness/src serv serv_rf_top scripts/examples/serv.json clk 10

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const [, , srcDir, designName, topModule, outFile, clockPort, clockPeriod] = process.argv;

if (!srcDir || !designName || !topModule || !outFile) {
  console.error(
    "Usage: node scripts/make-verilog-files-json.mjs <src-dir> <design-name> <top-module> <out.json> [clockPort] [clockPeriodNs]"
  );
  process.exit(1);
}

const files = readdirSync(srcDir).filter((f) => f.endsWith(".v"));

if (files.length === 0) {
  console.error(`No .v files found in ${srcDir}`);
  process.exit(1);
}

const verilogFiles = files.map((filename) => ({
  filename,
  content: readFileSync(join(srcDir, filename), "utf8"),
}));

const payload = {
  design_name: designName,
  top_module: topModule,
  verilog_files: verilogFiles,
  clock_port: clockPort || "clk",
  clock_period: clockPeriod ? Number(clockPeriod) : 10,
  open_in_klayout: false,
};

writeFileSync(outFile, JSON.stringify(payload, null, 2));
console.error(`Wrote ${outFile} with ${files.length} files: ${files.join(", ")}`);
