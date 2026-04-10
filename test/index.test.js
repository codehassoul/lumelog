import test from "node:test";
import assert from "node:assert/strict";
import log from "../src/index.js";
import { captureConsole } from "./capture.mjs";

test("log and level methods emit six lines via console (merged order)", () => {
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log("plain");
    log.success("s");
    log.error("e");
    log.warn("w");
    log.info("i");
    log.step("st");
  } finally {
    restore();
  }
  assert.equal(calls.length, 6);
  assert.ok(calls.every((c) => typeof c === "string"));
});

test("log.scope is a function", () => {
  assert.equal(typeof log.scope, "function");
  assert.equal(typeof log.child, "function");
  assert.equal(typeof log.debug, "function");
  assert.equal(typeof log.trace, "function");
  assert.equal(typeof log.fatal, "function");
});

test("log.levels returns all supported levels", () => {
  assert.deepEqual(log.levels(), [
    "error",
    "warn",
    "info",
    "step",
    "success",
    "time",
    "done",
  ]);
});

test("log.level returns resolved current level", () => {
  const prev = process.env.LUMELOG_LEVEL;
  process.env.LUMELOG_LEVEL = "success";
  try {
    assert.equal(log.level(), "info");
  } finally {
    if (prev === undefined) delete process.env.LUMELOG_LEVEL;
    else process.env.LUMELOG_LEVEL = prev;
  }
});

test("LUMELOG_TIME=1 prefixes emitted lines with [HH:mm:ss]", () => {
  const prev = process.env.LUMELOG_TIME;
  process.env.LUMELOG_TIME = "1";
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log.info("hello");
  } finally {
    restore();
    if (prev === undefined) delete process.env.LUMELOG_TIME;
    else process.env.LUMELOG_TIME = prev;
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0], /^\[\d{2}:\d{2}:\d{2}\] /);
});

test("LUMELOG_JSON=1 emits JSON through the logger", () => {
  const prev = process.env.LUMELOG_JSON;
  process.env.LUMELOG_JSON = "1";
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log.scope("API").warn("slow");
  } finally {
    restore();
    if (prev === undefined) delete process.env.LUMELOG_JSON;
    else process.env.LUMELOG_JSON = prev;
  }
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0]), {
    level: "warn",
    message: "slow",
    scope: "API",
  });
});

test("LUMELOG_LEVEL=warn only emits warn and error", () => {
  const prev = process.env.LUMELOG_LEVEL;
  process.env.LUMELOG_LEVEL = "warn";
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log("plain");
    log.success("ok");
    log.info("hello");
    log.step("build");
    log.warn("careful");
    log.error("boom");
  } finally {
    restore();
    if (prev === undefined) delete process.env.LUMELOG_LEVEL;
    else process.env.LUMELOG_LEVEL = prev;
  }
  assert.equal(calls.length, 2);
  assert.match(calls[0], /WARN/);
  assert.match(calls[1], /ERROR/);
});

test("invalid LUMELOG_LEVEL leaves logging unchanged", () => {
  const prev = process.env.LUMELOG_LEVEL;
  process.env.LUMELOG_LEVEL = "verbose";
  const calls = [];
  const restore = captureConsole(calls);
  try {
    assert.equal(log.level(), undefined);
    log.info("hello");
    log.step("work");
  } finally {
    restore();
    if (prev === undefined) delete process.env.LUMELOG_LEVEL;
    else process.env.LUMELOG_LEVEL = prev;
  }
  assert.equal(calls.length, 2);
});

test("LUMELOG_LEVEL=success behaves like info", () => {
  const prev = process.env.LUMELOG_LEVEL;
  process.env.LUMELOG_LEVEL = "success";
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log.info("hello");
    log.success("ok");
    log.step("build");
  } finally {
    restore();
    if (prev === undefined) delete process.env.LUMELOG_LEVEL;
    else process.env.LUMELOG_LEVEL = prev;
  }
  assert.equal(calls.length, 2);
  assert.match(calls[0], /INFO/);
  assert.match(calls[1], /SUCCESS/);
});

test("LUMELOG_LEVEL=time behaves like step", () => {
  const prev = process.env.LUMELOG_LEVEL;
  process.env.LUMELOG_LEVEL = "time";
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log.step("build");
    log.time("fetch");
  } finally {
    restore();
    if (prev === undefined) delete process.env.LUMELOG_LEVEL;
    else process.env.LUMELOG_LEVEL = prev;
  }
  assert.equal(calls.length, 2);
  assert.match(calls[0], /STEP/);
  assert.match(calls[1], /TIME/);
});

