import { availableParallelism } from "node:os";

export const DEFAULT_POOL_SIZE = availableParallelism();

export interface ThreadPoolOptions {
    size?: number;
    taskTimeout?: number;
}

export interface Task<T> {
    fn: string;
    args: unknown[];
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
}

export type WorkerStatus = "idle" | "busy";

export interface WorkerInfo {
    id: number;
    status: WorkerStatus;
}

export interface PoolStatus {
    workers: WorkerInfo[];
    queueSize: number;
    poolSize: number;
}
