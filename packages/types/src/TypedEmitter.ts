/**
 * Zero-garbage typed event emitter.
 *
 * Replaces Node.js EventEmitter with a minimal implementation optimized for
 * Discord event dispatch: indexed for-loop, single data arg, no spread/clone.
 *
 * Hot-path emit() creates zero temporary objects (no iterator, no array copy,
 * no rest params, no Reflect.apply).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export class TypedEmitter<Events extends {}> {
    /** @internal */
    private _events: Record<string, ((data: any) => void)[]> = Object.create(null);

    on<K extends keyof Events & string>(event: K, listener: (data: Events[K]) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    on(event: string, listener: (data: any) => void): this {
        (this._events[event] ??= []).push(listener);
        return this;
    }

    once<K extends keyof Events & string>(event: K, listener: (data: Events[K]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (data: any) => void): this {
        const wrapper = (data: any) => {
            this.off(event, wrapper);
            listener(data);
        };
        (wrapper as any).__original = listener;
        (this._events[event] ??= []).push(wrapper);
        return this;
    }

    emit<K extends keyof Events & string>(event: K, data: Events[K]): boolean;
    emit(event: string, ...args: unknown[]): boolean;
    emit(event: string, data: unknown): boolean {
        const list = this._events[event];
        if (!list || list.length === 0) {
            if (event === "error") throw data;
            return false;
        }
        for (let i = 0; i < list.length; i++) {
            list[i](data);
        }
        return true;
    }

    off<K extends keyof Events & string>(event: K, listener: (data: Events[K]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (data: any) => void): this {
        const list = this._events[event];
        if (!list) return this;
        for (let i = list.length - 1; i >= 0; i--) {
            if (list[i] === listener || (list[i] as any).__original === listener) {
                list.splice(i, 1);
                break;
            }
        }
        return this;
    }

    removeAllListeners(event?: string): this {
        if (event !== undefined) {
            delete this._events[event];
        } else {
            this._events = Object.create(null);
        }
        return this;
    }

    listenerCount(event: string): number {
        return this._events[event]?.length ?? 0;
    }

    /**
     * Returns a promise that resolves when the given event fires,
     * optionally filtered by a predicate.
     *
     * ```ts
     * const msg = await client.waitFor("MESSAGE_CREATE", m => m.content === "hello", 30_000);
     * ```
     */
    waitFor<K extends keyof Events & string>(
        event: K,
        filter?: (data: Events[K]) => boolean,
        timeout?: number,
    ): Promise<Events[K]> {
        return new Promise<Events[K]>((resolve, reject) => {
            let timer: ReturnType<typeof setTimeout> | undefined;

            const handler = (data: Events[K]) => {
                if (filter && !filter(data)) return;
                cleanup();
                resolve(data);
            };

            const cleanup = () => {
                if (timer !== undefined) clearTimeout(timer);
                this.off(event, handler);
            };

            if (timeout !== undefined) {
                timer = setTimeout(() => {
                    cleanup();
                    reject(new Error(`waitFor("${event}") timed out after ${timeout}ms`));
                }, timeout);
            }

            this.on(event, handler);
        });
    }
}
