import test from "node:test";
import assert from "node:assert/strict";
import log from "../src/index.js";
import { captureConsole } from "./capture.mjs";

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

test("time logs TIME started; timeEnd logs DONE with elapsed ms", async () => {
  const calls = [];
  const restore = captureConsole(calls, stripAnsi);
  try {
    log.time("fetch");
    await new Promise((r) => setTimeout(r, 15));
    log.timeEnd("fetch");
  } finally {
    restore();
  }
  assert.equal(calls.length, 2);
  assert.match(calls[0], /^\S+ TIME\s+fetch started$/);
  assert.match(calls[1], /^\S+ DONE\s+fetch completed in \d+ms$/);
  const ms = Number(calls[1].match(/(\d+)ms$/)?.[1]);
  assert.ok(ms >= 5);
});

test("timeEnd without time logs ERROR", () => {
  const calls = [];
  const restore = captureConsole(calls, stripAnsi);
  try {
    log.timeEnd("missing");
  } finally {
    restore();
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0], /^\S+ ERROR\s+missing: no active timer$/);
});

test("multiple independent timers", async () => {
  const calls = [];
  const restore = captureConsole(calls, stripAnsi);
  try {
    log.time("a");
    log.time("b");
    await new Promise((r) => setTimeout(r, 5));
    log.timeEnd("b");
    log.timeEnd("a");
  } finally {
    restore();
  }
  assert.equal(calls.length, 4);
  assert.match(calls[0], /^\S+ TIME\s+a started$/);
  assert.match(calls[1], /^\S+ TIME\s+b started$/);
  assert.match(calls[2], /^\S+ DONE\s+b completed in \d+ms$/);
  assert.match(calls[3], /^\S+ DONE\s+a completed in \d+ms$/);
});

test("calling time twice resets timer for label", async () => {
  const calls = [];
  const restore = captureConsole(calls, stripAnsi);
  try {
    log.time("x");
    await new Promise((r) => setTimeout(r, 20));
    log.time("x");
    await new Promise((r) => setTimeout(r, 8));
    log.timeEnd("x");
  } finally {
    restore();
  }
  assert.equal(calls.length, 3);
  const ms = Number(calls[2].match(/(\d+)ms$/)?.[1]);
  // After reset, only the 8ms wait should be measured (with some tolerance)
  assert.ok(ms >= 5 && ms < 30, `Expected ms (${ms}) to be between 5 and 30`);
});

test("scoped timer is separate from root", () => {
  const calls = [];
  const restore = captureConsole(calls, stripAnsi);
  try {
    const db = log.scope("DB");
    log.time("q");
    db.time("q");
    log.timeEnd("q");
    db.timeEnd("q");
  } finally {
    restore();
  }
  assert.equal(calls.length, 4);
  assert.match(calls[0], /^\S+ TIME\s+q started$/);
  assert.match(calls[1], /^\S+ TIME\s+\[DB\] q started$/);
  assert.match(calls[2], /^\S+ DONE\s+q completed in \d+ms$/);
  assert.match(calls[3], /^\S+ DONE\s+\[DB\] q completed in \d+ms$/);
});

test("double timeEnd after completed logs error second time", () => {
  const calls = [];
  const restore = captureConsole(calls, stripAnsi);
  try {
    log.time("once");
    log.timeEnd("once");
    log.timeEnd("once");
  } finally {
    restore();
  }
  assert.equal(calls.length, 3);
  assert.match(calls[2], /^\S+ ERROR\s+once: no active timer$/);
});

test("LOGRA_LEVEL=info suppresses TIME but keeps DONE", () => {
  const prev = process.env.LOGRA_LEVEL;
  process.env.LOGRA_LEVEL = "info";
  const calls = [];
  const restore = captureConsole(calls, stripAnsi);
  try {
    log.time("fetch");
    log.timeEnd("fetch");
  } finally {
    restore();
    if (prev === undefined) delete process.env.LOGRA_LEVEL;
    else process.env.LOGRA_LEVEL = prev;
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0], /^\S+ DONE\s+fetch completed in \d+ms$/);
});

test("LOGRA_LEVEL=done behaves like step for timer output", () => {
  const prev = process.env.LOGRA_LEVEL;
  process.env.LOGRA_LEVEL = "done";
  const calls = [];
  const restore = captureConsole(calls, stripAnsi);
  try {
    log.time("fetch");
    log.timeEnd("fetch");
  } finally {
    restore();
    if (prev === undefined) delete process.env.LOGRA_LEVEL;
    else process.env.LOGRA_LEVEL = prev;
  }
  assert.equal(calls.length, 2);
  assert.match(calls[0], /^\S+ TIME\s+fetch started$/);
  assert.match(calls[1], /^\S+ DONE\s+fetch completed in \d+ms$/);
});
