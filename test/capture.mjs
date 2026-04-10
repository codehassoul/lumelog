/** Shared console patching for tests (imported only from `*.test.js`; not a test file). */
export function captureConsole(calls, mapLine = (x) => x) {
  const origLog = console.log;
  const origErr = console.error;
  const push = (line) => calls.push(mapLine(line));
  console.log = push;
  console.error = push;
  return () => {
    console.log = origLog;
    console.error = origErr;
  };
}
