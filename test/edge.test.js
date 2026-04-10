import test from "node:test";
import assert from "node:assert/strict";
import chalk from "chalk";
import { formatLevel, formatPlain } from "../src/format.js";
import { MESSAGE_START } from "../src/symbols.js";

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

test("null serializes as null", () => {
  assert.equal(
    stripAnsi(formatPlain(null)),
    " ".repeat(MESSAGE_START) + "null",
  );
  assert.ok(stripAnsi(formatLevel("info", null)).endsWith(" null"));
});

test("undefined serializes as undefined", () => {
  assert.equal(
    stripAnsi(formatPlain(undefined)),
    " ".repeat(MESSAGE_START) + "undefined",
  );
});

test("object serializes with inspect layout", () => {
  const plain = stripAnsi(formatLevel("info", { a: 1 }));
  assert.ok(plain.includes("a"));
  assert.ok(plain.includes("1"));
});

test("deep nesting is capped by inspect depth", () => {
  const l6 = { x: 1 };
  const l5 = { l6 };
  const l4 = { l5 };
  const l3 = { l4 };
  const l2 = { l3 };
  const l1 = { l2 };
  const deep = { l1 };
  const plain = stripAnsi(formatLevel("info", deep));
  assert.ok(plain.includes("[Object]"));
  assert.ok(!plain.includes("x: 1") && !plain.includes("x:1"));
});

test("huge string is truncated", () => {
  const huge = "x".repeat(60_000);
  const plain = stripAnsi(formatPlain(huge));
  assert.ok(plain.includes("… [lograjs: truncated]"));
  assert.ok(plain.length < huge.length);
});

test("huge object values are bounded (inspect + optional lograjs cap)", () => {
  const big = { s: "y".repeat(60_000) };
  const plain = stripAnsi(formatLevel("info", big));
  assert.ok(
    plain.includes("… [lograjs: truncated]") ||
      plain.includes("more characters"),
  );
  assert.ok(plain.length < 20_000);
});

test("Error uses stack when present", () => {
  const err = new Error("boom");
  const plain = stripAnsi(formatLevel("error", err));
  assert.ok(plain.includes("boom"));
  assert.ok(plain.includes("Error"));
  assert.ok(plain.includes("\n"));
});

test("Error without stack uses name and message", () => {
  const err = new Error("msg");
  delete err.stack;
  const plain = stripAnsi(formatLevel("error", err));
  assert.ok(plain.includes("Error"));
  assert.ok(plain.includes("msg"));
  assert.ok(!plain.includes("at "));
});

test("when chalk has no color (piped / NO_COLOR), output has no ANSI", () => {
  const originalLevel = chalk.level;
  try {
    chalk.level = 0; // Force no color
    const line = formatLevel("info", "piped");
    assert.match(line, /^ℹ INFO\s+piped$/);
    assert.equal(line, stripAnsi(line));
  } finally {
    chalk.level = originalLevel; // Restore original level
  }
});
