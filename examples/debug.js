/**
 * Debugging-style logging: scopes, objects, timers around suspect code.
 * Run: node examples/debug.js
 */
import log from "../src/index.js";

const parse = log.scope("parse");
const render = log.scope("render");

log.step("Repro: user report #442 — wrong total");

parse.time("json");
const payload = {
  items: [
    { id: 1, price: 9.99, qty: 2 },
    { id: 2, price: "12.50ea", qty: 1 }, // bug: non-numeric string → NaN
  ],
  discount: { type: "percent", value: 0.1 },
};
parse.timeEnd("json");

log("Raw payload snapshot:");
parse.info(payload);

parse.step("Computing cart total…");
log.time("reduce");

let total = 0;
for (const item of payload.items) {
  const line = item.price * item.qty;
  parse.info({ id: item.id, price: item.price, qty: item.qty, line });
  total += line;
}
total *= 1 - payload.discount.value;

log.timeEnd("reduce");

render.warn(`Total before fix: ${total}`);
render.success("Fix: coerce price with Number() or validate before multiply");
