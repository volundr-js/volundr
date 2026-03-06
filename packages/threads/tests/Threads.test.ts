import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { TaskQueue } from "../src/queue/TaskQueue.js";
import { serializeFunction } from "../src/utils/serialize.js";
import { ThreadPool } from "../src/pool/ThreadPool.js";

describe("TaskQueue", () => {
    it("should start empty", () => {
        const queue = new TaskQueue();
        assert.equal(queue.isEmpty(), true);
        assert.equal(queue.size, 0);
    });

    it("should enqueue and dequeue in FIFO order", () => {
        const queue = new TaskQueue();

        const task1 = { fn: "a", args: [], resolve: () => {}, reject: () => {} };
        const task2 = { fn: "b", args: [], resolve: () => {}, reject: () => {} };
        const task3 = { fn: "c", args: [], resolve: () => {}, reject: () => {} };

        queue.enqueue(task1);
        queue.enqueue(task2);
        queue.enqueue(task3);

        assert.equal(queue.size, 3);
        assert.equal(queue.isEmpty(), false);

        assert.strictEqual(queue.dequeue(), task1);
        assert.strictEqual(queue.dequeue(), task2);
        assert.strictEqual(queue.dequeue(), task3);

        assert.equal(queue.isEmpty(), true);
    });

    it("should return undefined when dequeuing from empty queue", () => {
        const queue = new TaskQueue();
        assert.equal(queue.dequeue(), undefined);
    });

    it("should clear all items", () => {
        const queue = new TaskQueue();
        queue.enqueue({ fn: "a", args: [], resolve: () => {}, reject: () => {} });
        queue.enqueue({ fn: "b", args: [], resolve: () => {}, reject: () => {} });

        assert.equal(queue.size, 2);

        queue.clear();

        assert.equal(queue.size, 0);
        assert.equal(queue.isEmpty(), true);
    });

    it("should report correct size after mixed operations", () => {
        const queue = new TaskQueue();
        const task = { fn: "x", args: [], resolve: () => {}, reject: () => {} };

        queue.enqueue(task);
        queue.enqueue(task);
        queue.enqueue(task);
        assert.equal(queue.size, 3);

        queue.dequeue();
        assert.equal(queue.size, 2);

        queue.enqueue(task);
        assert.equal(queue.size, 3);

        queue.dequeue();
        queue.dequeue();
        queue.dequeue();
        assert.equal(queue.size, 0);
    });
});

describe("serializeFunction", () => {
    it("should convert a named function to its string representation", () => {
        function add(a: number, b: number): number {
            return a + b;
        }

        const result = serializeFunction(add);
        assert.equal(typeof result, "string");
        // tsx may minify spaces, so check for both forms
        assert.ok(
            result.includes("a + b") || result.includes("a+b"),
            "should contain the function body"
        );
        assert.ok(result.includes("function"), "should contain the function keyword");
    });

    it("should convert an arrow function to string", () => {
        const fn = (x: number) => x * 2;
        const result = serializeFunction(fn);
        assert.equal(typeof result, "string");
        // tsx may minify spaces, so check for both forms
        assert.ok(
            result.includes("x * 2") || result.includes("x*2"),
            "should contain the arrow function body"
        );
    });

    it("should convert an anonymous function to string", () => {
        const result = serializeFunction(function (a: number, b: number) {
            return a - b;
        });
        assert.equal(typeof result, "string");
        // tsx may minify spaces, so check for both forms
        assert.ok(
            result.includes("a - b") || result.includes("a-b"),
            "should contain the function body"
        );
    });
});