test("log supports multiple string arguments", () => {
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log("hello", "world", "again");
  } finally {
    restore();
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0], /\shello world again$/);
});

test("log uses console-style substitution placeholders", () => {
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log("hello %s %d", "world", 42);
  } finally {
    restore();
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0], /\shello world 42$/);
});

test("log preserves plain console-style mixed argument formatting", () => {
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log("value:", { a: 1 }, 42);
  } finally {
    restore();
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0], /\svalue:/);
  assert.match(calls[0], /a:\s*1/);
  assert.match(calls[0], /42/);
});

test("log renders trailing metadata cleanly", () => {
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log("User fetched", { userId: 123 });
  } finally {
    restore();
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0], /\sUser fetched \{ userId: 123 \}$/);
  assert.equal(calls[0].includes("\n"), false);
});

test("single object argument is still treated as the message", () => {
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log.info({ userId: 123 });
  } finally {
    restore();
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0], /INFO/);
  assert.match(calls[0], /userId:\s*123/);
});

test("LUMELOG_JSON=1 includes trailing metadata as structured fields", () => {
  const prev = process.env.LUMELOG_JSON;
  process.env.LUMELOG_JSON = "1";
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log.info("User fetched", { userId: 123, ok: true });
  } finally {
    restore();
    if (prev === undefined) delete process.env.LUMELOG_JSON;
    else process.env.LUMELOG_JSON = prev;
  }
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0]), {
    level: "info",
    message: "User fetched",
    userId: 123,
    ok: true,
  });
});

test("child logger includes metadata in pretty output", () => {
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log.child({ requestId: "123" }).info("User fetched");
  } finally {
    restore();
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0], /INFO/);
  assert.match(calls[0], /User fetched \{ requestId: '123' \}$/);
});

test("child logger includes metadata in JSON output", () => {
  const prev = process.env.LUMELOG_JSON;
  process.env.LUMELOG_JSON = "1";
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log.child({ requestId: "123" }).info("User fetched");
  } finally {
    restore();
    if (prev === undefined) delete process.env.LUMELOG_JSON;
    else process.env.LUMELOG_JSON = prev;
  }
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0]), {
    level: "info",
    message: "User fetched",
    requestId: "123",
  });
});

test("child logger shallow-merges with trailing metadata", () => {
  const prev = process.env.LUMELOG_JSON;
  process.env.LUMELOG_JSON = "1";
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log.child({ requestId: "123", service: "api" })
      .info("User fetched", { requestId: "456", userId: 7 });
  } finally {
    restore();
    if (prev === undefined) delete process.env.LUMELOG_JSON;
    else process.env.LUMELOG_JSON = prev;
  }
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0]), {
    level: "info",
    message: "User fetched",
    requestId: "456",
    service: "api",
    userId: 7,
  });
});

test("leveled methods support mixed argument types", () => {
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log.info("value", { a: 1 }, 42);
  } finally {
    restore();
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0], /INFO/);
  assert.match(calls[0], /value/);
  assert.match(calls[0], /a:\s*1/);
  assert.match(calls[0], /42/);
});

test("debug and trace aliases behave like info and step", () => {
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log.debug("debugging");
    log.trace("tracing");
  } finally {
    restore();
  }
  assert.equal(calls.length, 2);
  assert.match(calls[0], /INFO/);
  assert.match(calls[0], /debugging/);
  assert.match(calls[1], /STEP/);
  assert.match(calls[1], /tracing/);
});

test("fatal alias behaves like error", () => {
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log.fatal("boom");
  } finally {
    restore();
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0], /ERROR/);
  assert.match(calls[0], /boom/);
});

test("error method supports error objects with extra arguments", () => {
  const calls = [];
  const restore = captureConsole(calls);
  try {
    log.error("failed", new Error("boom"));
  } finally {
    restore();
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0], /ERROR/);
  assert.match(calls[0], /failed/);
  assert.match(calls[0], /Error: boom/);
});

test("logger error output trims trailing internal stack frames", () => {
  const calls = [];
  const restore = captureConsole(calls);
  try {
    const err = new Error("boom");
    err.stack = [
      "Error: boom",
      "    at runTask (C:/app/task.js:10:5)",
      "    at node:internal/modules/run_main:117:5",
    ].join("\n");
    log.error(err);
  } finally {
    restore();
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0], /C:\/app\/task\.js:10:5/);
  assert.doesNotMatch(calls[0], /node:internal\/modules\/run_main/);
});
