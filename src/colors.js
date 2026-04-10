import chalk from "chalk";
import { LEVELS, LABEL_WIDTH } from "./symbols.js";

const paint = {
  success: chalk.green,
  done: chalk.green,
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.cyan,
  step: chalk.magenta,
  time: chalk.blue,
};

/** Snapshot at load: avoids reading chalk.level on every log line. */
const useAnsi = chalk.level > 0;

/** True when stderr/stdout styling is allowed (matches Chalk). */
export function isAnsiEnabled() {
  return useAnsi;
}

/** Uniform gap between label column and message (all levels). */
const MESSAGE_GAP = "  ";

/** Fallback row shape when `kind` is not a known level (internal safety). */
const UNKNOWN = {
  symbol: "?",
  label: "???",
  labelPadded: "???".padEnd(LABEL_WIDTH),
};

const UNKNOWN_PREFIX =
  UNKNOWN.symbol + " " + UNKNOWN.labelPadded + MESSAGE_GAP;

const plainPrefix = Object.fromEntries(
  Object.keys(LEVELS).map((k) => {
    const m = LEVELS[k];
    return [k, m.symbol + " " + m.labelPadded + MESSAGE_GAP];
  }),
);

/** Multiline plain text: first line gets badge prefix, rest indented. */
function joinPlain(prefix, body) {
  const nl = body.indexOf("\n");
  if (nl === -1) return prefix + body;
  const pad = " ".repeat(prefix.length);
  const lines = body.split("\n");
  let out = prefix + lines[0];
  for (let i = 1; i < lines.length; i++) {
    out += "\n" + pad + lines[i];
  }
  return out;
}

/**
 * Leveled line(s). When useAnsi is false (non-TTY, NO_COLOR, FORCE_COLOR=0),
 * skips Chalk entirely. Single-line bodies skip split().
 * `preStyled`: body already contains ANSI (e.g. util.inspect colors).
 */
export function colorize(kind, body, options = {}) {
  const preStyled = options.preStyled === true;
  const meta = LEVELS[kind] ?? UNKNOWN;
  const prefix = plainPrefix[kind] ?? UNKNOWN_PREFIX;
  const { symbol, labelPadded } = meta;

  if (!useAnsi) {
    return joinPlain(prefix, body);
  }

  const tone = paint[kind] ?? chalk.white;
  const nl = body.indexOf("\n");
  const badge = tone.bold(symbol + " " + labelPadded) + MESSAGE_GAP;
  if (nl === -1) {
    return badge + body;
  }

  const pad = " ".repeat(prefix.length);
  const lines = body.split("\n");
  let out = badge + lines[0];
  for (let i = 1; i < lines.length; i++) {
    out += "\n" + pad + lines[i];
  }
  return out;
}

/**
 * Plain `log()` — no badge; content starts at MESSAGE_START to align with leveled logs.
 * `preStyled`: skip gray wrapper when body uses util.inspect colors.
 */
export function colorizePlain(body, messageStart, options = {}) {
  const pad = messageStart > 0 ? " ".repeat(messageStart) : "";

  if (!useAnsi) {
    if (!pad) return body;
    const nl = body.indexOf("\n");
    if (nl === -1) return pad + body;
    const lines = body.split("\n");
    let out = pad + lines[0];
    for (let i = 1; i < lines.length; i++) {
      out += "\n" + pad + lines[i];
    }
    return out;
  }

  const nl = body.indexOf("\n");
  if (nl === -1) {
    return pad + body;
  }
  const lines = body.split("\n");
  let out = pad + lines[0];
  for (let i = 1; i < lines.length; i++) {
    out += "\n" + pad + lines[i];
  }
  return out;
}
