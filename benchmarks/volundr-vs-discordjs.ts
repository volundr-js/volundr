/**
 * Benchmark: Volundr vs discord.js
 *
 * Measures:
 *  1. Import time
 *  2. Memory after import
 *  3. Client instantiation
 *  4. Entity creation throughput (simulated GUILD_CREATE processing)
 *  5. Collection operations
 *
 * Run: npx tsx benchmarks/volundr-vs-discordjs.ts
 */

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getMemoryMB(): number {
    return process.memoryUsage().heapUsed / (1024 * 1024);
}

function median(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// --- Fake Discord API data generators ---

function fakeUser(id: string) {
    return {
        id,
        username: `user_${id}`,
        discriminator: "0",
        avatar: null,
        global_name: `User ${id}`,
    };
}

function fakeMember(userId: string) {
    return {
        user: fakeUser(userId),
        nick: null,
        roles: ["111111111111111111", "222222222222222222"],
        joined_at: "2024-01-01T00:00:00.000Z",
        deaf: false,
        mute: false,
    };
}

function fakeRole(id: string) {
    return {
        id,
        name: `role_${id}`,
        color: 0xFF0000,
        hoist: false,
        position: 1,
        permissions: "2147483647",
        managed: false,
        mentionable: false,
    };
}

function fakeChannel(id: string, guildId: string) {
    return {
        id,
        type: 0,
        guild_id: guildId,
        name: `channel_${id}`,
        position: 0,
        permission_overwrites: [],
        topic: null,
        nsfw: false,
        last_message_id: null,
        rate_limit_per_user: 0,
    };
}

function fakeGuild(memberCount: number) {
    const guildId = "999999999999999999";
    const members = Array.from({ length: memberCount }, (_, i) =>
        fakeMember(String(100000000000000000n + BigInt(i)))
    );
    const roles = Array.from({ length: 20 }, (_, i) =>
        fakeRole(String(300000000000000000n + BigInt(i)))
    );
    const channels = Array.from({ length: 50 }, (_, i) =>
        fakeChannel(String(400000000000000000n + BigInt(i)), guildId)
    );

    return {
        id: guildId,
        name: "Benchmark Guild",
        icon: null,
        splash: null,
        owner_id: members[0].user.id,
        region: "us-east",
        afk_channel_id: null,
        afk_timeout: 300,
        verification_level: 0,
        default_message_notifications: 0,
        explicit_content_filter: 0,
        roles,
        emojis: [],
        features: [],
        mfa_level: 0,
        system_channel_id: null,
        system_channel_flags: 0,
        rules_channel_id: null,
        vanity_url_code: null,
        description: null,
        banner: null,
        premium_tier: 0,
        premium_subscription_count: 0,
        preferred_locale: "en-US",
        public_updates_channel_id: null,
        nsfw_level: 0,
        stickers: [],
        members,
        channels,
        threads: [],
        presences: [],
        voice_states: [],
        stage_instances: [],
        guild_scheduled_events: [],
    };
}

function fakeMessage(id: string, channelId: string, authorId: string) {
    return {
        id,
        channel_id: channelId,
        author: fakeUser(authorId),
        content: `Message ${id} content here with some text to simulate real messages.`,
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

// ─────────────────────────────────────────────────────

async function main() {
    console.log("=".repeat(60));
    console.log("  Volundr vs discord.js — Performance Benchmark");
    console.log("=".repeat(60));
    console.log();

    // Force GC if available
    const gc = globalThis.gc ?? (() => {});

    // ── 1. Import time ──

    gc();
    const memBefore = getMemoryMB();

    const t0v = performance.now();
    const volundr = await import("../packages/client/src/index.js");
    const { GatewayIntents } = await import("../packages/gateway/src/index.js");
    const t1v = performance.now();

    gc();
    const memAfterVolundr = getMemoryMB();

    const t0d = performance.now();
    const djs = await import("discord.js");
    const t1d = performance.now();

    gc();
    const memAfterDjs = getMemoryMB();

    console.log("1. IMPORT TIME");
    console.log(`   Volundr:    ${(t1v - t0v).toFixed(1)} ms`);
    console.log(`   discord.js: ${(t1d - t0d).toFixed(1)} ms`);
    console.log();

    console.log("2. MEMORY AFTER IMPORT");
    console.log(`   Volundr:    +${(memAfterVolundr - memBefore).toFixed(2)} MB`);
    console.log(`   discord.js: +${(memAfterDjs - memAfterVolundr).toFixed(2)} MB`);
    console.log();

    // ── 3. Client instantiation ──

    const INSTANTIATION_ROUNDS = 1000;
    const vTimes: number[] = [];
    const dTimes: number[] = [];

    for (let i = 0; i < INSTANTIATION_ROUNDS; i++) {
        const s = performance.now();
        const c = new volundr.Client({
            token: "fake-token",
            intents: GatewayIntents.Guilds | GatewayIntents.GuildMessages,
        });
        vTimes.push(performance.now() - s);
    }

    for (let i = 0; i < INSTANTIATION_ROUNDS; i++) {
        const s = performance.now();
        const c = new djs.Client({
            intents: [djs.GatewayIntentBits.Guilds, djs.GatewayIntentBits.GuildMessages],
        });
        dTimes.push(performance.now() - s);
    }

    console.log(`3. CLIENT INSTANTIATION (median of ${INSTANTIATION_ROUNDS})`);
    console.log(`   Volundr:    ${median(vTimes).toFixed(3)} ms`);
    console.log(`   discord.js: ${median(dTimes).toFixed(3)} ms`);
    console.log();

    // ── 4. Collection operations ──
    // Interleaved rounds to eliminate JIT/order bias — both libs run each round

    const COLLECTION_SIZE = 100_000;
    const WARMUP_ROUNDS = 5;
    const MEASURE_ROUNDS = 7;

    // Prepare collections for lookup/filter
    const vCol = new volundr.Collection<string, { id: string; name: string }>();
    const dCol = new djs.Collection<string, { id: string; name: string }>();
    for (let i = 0; i < COLLECTION_SIZE; i++) {
        const item = { id: String(i), name: `item_${i}` };
        vCol.set(String(i), item);
        dCol.set(String(i), item);
    }

    // Test functions
    const insertV = () => {
        const c = new volundr.Collection<string, { id: string; name: string }>();
        for (let i = 0; i < COLLECTION_SIZE; i++) c.set(String(i), { id: String(i), name: `item_${i}` });
    };
    const insertD = () => {
        const c = new djs.Collection<string, { id: string; name: string }>();
        for (let i = 0; i < COLLECTION_SIZE; i++) c.set(String(i), { id: String(i), name: `item_${i}` });
    };
    const lookupV = () => { for (let i = 0; i < COLLECTION_SIZE; i++) vCol.get(String(i)); };
    const lookupD = () => { for (let i = 0; i < COLLECTION_SIZE; i++) dCol.get(String(i)); };
    const filterV = () => { vCol.filter((_, k) => parseInt(k) % 2 === 0); };
    const filterD = () => { dCol.filter((_, k) => parseInt(k) % 2 === 0); };

    function benchInterleaved(fnA: () => void, fnB: () => void): [number, number] {
        // Shared warmup — interleaved so both JIT equally
        for (let w = 0; w < WARMUP_ROUNDS; w++) { fnA(); fnB(); }

        const timesA: number[] = [];
        const timesB: number[] = [];
        for (let r = 0; r < MEASURE_ROUNDS; r++) {
            gc(); // Clean heap between rounds
            // Alternate who goes first each round to eliminate ordering bias
            if (r % 2 === 0) {
                let s = performance.now(); fnA(); timesA.push(performance.now() - s);
                gc();
                s = performance.now(); fnB(); timesB.push(performance.now() - s);
            } else {
                let s = performance.now(); fnB(); timesB.push(performance.now() - s);
                gc();
                s = performance.now(); fnA(); timesA.push(performance.now() - s);
            }
        }
        return [median(timesA), median(timesB)];
    }

    const [vInsertTime, dInsertTime] = benchInterleaved(insertV, insertD);
    const [vLookupTime, dLookupTime] = benchInterleaved(lookupV, lookupD);
    const [vFilterTime, dFilterTime] = benchInterleaved(filterV, filterD);

    console.log(`4. COLLECTION OPS (${(COLLECTION_SIZE / 1000).toFixed(0)}k items, median of ${MEASURE_ROUNDS} interleaved rounds + ${WARMUP_ROUNDS} warmup)`);
    console.log(`   Insert ${COLLECTION_SIZE.toLocaleString()}:`);
    console.log(`     Volundr:    ${vInsertTime.toFixed(1)} ms`);
    console.log(`     discord.js: ${dInsertTime.toFixed(1)} ms`);
    console.log(`   Lookup ${COLLECTION_SIZE.toLocaleString()}:`);
    console.log(`     Volundr:    ${vLookupTime.toFixed(1)} ms`);
    console.log(`     discord.js: ${dLookupTime.toFixed(1)} ms`);
    console.log(`   Filter (50%):`);
    console.log(`     Volundr:    ${vFilterTime.toFixed(1)} ms`);
    console.log(`     discord.js: ${dFilterTime.toFixed(1)} ms`);
    console.log();

    // ── 5. Simulated GUILD_CREATE with many members ──
    // Uses interleaved rounds to eliminate JIT/GC order bias

    const MEMBER_COUNTS = [100, 1_000, 10_000, 100_000];
    const GUILD_WARMUP = 3;
    const GUILD_ROUNDS = 5;

    console.log(`5. GUILD_CREATE SIMULATION (median of ${GUILD_ROUNDS} interleaved rounds + ${GUILD_WARMUP} warmup)`);

    for (const count of MEMBER_COUNTS) {
        const guild = fakeGuild(count);
        const rawJson = JSON.stringify(guild);

        const processGuildV = () => {
            const parsed = JSON.parse(rawJson);
            const users = new volundr.Collection<string, { id: string }>();
            const members = new volundr.Collection<string, { userId: string }>();
            for (const m of parsed.members) {
                users.set(m.user.id, m.user);
                members.set(m.user.id, { userId: m.user.id, ...m });
            }
            const roles = new volundr.Collection<string, unknown>();
            for (const r of parsed.roles) roles.set(r.id, r);
            const channels = new volundr.Collection<string, unknown>();
            for (const ch of parsed.channels) channels.set(ch.id, ch);
        };

        const processGuildD = () => {
            const parsed = JSON.parse(rawJson);
            const users = new djs.Collection<string, { id: string }>();
            const members = new djs.Collection<string, { userId: string }>();
            for (const m of parsed.members) {
                users.set(m.user.id, m.user);
                members.set(m.user.id, { userId: m.user.id, ...m });
            }
            const roles = new djs.Collection<string, unknown>();
            for (const r of parsed.roles) roles.set(r.id, r);
            const channels = new djs.Collection<string, unknown>();
            for (const ch of parsed.channels) channels.set(ch.id, ch);
        };

        // Warmup — interleaved
        for (let w = 0; w < GUILD_WARMUP; w++) { processGuildV(); processGuildD(); }

        const vTimes: number[] = [];
        const dTimes: number[] = [];
        for (let r = 0; r < GUILD_ROUNDS; r++) {
            gc();
            if (r % 2 === 0) {
                let s = performance.now(); processGuildV(); vTimes.push(performance.now() - s);
                gc();
                s = performance.now(); processGuildD(); dTimes.push(performance.now() - s);
            } else {
                let s = performance.now(); processGuildD(); dTimes.push(performance.now() - s);
                gc();
                s = performance.now(); processGuildV(); vTimes.push(performance.now() - s);
            }
        }

        console.log(`   ${count.toLocaleString()} members:`);
        console.log(`     Volundr:    ${median(vTimes).toFixed(1)} ms`);
        console.log(`     discord.js: ${median(dTimes).toFixed(1)} ms`);
    }
    console.log();

    // ── 6. Message throughput ──
    // Interleaved rounds for fairness

    const MSG_COUNT = 100_000;
    const MSG_WARMUP = 3;
    const MSG_ROUNDS = 5;
    const messages = Array.from({ length: MSG_COUNT }, (_, i) =>
        JSON.stringify(fakeMessage(String(500000000000000000n + BigInt(i)), "400000000000000000", "100000000000000000"))
    );

    const processMsgsV = () => {
        const cache = new volundr.Collection<string, unknown>();
        for (const raw of messages) {
            const msg = JSON.parse(raw);
            cache.set(msg.id, msg);
        }
    };
    const processMsgsD = () => {
        const cache = new djs.Collection<string, unknown>();
        for (const raw of messages) {
            const msg = JSON.parse(raw);
            cache.set(msg.id, msg);
        }
    };

    // Warmup
    for (let w = 0; w < MSG_WARMUP; w++) { processMsgsV(); processMsgsD(); }

    const vMsgTimes: number[] = [];
    const dMsgTimes: number[] = [];
    for (let r = 0; r < MSG_ROUNDS; r++) {
        gc();
        if (r % 2 === 0) {
            let s = performance.now(); processMsgsV(); vMsgTimes.push(performance.now() - s);
            gc();
            s = performance.now(); processMsgsD(); dMsgTimes.push(performance.now() - s);
        } else {
            let s = performance.now(); processMsgsD(); dMsgTimes.push(performance.now() - s);
            gc();
            s = performance.now(); processMsgsV(); vMsgTimes.push(performance.now() - s);
        }
    }

    const vMsgTime = median(vMsgTimes);
    const dMsgTime = median(dMsgTimes);

    console.log(`6. MESSAGE THROUGHPUT (${(MSG_COUNT / 1000).toFixed(0)}k msgs, median of ${MSG_ROUNDS} interleaved rounds + ${MSG_WARMUP} warmup)`);
    console.log(`   Volundr:    ${vMsgTime.toFixed(1)} ms (${Math.round(MSG_COUNT / (vMsgTime / 1000)).toLocaleString()} msg/s)`);
    console.log(`   discord.js: ${dMsgTime.toFixed(1)} ms (${Math.round(MSG_COUNT / (dMsgTime / 1000)).toLocaleString()} msg/s)`);
    console.log();

    // ── 7. Event emit throughput ──
    // Compares Volundr's zero-garbage TypedEmitter vs Node.js EventEmitter

    const { TypedEmitter } = await import("../packages/types/src/TypedEmitter.js");
    const { EventEmitter } = await import("node:events");

    const EMIT_COUNT = 1_000_000;
    const EMIT_WARMUP = 3;
    const EMIT_ROUNDS = 7;
    const payload = { id: "123", content: "hello", type: 0 };

    // Volundr TypedEmitter — zero-garbage
    const vEmitter = new TypedEmitter<{ msg: typeof payload }>();
    let vSink = 0;
    vEmitter.on("msg", (d) => { vSink += d.type; });
    vEmitter.on("msg", (d) => { vSink += d.content.length; });

    // Node.js EventEmitter (what discord.js uses)
    const nEmitter = new EventEmitter();
    let nSink = 0;
    nEmitter.on("msg", (d: typeof payload) => { nSink += d.type; });
    nEmitter.on("msg", (d: typeof payload) => { nSink += d.content.length; });

    const emitV = () => { for (let i = 0; i < EMIT_COUNT; i++) vEmitter.emit("msg", payload); };
    const emitN = () => { for (let i = 0; i < EMIT_COUNT; i++) nEmitter.emit("msg", payload); };

    const [vEmitTime, nEmitTime] = benchInterleaved(emitV, emitN);

    console.log(`7. EVENT EMIT (${(EMIT_COUNT / 1_000_000).toFixed(0)}M emits × 2 listeners, median of ${EMIT_ROUNDS} interleaved + ${EMIT_WARMUP} warmup)`);
    console.log(`   Volundr TypedEmitter:  ${vEmitTime.toFixed(1)} ms (${Math.round(EMIT_COUNT / (vEmitTime / 1000)).toLocaleString()} emit/s)`);
    console.log(`   Node.js EventEmitter:  ${nEmitTime.toFixed(1)} ms (${Math.round(EMIT_COUNT / (nEmitTime / 1000)).toLocaleString()} emit/s)`);
    console.log(`   ${vSink > 0 && nSink > 0 ? "" : ""}`); // prevent dead code elimination
    console.log();

    // ── 8. Final memory ──

    gc();
    const finalMem = process.memoryUsage();
    console.log("8. FINAL MEMORY");
    console.log(`   Heap used:  ${formatBytes(finalMem.heapUsed)}`);
    console.log(`   Heap total: ${formatBytes(finalMem.heapTotal)}`);
    console.log(`   RSS:        ${formatBytes(finalMem.rss)}`);
    console.log();
    console.log("=".repeat(60));
    console.log("  NOTE: Collection ops are similar since both extend Map.");
    console.log("  The real difference is in import size, entity overhead,");
    console.log("  and runtime allocations during event processing.");
    console.log("=".repeat(60));
}

main().catch(console.error);
