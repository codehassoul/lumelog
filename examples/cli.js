/**
 * CLI-style logging: args, steps, success/failure, timing a task.
 * Run: node examples/cli.js [--fail]
 */
import log from "../src/index.js";

const args = process.argv.slice(2);
const shouldFail = args.includes("--fail");

log.step(`mytool ${args.join(" ") || "(no args)"}`);

log.time("sync");

if (shouldFail) {
  log.warn("Flag --fail set; simulating validation error");
  log.error("Input rejected: missing required field 'name'");
  process.exitCode = 1;
} else {
  log.info("Reading stdin… (none in this demo)");
  log.success("Wrote 3 records to ./out");
}

log.timeEnd("sync");
log.info(`Exit code ${process.exitCode ?? 0}`);
