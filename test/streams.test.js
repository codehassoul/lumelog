import test from "node:test";
import assert from "node:assert/strict";
import log from "../src/index.js";
import { captureConsole } from "./capture.mjs";

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

test("error-like aliases use console.error; others use console.log", () => {
  const logCalls = [];
  const errCalls = [];
  const ol = console.log;
  const oe = console.error;
  console.log = (line) => logCalls.push(stripAnsi(line));
  console.error = (line) => errCalls.push(stripAnsi(line));
  try {
    log.info("i");
    log.debug("d");
    log.trace("t");
    log.warn("w");
    log.error("e");
    log.fatal("f");
    log.success("ok");
  } finally {
    console.log = ol;
    console.error = oe;
  }
  assert.match(logCalls[0], /^\S+ INFO\s+i$/);
  assert.match(logCalls[1], /^\S+ INFO\s+d$/);
  assert.match(logCalls[2], /^\S+ STEP\s+t$/);
  assert.match(logCalls[3], /^\S+ SUCCESS\s+ok$/);
  assert.match(errCalls[0], /^\S+ WARN\s+w$/);
  assert.match(errCalls[1], /^\S+ ERROR\s+e$/);
  assert.match(errCalls[2], /^\S+ ERROR\s+f$/);
});

test("LOGRA_STDOUT_ONLY=1 sends error and warn to console.log", () => {
  const prev = process.env.LOGRA_STDOUT_ONLY;
  process.env.LOGRA_STDOUT_ONLY = "1";
  const logCalls = [];
  const errCalls = [];
  const ol = console.log;
  const oe = console.error;
  console.log = (line) => logCalls.push(stripAnsi(line));
  console.error = (line) => errCalls.push(stripAnsi(line));
  try {
    log.warn("w");
    log.error("e");
  } finally {
    console.log = ol;
    console.error = oe;
    if (prev === undefined) delete process.env.LOGRA_STDOUT_ONLY;
    else process.env.LOGRA_STDOUT_ONLY = prev;
  }
  assert.deepEqual(errCalls, []);
  assert.match(logCalls[0], /^\S+ WARN\s+w$/);
  assert.match(logCalls[1], /^\S+ ERROR\s+e$/);
});

test("formatting stays identical when stderr is forced to stdout", () => {
  const stderrCalls = [];
  const stdoutOnlyCalls = [];
  let restore = captureConsole(stderrCalls, stripAnsi);
  try {
    log.error("hello");
  } finally {
    restore();
  }

  const prev = process.env.LOGRA_STDOUT_ONLY;
  process.env.LOGRA_STDOUT_ONLY = "1";
  restore = captureConsole(stdoutOnlyCalls, stripAnsi);
  try {
    log.error("hello");
  } finally {
    restore();
    if (prev === undefined) delete process.env.LOGRA_STDOUT_ONLY;
    else process.env.LOGRA_STDOUT_ONLY = prev;
  }

  assert.equal(stderrCalls.length, 1);
  assert.equal(stdoutOnlyCalls.length, 1);
  assert.equal(stdoutOnlyCalls[0], stderrCalls[0]);
});
