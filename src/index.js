import {
  formatLevel,
  formatLevelArgs,
  formatPlainArgs,
} from "./format.js";

const SUPPORTED_LEVELS = Object.freeze([
  "error",
  "warn",
  "info",
  "step",
  "success",
  "time",
  "done",
]);

const LEVEL_ALIASES = Object.freeze({
  success: "info",
  time: "step",
  done: "step",
});

const LEVEL_PRIORITY = Object.freeze({
  error: 0,
  warn: 1,
  info: 2,
  success: 2,
  done: 2,
  log: 2,
  step: 3,
  time: 3,
});

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  if (value instanceof Error || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function withChildMetadata(args, metadata) {
  if (metadata == null) return args;
  const last = args[args.length - 1];
  if (isPlainObject(last)) {
    return [...args.slice(0, -1), { ...metadata, ...last }];
  }
  return [...args, metadata];
}

function stdoutOnly() {
  return process.env.LOGRA_STDOUT_ONLY === "1";
}

function resolveLevel(level) {
  const normalized = level?.toLowerCase();
  if (normalized == null || !SUPPORTED_LEVELS.includes(normalized)) return;
  return LEVEL_ALIASES[normalized] ?? normalized;
}

function currentLevel() {
  return process.env.LOGRA_LEVEL == null
    ? undefined
    : resolveLevel(process.env.LOGRA_LEVEL);
}

function currentLevelThreshold() {
  const level = currentLevel();
  return level == null ? null : LEVEL_PRIORITY[level];
}

function shouldWrite(level) {
  const threshold = currentLevelThreshold();
  if (threshold === null) return true;
  return LEVEL_PRIORITY[level] <= threshold;
}

/** @param {"stdout" | "stderr"} stream */
function getOutput(stream) {
  const useStderr = stream === "stderr" && !stdoutOnly();
  return useStderr
    ? { consoleMethod: console.error, processStream: process.stderr }
    : { consoleMethod: console.log, processStream: process.stdout };
}

/** @param {"stdout" | "stderr"} stream */
function write(line, stream) {
  const { consoleMethod, processStream } = getOutput(stream);
  try {
    consoleMethod(line);
  } catch {
    try {
      processStream.write(String(line) + "\n");
    } catch {
      /* stream closed or unavailable */
    }
  }
}

function createLogger(scope, childMetadata) {
  const timers = new Map();

  function log(...args) {
    if (!shouldWrite("log")) return;
    write(formatPlainArgs(withChildMetadata(args, childMetadata), scope), "stdout");
  }

  log.success = (...args) =>
    shouldWrite("success") &&
    write(
      formatLevelArgs("success", withChildMetadata(args, childMetadata), scope),
      "stdout",
    );
  log.error = (...args) =>
    shouldWrite("error") &&
    write(
      formatLevelArgs("error", withChildMetadata(args, childMetadata), scope),
      "stderr",
    );
  log.warn = (...args) =>
    shouldWrite("warn") &&
    write(
      formatLevelArgs("warn", withChildMetadata(args, childMetadata), scope),
      "stderr",
    );
  log.info = (...args) =>
    shouldWrite("info") &&
    write(
      formatLevelArgs("info", withChildMetadata(args, childMetadata), scope),
      "stdout",
    );
  log.debug = (...args) =>
    shouldWrite("info") &&
    write(
      formatLevelArgs("info", withChildMetadata(args, childMetadata), scope),
      "stdout",
    );
  log.step = (...args) =>
    shouldWrite("step") &&
    write(
      formatLevelArgs("step", withChildMetadata(args, childMetadata), scope),
      "stdout",
    );
  log.trace = (...args) =>
    shouldWrite("step") &&
    write(
      formatLevelArgs("step", withChildMetadata(args, childMetadata), scope),
      "stdout",
    );
  log.fatal = (...args) =>
    shouldWrite("error") &&
    write(
      formatLevelArgs("error", withChildMetadata(args, childMetadata), scope),
      "stderr",
    );

  log.time = (label) => {
    const key = String(label);
    timers.set(key, performance.now());
    if (!shouldWrite("time")) return;
    write(formatLevel("time", `${key} started`, scope), "stdout");
  };

  log.timeEnd = (label) => {
    const key = String(label);
    const start = timers.get(key);
    if (start === undefined) {
      write(
        formatLevel("error", `${key}: no active timer`, scope),
        "stderr",
      );
      return;
    }
    timers.delete(key);
    const ms = Math.max(0, Math.floor(performance.now() - start));
    if (!shouldWrite("done")) return;
    write(formatLevel("done", `${key} completed in ${ms}ms`, scope), "stdout");
  };

  log.scope = (name) =>
    createLogger(scope ? `${scope}:${name}` : name, childMetadata);
  log.child = (metadata) =>
    createLogger(scope, childMetadata == null ? metadata : { ...childMetadata, ...metadata });
  log.level = () => currentLevel();
  log.levels = () => [...SUPPORTED_LEVELS];

  return log;
}

const log = createLogger(undefined);

export default log;
