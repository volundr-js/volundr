/**
 * Stress Test: Realistic Discord bot scenarios
 *
 * Tests that matter in production:
 *  1. Burst dispatch — 20k events arriving at once (reconnect storm)
 *  2. Listener scaling — 1 to 200 listeners
 *  3. Partial update (_patch) — MESSAGE_UPDATE throughput
 *  4. Cache growth — 500k members
 *  5. Single event latency — p50 / p99
 *  6. GC pressure — heap delta during burst
 *
 * Run: npx tsx --expose-gc benchmarks/stress-test.ts
 */

const gc = globalThis.gc ?? (() => {});

function median(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Fake data generators ───

function fakeMessage(id: string) {
    return {
        id,
        channel_id: "400000000000000000",
        guild_id: "999999999999999999",
        content: `Message ${id} content here with some text to simulate real messages.`,
        author: { id: "100000000000000000", username: "user", discriminator: "0", avatar: null, global_name: "User" },
        timestamp: "2024-01-01T00:00:00.000Z",
        edited_timestamp: null,
        tts: false,
        mention_everyone: false,
        mentions: [],
        mention_roles: [],
        attachments: [],
        embeds: [],
        pinned: false,
        type: 0,
    };
}

function fakeMember(userId: string) {
    return {
        user: { id: userId, username: `user_${userId}`, discriminator: "0", avatar: null, global_name: `User ${userId}` },
        nick: null,
        roles: ["111111111111111111"],
        joined_at: "2024-01-01T00:00:00.000Z",
        deaf: false,
        mute: false,
        flags: 0,
        pending: false,
        communication_disabled_until: null,
    };
}

// ─────────────────────────────────────────────────────

async function main() {
    console.log("=".repeat(60));
    console.log("  Volundr — Stress Test (Realistic Scenarios)");
    console.log("=".repeat(60));
    console.log();

    const { TypedEmitter } = await import("../packages/types/src/TypedEmitter.js");
    const { Collection } = await import("../packages/client/src/collection/Collection.js");
    const { Message } = await import("../packages/client/src/entities/Message.js");
    const { EventEmitter } = await import("node:events");

    const fakeClient = {} as import("../packages/client/src/Client.js").Client;

    // ── 1. Burst Dispatch Test ──
    // Simulates reconnect: 20k events arrive at once through the full pipeline
    {
        console.log("1. BURST DISPATCH (reconnect storm simulation)");

        const BURST_SIZES = [1_000, 5_000, 20_000, 50_000];

        for (const burstSize of BURST_SIZES) {
            // Prepare raw messages
            const rawMessages = Array.from({ length: burstSize }, (_, i) =>
                JSON.stringify(fakeMessage(String(500000000000000000n + BigInt(i))))
            );

            // Simulate full pipeline: JSON.parse → new Message() → cache.set → emit
            const emitter = new TypedEmitter<{ MESSAGE_CREATE: unknown }>();
            const cache = new Collection<string, unknown>();
            let sink = 0;

            // Register handlers like a real bot
            emitter.on("MESSAGE_CREATE", (msg: any) => { sink += msg.content.length; });
            emitter.on("MESSAGE_CREATE", (msg: any) => { cache.set(msg.id, msg); });

            // Warmup
            for (let w = 0; w < 3; w++) {
                cache.clear();
                for (const raw of rawMessages) {
                    const parsed = JSON.parse(raw);
                    const msg = new Message(fakeClient, parsed);
                    emitter.emit("MESSAGE_CREATE", msg);
                }
            }

            // Measure
            const times: number[] = [];
            for (let r = 0; r < 5; r++) {
                cache.clear();
                gc();
                const start = performance.now();
                for (const raw of rawMessages) {
                    const parsed = JSON.parse(raw);
                    const msg = new Message(fakeClient, parsed);
                    emitter.emit("MESSAGE_CREATE", msg);
                }
                times.push(performance.now() - start);
            }

            const med = median(times);
            const throughput = Math.round(burstSize / (med / 1000));
            console.log(`   ${burstSize.toLocaleString()} events: ${med.toFixed(1)} ms (${throughput.toLocaleString()} evt/s) [sink=${sink > 0}]`);
        }
        console.log();
    }

    // ── 2. Listener Scaling Test ──
    // How does emit performance degrade with many listeners?
    {
        console.log("2. LISTENER SCALING (TypedEmitter vs Node.js EventEmitter)");

        const LISTENER_COUNTS = [1, 5, 10, 50, 100, 200];
        const EMIT_COUNT = 100_000;
        const payload = { id: "123", content: "hello" };

        for (const listenerCount of LISTENER_COUNTS) {
            // Volundr
            const vEmitter = new TypedEmitter<{ msg: typeof payload }>();
            let vSink = 0;
            for (let i = 0; i < listenerCount; i++) {
                vEmitter.on("msg", (d) => { vSink += d.content.length; });
            }

            // Node.js
            const nEmitter = new EventEmitter();
            nEmitter.setMaxListeners(300);
            let nSink = 0;
            for (let i = 0; i < listenerCount; i++) {
                nEmitter.on("msg", (d: typeof payload) => { nSink += d.content.length; });
            }

            // Warmup
            for (let w = 0; w < 3; w++) {
                for (let i = 0; i < EMIT_COUNT; i++) vEmitter.emit("msg", payload);
                for (let i = 0; i < EMIT_COUNT; i++) nEmitter.emit("msg", payload);
            }

            // Measure — interleaved
            const vTimes: number[] = [];
            const nTimes: number[] = [];
            for (let r = 0; r < 7; r++) {
                gc();
                if (r % 2 === 0) {
                    let s = performance.now();
                    for (let i = 0; i < EMIT_COUNT; i++) vEmitter.emit("msg", payload);
                    vTimes.push(performance.now() - s);
                    gc();
                    s = performance.now();
                    for (let i = 0; i < EMIT_COUNT; i++) nEmitter.emit("msg", payload);
                    nTimes.push(performance.now() - s);
                } else {
                    let s = performance.now();
                    for (let i = 0; i < EMIT_COUNT; i++) nEmitter.emit("msg", payload);
                    nTimes.push(performance.now() - s);
                    gc();
                    s = performance.now();
                    for (let i = 0; i < EMIT_COUNT; i++) vEmitter.emit("msg", payload);
                    vTimes.push(performance.now() - s);
                }
            }

            const vMed = median(vTimes);
            const nMed = median(nTimes);
            const ratio = (nMed / vMed).toFixed(2);
            console.log(`   ${String(listenerCount).padStart(3)} listeners: Volundr ${vMed.toFixed(1)} ms | Node.js ${nMed.toFixed(1)} ms | ${ratio}x faster [sink=${vSink > 0 && nSink > 0}]`);
        }
        console.log();
    }

    // ── 3. Partial Update (_patch) Test ──
    // MESSAGE_UPDATE only sends changed fields — tests hidden class stability
    {
        console.log("3. PARTIAL UPDATE (_patch throughput)");

        const PATCH_COUNT = 100_000;
        const msg = new Message(fakeClient, fakeMessage("500000000000000000") as any);

        // Warmup
        for (let w = 0; w < 3; w++) {
            for (let i = 0; i < PATCH_COUNT; i++) {
                msg._patch({ content: `updated ${i}`, edited_timestamp: "2024-06-01T00:00:00.000Z" });
            }
        }

        // Measure
        const times: number[] = [];
        for (let r = 0; r < 7; r++) {
            gc();
            const start = performance.now();
            for (let i = 0; i < PATCH_COUNT; i++) {
                msg._patch({ content: `updated ${i}`, edited_timestamp: "2024-06-01T00:00:00.000Z" });
            }
            times.push(performance.now() - start);
        }

        const med = median(times);
        const throughput = Math.round(PATCH_COUNT / (med / 1000));
        const nsPerPatch = ((med / PATCH_COUNT) * 1_000_000).toFixed(0);
        console.log(`   ${PATCH_COUNT.toLocaleString()} patches: ${med.toFixed(1)} ms (${throughput.toLocaleString()} patch/s, ${nsPerPatch} ns/patch)`);
        console.log();
    }

    // ── 4. Cache Growth Test ──
    // Fill a Collection with 500k members and measure memory
    {
        console.log("4. CACHE GROWTH (Collection + entity memory)");

        const MEMBER_COUNTS = [10_000, 100_000, 500_000];

        for (const count of MEMBER_COUNTS) {
            gc();
            const heapBefore = process.memoryUsage().heapUsed;

            const members = new Collection<string, any>();
            const start = performance.now();

            for (let i = 0; i < count; i++) {
                const userId = String(100000000000000000n + BigInt(i));
                const raw = fakeMember(userId);
                members.set(userId, raw); // Raw objects (like CacheManager stores)
            }

            const insertTime = performance.now() - start;
            gc();
            const heapAfter = process.memoryUsage().heapUsed;
            const heapDelta = heapAfter - heapBefore;
            const bytesPerEntry = Math.round(heapDelta / count);

            // Measure lookup speed
            const lookupStart = performance.now();
            let lookupSink = 0;
            for (let i = 0; i < count; i++) {
                const userId = String(100000000000000000n + BigInt(i));
                const m = members.get(userId);
                if (m) lookupSink++;
            }
            const lookupTime = performance.now() - lookupStart;

            console.log(`   ${count.toLocaleString()} members:`);
            console.log(`     Insert:  ${insertTime.toFixed(1)} ms`);
            console.log(`     Lookup:  ${lookupTime.toFixed(1)} ms (${lookupSink.toLocaleString()} hits)`);
            console.log(`     Memory:  ${formatBytes(heapDelta)} (${bytesPerEntry} bytes/entry)`);
        }
        console.log();
    }

    // ── 5. Single Event Latency (p50/p99) ──
    // Measures the actual latency of one emit() call
    {
        console.log("5. SINGLE EVENT LATENCY (microseconds)");

        const SAMPLES = 10_000;
        const emitter = new TypedEmitter<{ msg: { id: string } }>();
        const cache = new Collection<string, unknown>();
        let sink = 0;

        // Typical bot handlers
        emitter.on("msg", (d) => { sink += d.id.length; });
        emitter.on("msg", (d) => { cache.set(d.id, d); });
        emitter.on("msg", (d) => { if (d.id === "trigger") sink += 100; });

        const payload = { id: "500000000000000000" };

        // Warmup
        for (let w = 0; w < 5000; w++) emitter.emit("msg", payload);

        // Measure individual emit latency
        const latencies: number[] = [];
        for (let i = 0; i < SAMPLES; i++) {
            const start = performance.now();
            emitter.emit("msg", payload);
            latencies.push((performance.now() - start) * 1000); // Convert to µs
        }

        console.log(`   Samples:  ${SAMPLES.toLocaleString()}`);
        console.log(`   p50:      ${percentile(latencies, 50).toFixed(2)} µs`);
        console.log(`   p90:      ${percentile(latencies, 90).toFixed(2)} µs`);
        console.log(`   p99:      ${percentile(latencies, 99).toFixed(2)} µs`);
        console.log(`   p99.9:    ${percentile(latencies, 99.9).toFixed(2)} µs`);
        console.log(`   max:      ${Math.max(...latencies).toFixed(2)} µs`);
        console.log(`   [sink=${sink > 0}]`);
        console.log();
    }

    // ── 6. GC Pressure Test ──
    // Measures heap growth during burst (lower = less garbage)
    {
        console.log("6. GC PRESSURE (heap delta during 50k event burst)");

        const BURST = 50_000;
        const rawMessages = Array.from({ length: BURST }, (_, i) =>
            fakeMessage(String(500000000000000000n + BigInt(i)))
        );

        // Volundr TypedEmitter pipeline
        {
            const emitter = new TypedEmitter<{ msg: unknown }>();
            const cache = new Collection<string, unknown>();
            let sink = 0;
            emitter.on("msg", (m: any) => { cache.set(m.id, m); });
            emitter.on("msg", (m: any) => { sink += m.content.length; });

            // Warmup to stabilize
            for (const raw of rawMessages) emitter.emit("msg", raw);
            cache.clear();

            gc();
            const heapBefore = process.memoryUsage().heapUsed;

            for (const raw of rawMessages) {
                const msg = new Message(fakeClient, raw as any);
                emitter.emit("msg", msg);
            }

            const heapAfter = process.memoryUsage().heapUsed;
            gc();
            const heapAfterGC = process.memoryUsage().heapUsed;

            // Garbage = total allocated - retained after GC = heapAfter - heapAfterGC
            const vGarbage = heapAfter - heapAfterGC;
            const vAllocated = heapAfter - heapBefore;
            console.log(`   Volundr TypedEmitter:`);
            console.log(`     Allocated:  ${formatBytes(Math.max(0, vAllocated))}`);
            console.log(`     Garbage:    ${formatBytes(Math.max(0, vGarbage))}`);
            console.log(`     [sink=${sink > 0}]`);
        }

        // Node.js EventEmitter pipeline
        {
            const emitter = new EventEmitter();
            const cache = new Collection<string, unknown>();
            let sink = 0;
            emitter.on("msg", (m: any) => { cache.set(m.id, m); });
            emitter.on("msg", (m: any) => { sink += m.content.length; });

            // Warmup
            for (const raw of rawMessages) emitter.emit("msg", raw);
            cache.clear();

            gc();
            const heapBefore = process.memoryUsage().heapUsed;

            for (const raw of rawMessages) {
                const msg = new Message(fakeClient, raw as any);
                emitter.emit("msg", msg);
            }

            const heapAfter = process.memoryUsage().heapUsed;
            gc();
            const heapAfterGC = process.memoryUsage().heapUsed;

            const nGarbage = heapAfter - heapAfterGC;
            const nAllocated = heapAfter - heapBefore;
            console.log(`   Node.js EventEmitter:`);
            console.log(`     Allocated:  ${formatBytes(Math.max(0, nAllocated))}`);
            console.log(`     Garbage:    ${formatBytes(Math.max(0, nGarbage))}`);
            console.log(`     [sink=${sink > 0}]`);
        }

        console.log();
    }

    console.log("=".repeat(60));
    console.log("  Target latencies for a healthy Discord bot:");
    console.log("  • Single emit: < 20 µs (p99)");
    console.log("  • Burst 20k:   < 500 ms total");
    console.log("  • _patch:      < 500 ns per call");
    console.log("=".repeat(60));
}

main().catch(console.error);
