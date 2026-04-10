/** Value passed to log methods (stringified, JSON-pretty-printed, or inspected). */
export type LogInput = unknown;

export interface Log {
  (...args: LogInput[]): void;
  success(...args: LogInput[]): void;
  error(...args: LogInput[]): void;
  fatal(...args: LogInput[]): void;
  warn(...args: LogInput[]): void;
  info(...args: LogInput[]): void;
  debug(...args: LogInput[]): void;
  step(...args: LogInput[]): void;
  trace(...args: LogInput[]): void;
  level(): "error" | "warn" | "info" | "step" | undefined;
  levels(): Array<"error" | "warn" | "info" | "step" | "success" | "time" | "done">;
  time(label: string): void;
  timeEnd(label: string): void;
  child(metadata: Record<string, unknown>): Log;
  scope(name: string): Log;
}

declare const log: Log;
export default log;
