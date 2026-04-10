import test from "node:test";
import assert from "node:assert/strict";
import { colorize } from "../src/colors.js";

test("unknown kind uses safe fallback (no throw)", () => {
  const out = colorize("unknown", "ok");
  assert.ok(out.includes("ok"));
});
