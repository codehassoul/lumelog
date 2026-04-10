import { formatWithOptions, inspect } from "node:util";
import { colorize, colorizePlain } from "./colors.js";
import { MESSAGE_START } from "./symbols.js";

/** Cap serialized body size to avoid blocking the event loop on huge logs. */
const MAX_BODY_CHARS = 49_152;

/** Max nesting depth for logged objects (util.inspect). */
const OBJECT_DEPTH = 4;

/** Frozen opts for object logging — plain (no inspect colors). */
const INSPECT_OBJECT = Object.freeze({
  depth: OBJECT_DEPTH,
  maxArrayLength: 50,
  maxStringLength: 2_048,
  breakLength: 76,
  compact: false,
  colors: false,
});

/** Same limits with Node’s syntax highlighting (keys/types/values). */
/** Fallback inspect when formatting throws. */
const INSPECT_SHALLOW = Object.freeze({
  depth: 2,
  maxStringLength: 2_048,
  breakLength: 72,
});

const INSPECT_METADATA = Object.freeze({
  depth: 3,
  maxArrayLength: 20,
  maxStringLength: 512,
  breakLength: Infinity,
  compact: true,
  colors: false,
});

function maybeTruncate(text) {
  if (text.length <= MAX_BODY_CHARS) return text;
  return text.slice(0, MAX_BODY_CHARS) + "\n… [truncated]";
}

function isStyledPayload(raw) {
  return (
    raw !== null &&
    typeof raw === "object" &&
    Object.hasOwn(raw, "value") &&
    Object.hasOwn(raw, "styled")
  );
}

function isInternalStackLine(line) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("at node:") ||
    trimmed.includes("(node:internal/") ||
    trimmed.includes("(internal/") ||
    trimmed.includes("node:internal/")
  );
}

function trimErrorStack(stack) {
  if (typeof stack !== "string" || stack === "") return stack;
  const lines = stack.split("\n");
  if (lines.length <= 2) return stack;

  let end = lines.length;
  while (end > 2 && isInternalStackLine(lines[end - 1])) {
    end--;
  }

  return end === lines.length ? stack : lines.slice(0, end).join("\n");
}

function serializeRaw(message) {
  // Primitives: no try/catch (common hot path for HF string/number logs).
  const t = typeof message;
  if (t === "string") return message;
  if (t === "number" || t === "boolean" || t === "bigint" || t === "function") {
    return String(message);
  }
  if (t === "symbol") return String(message);
  if (t === "undefined") return "undefined";
  if (message === null) return "null";

  try {
    if (message instanceof Error) {
      const stack = trimErrorStack(message.stack);
      return {
        message: message.message || `${message.name}`,
        stack: stack || `${message.name}: ${message.message}`,
      };
    }
    if (typeof message === "object") {
      try {
        return inspect(message, INSPECT_OBJECT);
      } catch {
        return inspect(message, INSPECT_SHALLOW);
      }
    }
    return String(message);
  } catch {
    try {
      return inspect(message, INSPECT_SHALLOW);
    } catch {
      return "[unable to format message]";
    }
  }
}

function serialize(message) {
  const raw = serializeRaw(message);
  if (
    raw !== null &&
    typeof raw === "object" &&
    Object.hasOwn(raw, "message") &&
    Object.hasOwn(raw, "stack")
  ) {
    return {
      text: maybeTruncate(raw.stack),
      styled: false,
      jsonMessage: maybeTruncate(raw.message),
      stack: maybeTruncate(raw.stack),
    };
  }
  if (isStyledPayload(raw)) {
    const text = maybeTruncate(raw.value);
    return { text, styled: raw.styled === true, jsonMessage: text };
  }
  const text = maybeTruncate(raw);
  return { text, styled: false, jsonMessage: text };
}

function serializeArgs(args) {
  const { messageArgs, metadata } = splitMetadata(args);
  if (messageArgs.length === 1) {
    return withMetadata(serialize(messageArgs[0]), metadata);
  }

  const parts = messageArgs.map((arg) => serialize(arg));
  return withMetadata({
    text: parts.map((part) => part.text).join(" "),
    styled: parts.some((part) => part.styled),
    jsonMessage: parts.map((part) => part.jsonMessage).join(" "),
    stack: parts.find((part) => part.stack !== undefined)?.stack,
  }, metadata);
}

