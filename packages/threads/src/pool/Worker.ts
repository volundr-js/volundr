import { Worker as NodeWorker } from "node:worker_threads";
import { EventEmitter } from "node:events";
import { Task, WorkerStatus } from "../types/index.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Logger } from "@volundr/logger";

const workerScript = join(dirname(fileURLToPath(import.meta.url)), "worker-script.js");

const SLOW_TASK_THRESHOLD = 5_000;

let nextWorkerId = 0;

export class Worker extends EventEmitter {
    private nodeWorker!: NodeWorker;
    private currentTask: Task<unknown> | null = null;
    private timeoutId: ReturnType<typeof setTimeout> | null = null;
    private slowWarnId: ReturnType<typeof setTimeout> | null = null;
    private taskStart = 0;
    readonly id: number;
    status: WorkerStatus = "idle";

    private readonly log: Logger;

    constructor() {
        super();
        this.id = nextWorkerId++;
        this.log = Logger.getLogger("threads", `Worker#${this.id}`);
        this.spawn();
    }

    private spawn(): void {
        this.nodeWorker = new NodeWorker(workerScript);

        this.log.info("Spawned");

        this.nodeWorker.on("message", ({ success, result, error }) => {
            this.clearTimeout();
            const elapsed = Date.now() - this.taskStart;
            this.status = "idle";
            const task = this.currentTask;
            this.currentTask = null;

            if (task) {
                if (success) {
                    this.log.info(`Task completed in ${elapsed}ms`);
                    task.resolve(result);
                } else {
                    this.log.error(`Task failed in ${elapsed}ms: ${error.message}`);
                    task.reject(new Error(error.message));
                }
            }

            this.log.debug("Status: idle");
            this.emit("idle");
        });

        this.nodeWorker.on("error", (err: Error) => {
            this.clearTimeout();
            this.status = "idle";
            const task = this.currentTask;
            this.currentTask = null;

            this.log.error(`Worker error: ${err.message}`);

            if (task) {
                task.reject(err);
            }

            this.emit("idle");
        });

        this.nodeWorker.on("exit", (code: number) => {
            if (code !== 0 && this.status !== "idle") {
                const task = this.currentTask;
                this.currentTask = null;
                this.status = "idle";

                this.log.error(`Crashed with exit code ${code}, respawning`);

                if (task) {
                    task.reject(new Error(`Worker exited with code ${code}`));
                }

                this.spawn();
                this.emit("idle");
            } else {
                this.log.debug(`Exited with code ${code}`);
            }
        });
    }

    executeTask<T>(task: Task<T>, timeout?: number): void {
        this.status = "busy";
        this.currentTask = task as Task<unknown>;
        this.taskStart = Date.now();

        this.log.info(`Executing task${timeout ? ` (timeout: ${timeout}ms)` : ""}`);
        this.nodeWorker.postMessage({ fn: task.fn, args: task.args });

        this.slowWarnId = setTimeout(() => {
            this.log.warn(`Task running for over ${SLOW_TASK_THRESHOLD / 1000}s`);
        }, SLOW_TASK_THRESHOLD);

        if (timeout && timeout > 0) {
            this.timeoutId = setTimeout(() => {
                const timedOutTask = this.currentTask;
                this.currentTask = null;
                this.status = "idle";

                this.log.warn(`Task timed out after ${timeout}ms, respawning`);

                this.nodeWorker.terminate();
                this.spawn();

                if (timedOutTask) {
                    timedOutTask.reject(new Error(`Task timed out after ${timeout}ms`));
                }

                this.emit("idle");
            }, timeout);
        }
    }

    private clearTimeout(): void {
        if (this.slowWarnId) {
            clearTimeout(this.slowWarnId);
            this.slowWarnId = null;
        }
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    terminate(): Promise<number> {
        this.clearTimeout();
        this.currentTask = null;
        this.status = "idle";
        this.log.info("Terminated");
        return this.nodeWorker.terminate();
    }

    get isIdle(): boolean {
        return this.status === "idle";
    }
}
