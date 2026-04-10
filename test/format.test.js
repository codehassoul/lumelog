import test from "node:test";
import assert from "node:assert/strict";
import {
  formatLevel,
  formatLevelArgs,
  formatPlain,
  formatPlainArgs,
} from "../src/format.js";
import { LABEL_WIDTH, MESSAGE_START } from "../src/symbols.js";

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

test("LABEL_WIDTH matches widest label", () => {
  assert.equal(LABEL_WIDTH, 7);
});

test("formatLevel info aligns label column", () => {
  const plain = stripAnsi(formatLevel("info", "Listening on port 3000"));
  assert.match(plain, /^ℹ INFO\s+Listening on port 3000$/);
});

test("formatLevel error label padded like SUCCESS width", () => {
  const plain = stripAnsi(formatLevel("error", "Database failed"));
  assert.match(plain, /^✖ ERROR\s+Database failed$/);
});

test("formatLevel success uses two spaces after padded SUCCESS", () => {
  const plain = stripAnsi(formatLevel("success", "Server started"));
  assert.match(plain, /^✔ SUCCESS {2}Server started$/);
});

test("formatLevel done matches DONE column", () => {
  const plain = stripAnsi(formatLevel("done", "fetch completed in 120ms"));
  assert.match(plain, /^✔ DONE\s+fetch completed in 120ms$/);
});

test("formatLevel step uses padded STEP label", () => {
  const plain = stripAnsi(formatLevel("step", "Connecting to DB..."));
  assert.match(plain, /^→ STEP\s+Connecting to DB\.\.\.$/);
});

test("formatLevel time uses a distinct TIME label", () => {
  const plain = stripAnsi(formatLevel("time", "fetch started"));
  assert.match(plain, /^◷ TIME\s+fetch started$/);
});

test("formatLevel pretty-prints plain objects (util.inspect)", () => {
  const plain = stripAnsi(formatLevel("success", { a: 1 }));
  assert.ok(plain.includes("a"));
  assert.ok(plain.includes("1"));
  assert.ok(plain.includes("{"));
});

test("formatLevel falls back to inspect for circular objects", () => {
  const o = {};
  o.self = o;
  const plain = stripAnsi(formatLevel("info", o));
  assert.ok(plain.includes("[Circular]") || plain.includes("<ref"));
});

test("formatLevel serializes Error", () => {
  const plain = stripAnsi(formatLevel("error", new Error("boom")));
  assert.ok(plain.includes("boom"));
  assert.ok(plain.includes("Error"));
});

test("formatLevel trims trailing internal Error frames", () => {
  const err = new Error("boom");
  err.stack = [
    "Error: boom",
    "    at runTask (C:/app/task.js:10:5)",
    "    at node:internal/modules/run_main:117:5",
    "    at async ModuleLoader.executeModuleJob (node:internal/modules/esm/loader:268:20)",
  ].join("\n");
  const plain = stripAnsi(formatLevel("error", err));
  assert.match(plain, /^✖ ERROR\s+Error: boom/);
  assert.ok(plain.includes("C:/app/task.js:10:5"));
  assert.ok(!plain.includes("node:internal/modules/run_main"));
  assert.ok(!plain.includes("node:internal/modules/esm/loader"));
});

test("formatPlain indents to align with leveled message column", () => {
  const plain = stripAnsi(formatPlain("hello"));
  assert.equal(plain, " ".repeat(MESSAGE_START) + "hello");
});

test("formatLevel prepends scope before message", () => {
  const plain = stripAnsi(formatLevel("info", "connected", "DB"));
  assert.match(plain, /^ℹ INFO\s+\[DB\] connected$/);
});

test("formatPlain prepends scope", () => {
  const plain = stripAnsi(formatPlain("ping", "DB"));
  assert.equal(plain, " ".repeat(MESSAGE_START) + "[DB] ping");
});

test("formatLevel nested scope uses colon tag", () => {
  const plain = stripAnsi(formatLevel("error", "nope", "DB:pool"));
  assert.match(plain, /^✖ ERROR\s+\[DB:pool\] nope$/);
});

test("empty scope string is ignored", () => {
  assert.equal(stripAnsi(formatPlain("x", "")), " ".repeat(MESSAGE_START) + "x");
  assert.match(stripAnsi(formatLevel("info", "y", "")), /^ℹ INFO\s+y$/);
});

