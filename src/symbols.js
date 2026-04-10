const BASE = {
  success: { symbol: "✔", label: "SUCCESS" },
  done: { symbol: "✔", label: "DONE" },
  error: { symbol: "✖", label: "ERROR" },
  warn: { symbol: "⚠", label: "WARN" },
  info: { symbol: "ℹ", label: "INFO" },
  step: { symbol: "→", label: "STEP" },
  time: { symbol: "◷", label: "TIME" },
};

/** Widest label for column alignment (SUCCESS). */
export const LABEL_WIDTH = Math.max(
  ...Object.values(BASE).map((l) => l.label.length),
);

/** Per-level metadata with pre-padded labels (avoids padEnd on hot path). */
export const LEVELS = Object.fromEntries(
  Object.entries(BASE).map(([k, v]) => [
    k,
    {
      symbol: v.symbol,
      label: v.label,
      labelPadded: v.label.padEnd(LABEL_WIDTH),
    },
  ]),
);

/**
 * Monospace column index where the message body begins for every leveled line
 * (symbol + space + padded label + uniform gap). Plain `log()` indents to match.
 */
const _g = LEVELS.info;
export const MESSAGE_START = `${_g.symbol} ${_g.labelPadded}  `.length;
