# lumelog

[![npm version](https://img.shields.io/npm/v/lumelog.svg)](https://www.npmjs.com/package/lumelog)
![node >=18](https://img.shields.io/badge/node-%3E%3D18-339933)
[![test](https://github.com/codehassoul/lumelog/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/codehassoul/lumelog/actions/workflows/test.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Better `console.log` for Node.js.

Human-first terminal logging for CLIs, scripts, and developer-facing services.

## Install

```bash
npm install lumelog
```

Requires Node.js 18+.
ESM-only. Use `import log from "lumelog"`.

## Mental Model

Think of `lumelog` like this:

- `log(...)` is your better `console.log(...)`
- `log.info()`, `log.warn()`, `log.error()` add readable levels
- a trailing object is treated as metadata
- `log.child({...})` creates a logger with metadata attached to every line

```js
import log from "lumelog";

log("Starting sync for %s", projectName);
log.info("User fetched", { userId: 123 });
log.warn("Cache is stale");
log.error(new Error("Connection refused"));

const reqLog = log.child({ requestId: "req_123" });
reqLog.info("Handled request");
```

## Why Not `console.log`?

`console.log` is flexible, but terminal output gets hard to scan fast.

With `lumelog` you get:

- readable levels without hand-written prefixes
- cleaner object and error output
- lightweight metadata
- better terminal readability with almost no extra API

```js
console.log("User fetched", user, requestId);
log.info("User fetched", user, { requestId });
```

## Where It Shines

- CLIs
- scripts
- internal tools
- dev-focused services

If a human is reading the terminal, `lumelog` is a good fit.

## What It Is Not

- not a logging pipeline
- not an observability tool
- not a full production logging system

It works best as a human-readable logger, and can complement structured logging tools when you need more than terminal output.

## Small API

```js
log("plain output");
log.info("info");
log.warn("warn");
log.error("error");
log.success("success");
log.debug("debug");
log.trace("trace");

log.scope("DB").info("connected");
log.child({ requestId: "123" }).info("request started");
```

## License

MIT
