import test from "node:test";
import assert from "node:assert/strict";
import log from "../src/index.js";
import { MESSAGE_START } from "../src/symbols.js";
import { captureConsole } from "./capture.mjs";

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

test("log.scope returns callable logger with same methods", () => {
  const db = log.scope("DB");
  assert.equal(typeof db, "function");
  assert.equal(typeof db.info, "function");
  assert.equal(typeof db.error, "function");
  assert.equal(typeof db.warn, "function");
  assert.equal(typeof db.success, "function");
  assert.equal(typeof db.step, "function");
  assert.equal(typeof db.time, "function");
  assert.equal(typeof db.timeEnd, "function");
  assert.equal(typeof db.scope, "function");
});

test("scoped logger includes [SCOPE] in leveled output", () => {
  const calls = [];
  const restore = captureConsole(calls, stripAnsi);
  try {
    const db = log.scope("DB");
    db.info("ready");
    db.error("failed");
    db("plain line");
  } finally {
    restore();
  }
  assert.match(calls[0], /^ℹ INFO\s+\[DB\] ready$/);
  assert.match(calls[1], /^✖ ERROR\s+\[DB\] failed$/);
  assert.equal(calls[2], " ".repeat(MESSAGE_START) + "[DB] plain line");
});

test("nested log.scope joins with colon", () => {
  const calls = [];
  const restore = captureConsole(calls, stripAnsi);
  try {
    log.scope("DB").scope("pool").step("acquire");
  } finally {
    restore();
  }
  assert.match(calls[0], /^→ STEP\s+\[DB:pool\] acquire$/);
});

test("root log has no scope prefix", () => {
  const calls = [];
  const restore = captureConsole(calls, stripAnsi);
  try {
    log.info("root");
  } finally {
    restore();
  }
  assert.match(calls[0], /^ℹ INFO\s+root$/);
  assert.ok(!calls[0].includes("[DB]"));
});
