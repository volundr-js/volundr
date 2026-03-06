import { Task } from "../types/index.js";

export class TaskQueue {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private queue: Task<any>[] = [];

    enqueue(task: Task<any>): void {
        this.queue.push(task);
    }

    dequeue(): Task<any> | undefined {
        return this.queue.shift();
    }

    isEmpty(): boolean {
        return this.queue.length === 0;
    }

    clear(): void {
        this.queue = [];
    }

    get size(): number {
        return this.queue.length;
    }
}