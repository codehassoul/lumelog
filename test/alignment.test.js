import test from "node:test";
import assert from "node:assert/strict";
import { formatLevel, formatPlain } from "../src/format.js";
import { MESSAGE_START } from "../src/symbols.js";

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

const LEVEL_KINDS = [
  "success",
  "done",
  "error",
  "warn",
  "info",
  "step",
  "time",
];

test("all leveled kinds share the same message start column", () => {
  const marker = "Â§";
  const starts = LEVEL_KINDS.map((kind) => {
    const plain = stripAnsi(formatLevel(kind, marker));
    return plain.indexOf(marker);
  });
  assert.ok(starts.every((c) => c === starts[0]));
  assert.equal(starts[0], MESSAGE_START);
});

test("plain log aligns with leveled message column", () => {
  const marker = "Â§";
  const plainCol = stripAnsi(formatPlain(marker)).indexOf(marker);
  const levelCol = stripAnsi(formatLevel("info", marker)).indexOf(marker);
  assert.equal(plainCol, levelCol);
  assert.equal(plainCol, MESSAGE_START);
});

test("mixed sequence keeps one message column", () => {
  const m = "@";
  const lines = [
    formatLevel("step", `${m} fetch`),
    formatLevel("time", `${m} timer`),
    formatLevel("success", `${m} ok`),
    formatLevel("error", `${m} bad`),
    formatLevel("warn", `${m} low`),
    formatLevel("info", `${m} port`),
    formatLevel("done", `${m} end`),
    formatPlain(`${m} note`),
  ].map(stripAnsi);
  const cols = lines.map((line) => line.indexOf(m));
  assert.ok(cols.every((c) => c === cols[0]));
});

test("scoped leveled and plain share column for same marker", () => {
  const x = "Ã—";
  const a = stripAnsi(formatLevel("info", x, "DB"));
  const b = stripAnsi(formatPlain(x, "DB"));
  assert.equal(a.indexOf(x), b.indexOf(x));
});

test("timestamps preserve one shared message column", () => {
  const prev = process.env.LUMELOG_TIME;
  process.env.LUMELOG_TIME = "1";
  try {
    const marker = "#";
    const lines = [
      formatLevel("step", `${marker} fetch`),
      formatLevel("time", `${marker} timer`),
      formatLevel("success", `${marker} ok`),
      formatLevel("error", `${marker} bad`),
      formatLevel("warn", `${marker} low`),
      formatLevel("info", `${marker} port`),
      formatLevel("done", `${marker} end`),
      formatPlain(`${marker} note`),
    ].map(stripAnsi);
    const cols = lines.map((line) => line.indexOf(marker));
    assert.ok(cols.every((c) => c === cols[0]));
    assert.match(lines[0], /^\[\d{2}:\d{2}:\d{2}\] /);
  } finally {
    if (prev === undefined) delete process.env.LUMELOG_TIME;
    else process.env.LUMELOG_TIME = prev;
  }
});