function formatPlainConsoleArgs(args) {
  const { messageArgs, metadata } = splitMetadata(args);

  try {
    const text = maybeTruncate(formatWithOptions(INSPECT_OBJECT, ...messageArgs));
    return withMetadata({
      text,
      styled: false,
      jsonMessage: text,
    }, metadata);
  } catch {
    return serializeArgs(args);
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  if (value instanceof Error || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function splitMetadata(args) {
  if (args.length < 2) return { messageArgs: args, metadata: undefined };
  const metadata = args[args.length - 1];
  if (!isPlainObject(metadata)) {
    return { messageArgs: args, metadata: undefined };
  }
  return {
    messageArgs: args.slice(0, -1),
    metadata,
  };
}

function formatMetadata(metadata) {
  if (metadata === undefined) return undefined;
  return maybeTruncate(inspect(metadata, INSPECT_METADATA));
}

function appendMetadata(text, metadataText) {
  if (metadataText === undefined) return text;
  if (text === "") return metadataText;
  return `${text} ${metadataText}`;
}

function withMetadata(serialized, metadata) {
  if (metadata === undefined) return serialized;
  const metadataText = formatMetadata(metadata);
  return {
    ...serialized,
    text: appendMetadata(serialized.text, metadataText),
    jsonMessage: serialized.jsonMessage,
    metadata,
  };
}

function applyScope(scope, body) {
  if (scope == null || scope === "") return body;
  return `[${scope}] ` + body;
}

function timestampEnabled() {
  return process.env.LUMELOG_TIME === "1";
}

function formatTimestamp(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatTimestampPart(date = new Date()) {
  return `[${formatTimestamp(date)}] `;
}

function withTimestamp(line) {
  if (!timestampEnabled()) return line;
  return formatTimestampPart() + line;
}

function jsonEnabled() {
  return process.env.LUMELOG_JSON === "1";
}

function toJsonLine(level, message, scope, stack, metadata) {
  const payload = { level, message };
  if (scope != null && scope !== "") payload.scope = scope;
  if (timestampEnabled()) payload.timestamp = formatTimestamp();
  if (stack !== undefined) payload.stack = stack;
  if (metadata !== undefined) {
    for (const [key, value] of Object.entries(metadata)) {
      if (
        key !== "level" &&
        key !== "message" &&
        key !== "scope" &&
        key !== "timestamp" &&
        key !== "stack"
      ) {
        payload[key] = value;
      }
    }
  }
  return JSON.stringify(payload);
}

export function formatLevel(kind, message, scope) {
  const { text, styled, jsonMessage, stack, metadata } = serialize(message);
  if (jsonEnabled()) {
    return toJsonLine(kind, jsonMessage, scope, stack, metadata);
  }
  return withTimestamp(
    colorize(kind, applyScope(scope, text), { preStyled: styled }),
  );
}

export function formatPlain(message, scope) {
  const { text, styled, jsonMessage, stack, metadata } = serialize(message);
  if (jsonEnabled()) {
    return toJsonLine("log", jsonMessage, scope, stack, metadata);
  }
  return withTimestamp(
    colorizePlain(applyScope(scope, text), MESSAGE_START, {
      preStyled: styled,
    }),
  );
}

export function formatLevelArgs(kind, args, scope) {
  const { text, styled, jsonMessage, stack, metadata } = serializeArgs(args);
  if (jsonEnabled()) {
    return toJsonLine(kind, jsonMessage, scope, stack, metadata);
  }
  return withTimestamp(
    colorize(kind, applyScope(scope, text), { preStyled: styled }),
  );
}

export function formatPlainArgs(args, scope) {
  const { text, styled, jsonMessage, stack, metadata } =
    formatPlainConsoleArgs(args);
  if (jsonEnabled()) {
    return toJsonLine("log", jsonMessage, scope, stack, metadata);
  }
  return withTimestamp(
    colorizePlain(applyScope(scope, text), MESSAGE_START, {
      preStyled: styled,
    }),
  );
}
