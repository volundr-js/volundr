import { parentPort } from "node:worker_threads";

// Transpilers (tsx/esbuild) inject __name(fn, "name") to preserve function names.
// Define it here so eval()'d serialized functions don't throw.
(globalThis as any).__name = (target: any, _value: string) => target;

parentPort?.on("message", async ({ fn, args }: { fn: string; args: unknown[] }) => {
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