test("scoped multiline keeps continuation alignment", () => {
  const plain = stripAnsi(formatLevel("warn", "a\nb", "DB"));
  const lines = plain.split("\n");
  assert.match(lines[0], /^⚠ WARN\s+\[DB\] a$/);
  const indent = lines[0].indexOf("[");
  assert.ok(lines[1].startsWith(" ".repeat(indent)));
  assert.ok(lines[1].includes("b"));
});

test("multiline body indents continuation lines", () => {
  const plain = stripAnsi(formatLevel("warn", "a\nb"));
  const lines = plain.split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^⚠ WARN\s+a$/);
  const indent = lines[0].indexOf("a");
  assert.ok(lines[1].startsWith(" ".repeat(indent)));
  assert.ok(lines[1].includes("b"));
});

test("formatLevelArgs renders trailing metadata compactly", () => {
  const plain = stripAnsi(
    formatLevelArgs("info", ["User fetched", { userId: 123 }]),
  );
  assert.match(plain, /^\S+ INFO\s+User fetched \{ userId: 123 \}$/);
  assert.equal(plain.includes("\n"), false);
});

test("formatPlainArgs keeps message text clean with trailing metadata", () => {
  const plain = stripAnsi(
    formatPlainArgs(["User fetched %s", "ok", { userId: 123 }]),
  );
  assert.match(
    plain,
    new RegExp(`^\\s{${MESSAGE_START}}User fetched ok \\{ userId: 123 \\}$`),
  );
});

test("LOGRA_JSON=1 emits one JSON object per line", () => {
  const prev = process.env.LOGRA_JSON;
  process.env.LOGRA_JSON = "1";
  try {
    const line = formatLevel("info", "Listening on port 3000", "API");
    const parsed = JSON.parse(line);
    assert.deepEqual(parsed, {
      level: "info",
      message: "Listening on port 3000",
      scope: "API",
    });
  } finally {
    if (prev === undefined) delete process.env.LOGRA_JSON;
    else process.env.LOGRA_JSON = prev;
  }
});

test("LOGRA_JSON=1 includes metadata as structured fields", () => {
  const prev = process.env.LOGRA_JSON;
  process.env.LOGRA_JSON = "1";
  try {
    const parsed = JSON.parse(
      formatLevelArgs("info", ["User fetched", { userId: 123, ok: true }]),
    );
    assert.deepEqual(parsed, {
      level: "info",
      message: "User fetched",
      userId: 123,
      ok: true,
    });
  } finally {
    if (prev === undefined) delete process.env.LOGRA_JSON;
    else process.env.LOGRA_JSON = prev;
  }
});

test("LOGRA_JSON=1 includes stack for errors", () => {
  const prev = process.env.LOGRA_JSON;
  process.env.LOGRA_JSON = "1";
  try {
    const err = new Error("boom");
    err.stack = [
      "Error: boom",
      "    at runTask (C:/app/task.js:10:5)",
      "    at node:internal/modules/run_main:117:5",
    ].join("\n");
    const parsed = JSON.parse(formatLevel("error", err, "DB"));
    assert.equal(parsed.level, "error");
    assert.equal(parsed.message, "boom");
    assert.equal(parsed.scope, "DB");
    assert.match(parsed.stack, /Error: boom/);
    assert.match(parsed.stack, /C:\/app\/task\.js:10:5/);
    assert.doesNotMatch(parsed.stack, /node:internal\/modules\/run_main/);
  } finally {
    if (prev === undefined) delete process.env.LOGRA_JSON;
    else process.env.LOGRA_JSON = prev;
  }
});

test("LOGRA_JSON=1 and LOGRA_TIME=1 include timestamp", () => {
  const prevJson = process.env.LOGRA_JSON;
  const prevTime = process.env.LOGRA_TIME;
  process.env.LOGRA_JSON = "1";
  process.env.LOGRA_TIME = "1";
  try {
    const parsed = JSON.parse(formatPlain("hello"));
    assert.equal(parsed.level, "log");
    assert.equal(parsed.message, "hello");
    assert.match(parsed.timestamp, /^\d{2}:\d{2}:\d{2}$/);
  } finally {
    if (prevJson === undefined) delete process.env.LOGRA_JSON;
    else process.env.LOGRA_JSON = prevJson;
    if (prevTime === undefined) delete process.env.LOGRA_TIME;
    else process.env.LOGRA_TIME = prevTime;
  }
});