describe("ThreadPool", () => {
    let pool: ThreadPool;

    afterEach(async () => {
        if (pool) {
            await pool.terminate();
        }
    });

    it("should create a pool with the specified size", () => {
        pool = new ThreadPool({ size: 2 });
        const status = pool.getStatus();
        assert.equal(status.poolSize, 2);
        // Workers are lazy-initialized, so no workers exist yet
        assert.equal(status.workers.length, 0);
    });

    it("should spawn workers on first task (lazy init)", async () => {
        pool = new ThreadPool({ size: 2 });

        const result = await pool.run((a: number, b: number) => a + b, 3, 4);
        assert.equal(result, 7);

        const status = pool.getStatus();
        assert.equal(status.workers.length, 2);
    });

    it("should execute a simple sync function and return the result", async () => {
        pool = new ThreadPool({ size: 2 });

        const result = await pool.run((x: number) => x * x, 5);
        assert.equal(result, 25);
    });

    it("should execute an async function", async () => {
        pool = new ThreadPool({ size: 2 });

        const result = await pool.run(async (msg: string) => {
            return `hello ${msg}`;
        }, "world");

        assert.equal(result, "hello world");
    });

    it("should handle multiple concurrent tasks", async () => {
        pool = new ThreadPool({ size: 2 });

        const promises = [
            pool.run((a: number, b: number) => a + b, 1, 2),
            pool.run((a: number, b: number) => a * b, 3, 4),
            pool.run((a: number, b: number) => a - b, 10, 3),
            pool.run((x: number) => x * x, 6),
        ];

        const results = await Promise.all(promises);

        assert.equal(results[0], 3);   // 1 + 2
        assert.equal(results[1], 12);  // 3 * 4
        assert.equal(results[2], 7);   // 10 - 3
        assert.equal(results[3], 36);  // 6 * 6
    });

    it("should report correct worker count in getStatus", async () => {
        pool = new ThreadPool({ size: 2 });

        // Before any task, no workers
        assert.equal(pool.getStatus().workers.length, 0);
        assert.equal(pool.getStatus().poolSize, 2);

        // Run a task to trigger worker initialization
        await pool.run(() => 1);

        const status = pool.getStatus();
        assert.equal(status.workers.length, 2);
        assert.equal(status.poolSize, 2);
        assert.equal(status.queueSize, 0);
    });

    it("should drain and resolve when all tasks complete", async () => {
        pool = new ThreadPool({ size: 2 });

        // Queue up several tasks
        const results: Promise<number>[] = [];
        for (let i = 0; i < 5; i++) {
            results.push(pool.run((x: number) => x + 1, i));
        }

        await pool.drain();

        // After drain, all tasks should be complete
        const values = await Promise.all(results);
        assert.deepEqual(values, [1, 2, 3, 4, 5]);
    });

    it("should drain immediately if no tasks are pending", async () => {
        pool = new ThreadPool({ size: 2 });

        // drain on an idle pool should resolve immediately
        await pool.drain();
    });

    it("should close after draining all tasks", async () => {
        pool = new ThreadPool({ size: 2 });

        const result = pool.run((a: number, b: number) => a + b, 10, 20);

        await pool.close();

        const value = await result;
        assert.equal(value, 30);

        // After close, workers should have been terminated already
        // Prevent double termination in afterEach
        pool = undefined!;
    });

    it("should handle errors from worker functions", async () => {
        pool = new ThreadPool({ size: 2 });

        await assert.rejects(
            () => pool.run(() => {
                throw new Error("task failed");
            }),
            (err: Error) => {
                assert.ok(err.message.includes("task failed"), `expected error message to contain "task failed", got: ${err.message}`);
                return true;
            }
        );
    });

    it("should handle errors in async worker functions", async () => {
        pool = new ThreadPool({ size: 2 });

        await assert.rejects(
            () => pool.run(async () => {
                throw new Error("async fail");
            }),
            (err: Error) => {
                assert.ok(err.message.includes("async fail"), `expected error message to contain "async fail", got: ${err.message}`);
                return true;
            }
        );
    });

    it("should continue processing after a task error", async () => {
        pool = new ThreadPool({ size: 2 });

        // First task errors
        const errorTask = pool.run(() => {
            throw new Error("oops");
        }).catch((e) => e.message);

        // Second task should succeed
        const successTask = pool.run((x: number) => x + 100, 42);

        const [errorMsg, successResult] = await Promise.all([errorTask, successTask]);

        assert.ok(errorMsg.includes("oops"));
        assert.equal(successResult, 142);
    });

    it("should handle string operations", async () => {
        pool = new ThreadPool({ size: 2 });

        const result = await pool.run((s: string) => s.toUpperCase(), "hello");
        assert.equal(result, "HELLO");
    });
});
