import { parentPort } from "node:worker_threads";

// Transpilers (tsx/esbuild) inject __name(fn, "name") to preserve function names.
// Define it here so eval()'d serialized functions don't throw.
globalThis.__name = (target, _value) => target;

parentPort?.on("message", async ({ fn, args }) => {
  try {
    const func = eval(`(${fn})`);
    const result = await func(...args);
    parentPort?.postMessage({ success: true, result });
  } catch (error) {
    parentPort?.postMessage({
      success: false,
      error: error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) },
    });
  }
});
