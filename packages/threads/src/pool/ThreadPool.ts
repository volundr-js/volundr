import { Worker } from './Worker.js';
import { Task, ThreadPoolOptions, PoolStatus, DEFAULT_POOL_SIZE } from '../types/index.js';
import { serializeFunction } from '../utils/serialize.js';
import { TaskQueue } from '../queue/TaskQueue.js';
import { Logger } from "@volundr/logger";

const log = Logger.getLogger("threads", "ThreadPool");

export class ThreadPool {
    private workers: Worker[] = [];
    private queue: TaskQueue;
    private taskTimeout?: number;
    private drainResolve: (() => void) | null = null;
    private readonly poolSize: number;
    private initialized = false;

    constructor(options: ThreadPoolOptions = {}) {
        this.poolSize = options.size ?? DEFAULT_POOL_SIZE;
        this.taskTimeout = options.taskTimeout;
        this.queue = new TaskQueue();

        log.info(`Pool created (${this.poolSize} workers, lazy init)`);
    }

    /** Eagerly spawn all workers. Called automatically on first task if not invoked manually. */
    ensureWorkers(): void {
        if (this.initialized) return;
        this.initialized = true;

        this.workers = Array.from({ length: this.poolSize }, () => {
            const worker = new Worker();
            worker.on("idle", () => this.next(worker));
            return worker;
        });

        log.info(`Spawned ${this.poolSize} workers`);
    }

    run<T, A extends unknown[]>(fn: (...args: A) => T, ...args: A): Promise<Awaited<T>> {
        this.ensureWorkers();
        return new Promise((resolve, reject) => {
            const task: Task<Awaited<T>> = {
                fn: serializeFunction(fn),
                args,
                resolve,
                reject,
            };

            const idleWorker = this.workers.find((w) => w.isIdle);

            if (idleWorker) {
                log.debug(`Task dispatched to Worker#${idleWorker.id}`);
                idleWorker.executeTask(task, this.taskTimeout);
            } else {
                log.debug(`All workers busy, task enqueued (queue size: ${this.queue.size + 1})`);
                this.queue.enqueue(task);
            }
        });
    }

    private next(worker: Worker): void {
        if (this.queue.isEmpty()) {
            if (this.drainResolve && this.workers.every((w) => w.isIdle)) {
                log.info("All tasks drained");
                this.drainResolve();
                this.drainResolve = null;
            }
            return;
        }

        const nextTask = this.queue.dequeue();
        if (nextTask) {
            log.debug(`Queued task dispatched to Worker#${worker.id} (queue size: ${this.queue.size})`);
            worker.executeTask(nextTask, this.taskTimeout);
        }
    }

    drain(): Promise<void> {
        const allIdle = this.workers.every((w) => w.isIdle);
        if (this.queue.isEmpty() && allIdle) {
            return Promise.resolve();
        }

        log.info("Draining...");
        return new Promise((resolve) => {
            this.drainResolve = resolve;
        });
    }

    async close(): Promise<void> {
        await this.drain();
        await this.terminate();
    }

    async terminate(): Promise<void> {
        log.info("Terminating pool");
        await Promise.all(this.workers.map((w) => w.terminate()));
        this.queue.clear();
        log.info("Pool terminated");
    }

    getStatus(): PoolStatus {
        return {
            workers: this.workers.map(w => ({ id: w.id, status: w.status })),
            queueSize: this.queue.size,
            poolSize: this.poolSize,
        };
    }
}
