import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { Logger } from "../src/Logger.js";
import { LogLevel } from "../src/LogLevel.js";
import { format } from "../src/Formatter.js";

describe("Logger", () => {
    let originalLog: typeof console.log;
    let originalWarn: typeof console.warn;
    let originalError: typeof console.error;

    let mockLog: ReturnType<typeof mock.fn>;
    let mockWarn: ReturnType<typeof mock.fn>;
    let mockError: ReturnType<typeof mock.fn>;

    beforeEach(() => {
        originalLog = console.log;
        originalWarn = console.warn;
        originalError = console.error;

        mockLog = mock.fn();
        mockWarn = mock.fn();
        mockError = mock.fn();

        console.log = mockLog;
        console.warn = mockWarn;
        console.error = mockError;

        // Reset to default level for each test
        Logger.setLevel(LogLevel.INFO);
    });

    afterEach(() => {
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
    });

    describe("getLogger", () => {
        it("should return cached instances for the same key", () => {
            const logger1 = Logger.getLogger("test", "cache");
            const logger2 = Logger.getLogger("test", "cache");
            assert.strictEqual(logger1, logger2);
        });

        it("should return different instances for different keys", () => {
            const logger1 = Logger.getLogger("ns", "a");
            const logger2 = Logger.getLogger("ns", "b");
            assert.notStrictEqual(logger1, logger2);
        });

        it("should return different instances for different namespaces", () => {
            const logger1 = Logger.getLogger("ns1", "comp");
            const logger2 = Logger.getLogger("ns2", "comp");
            assert.notStrictEqual(logger1, logger2);
        });
    });

    describe("setLevel / getLevel", () => {
        it("should set and retrieve the global log level", () => {
            Logger.setLevel(LogLevel.DEBUG);
            assert.equal(Logger.getLevel(), LogLevel.DEBUG);

            Logger.setLevel(LogLevel.ERROR);
            assert.equal(Logger.getLevel(), LogLevel.ERROR);
        });

        it("should default to INFO level", () => {
            // beforeEach resets to INFO
            assert.equal(Logger.getLevel(), LogLevel.INFO);
        });
    });

    describe("level filtering", () => {
        it("should suppress messages below the configured level", () => {
            Logger.setLevel(LogLevel.WARN);
            const logger = Logger.getLogger("test", "filtering");

            logger.trace("should not appear");
            logger.debug("should not appear");
            logger.info("should not appear");

            assert.equal(mockLog.mock.callCount(), 0);
            assert.equal(mockWarn.mock.callCount(), 0);
            assert.equal(mockError.mock.callCount(), 0);
        });

        it("should allow messages at or above the configured level", () => {
            Logger.setLevel(LogLevel.WARN);
            const logger = Logger.getLogger("test", "filtering-above");

            logger.warn("warning message");
            logger.error("error message");

            assert.equal(mockWarn.mock.callCount(), 1);
            assert.equal(mockError.mock.callCount(), 1);
        });

        it("should allow all messages at TRACE level", () => {
            Logger.setLevel(LogLevel.TRACE);
            const logger = Logger.getLogger("test", "all-levels");

            logger.trace("t");
            logger.debug("d");
            logger.info("i");
            logger.warn("w");
            logger.error("e");

            // trace, debug, info go to console.log
            assert.equal(mockLog.mock.callCount(), 3);
            assert.equal(mockWarn.mock.callCount(), 1);
            assert.equal(mockError.mock.callCount(), 1);
        });
    });

    describe("LogLevel.OFF", () => {
        it("should suppress all output", () => {
            Logger.setLevel(LogLevel.OFF);
            const logger = Logger.getLogger("test", "off");

            logger.trace("t");
            logger.debug("d");
            logger.info("i");
            logger.warn("w");
            logger.error("e");

            assert.equal(mockLog.mock.callCount(), 0);
            assert.equal(mockWarn.mock.callCount(), 0);
            assert.equal(mockError.mock.callCount(), 0);
        });
    });

    describe("console method routing", () => {
        it("should route trace to console.log", () => {
            Logger.setLevel(LogLevel.TRACE);
            const logger = Logger.getLogger("test", "route-trace");

            logger.trace("trace message");

            assert.equal(mockLog.mock.callCount(), 1);
            assert.equal(mockWarn.mock.callCount(), 0);
            assert.equal(mockError.mock.callCount(), 0);
        });

        it("should route debug to console.log", () => {
            Logger.setLevel(LogLevel.DEBUG);
            const logger = Logger.getLogger("test", "route-debug");

            logger.debug("debug message");

            assert.equal(mockLog.mock.callCount(), 1);
            assert.equal(mockWarn.mock.callCount(), 0);
            assert.equal(mockError.mock.callCount(), 0);
        });

        it("should route info to console.log", () => {
            const logger = Logger.getLogger("test", "route-info");

            logger.info("info message");

            assert.equal(mockLog.mock.callCount(), 1);
            assert.equal(mockWarn.mock.callCount(), 0);
            assert.equal(mockError.mock.callCount(), 0);
        });

        it("should route warn to console.warn", () => {
            const logger = Logger.getLogger("test", "route-warn");

            logger.warn("warn message");

            assert.equal(mockLog.mock.callCount(), 0);
            assert.equal(mockWarn.mock.callCount(), 1);
            assert.equal(mockError.mock.callCount(), 0);
        });

        it("should route error to console.error", () => {
            const logger = Logger.getLogger("test", "route-error");

            logger.error("error message");

            assert.equal(mockLog.mock.callCount(), 0);
            assert.equal(mockWarn.mock.callCount(), 0);
            assert.equal(mockError.mock.callCount(), 1);
        });

        it("should pass extra arguments through to console methods", () => {
            const logger = Logger.getLogger("test", "extra-args");
            const extraObj = { key: "value" };

            logger.info("msg", extraObj);

            assert.equal(mockLog.mock.callCount(), 1);
            const call = mockLog.mock.calls[0];
            assert.equal(call.arguments[1], extraObj);
        });
    });
});

describe("Formatter", () => {
    describe("format", () => {
        it("should produce output with all expected sections", () => {
            const result = format(LogLevel.INFO, "myns/mycomp", "hello world");

            // Should contain the level label
            assert.ok(result.includes("INFO"), "should include the level label INFO");

            // Should contain the namespace and component
            assert.ok(result.includes("myns"), "should include the namespace");
            assert.ok(result.includes("mycomp"), "should include the component");

            // Should contain the message
            assert.ok(result.includes("hello world"), "should include the message");

            // Should contain the pipe separator
            assert.ok(result.includes("|"), "should include the pipe separator");
        });

        it("should include correct level labels for each level", () => {
            const levels: [LogLevel, string][] = [
                [LogLevel.TRACE, "TRACE"],
                [LogLevel.DEBUG, "DEBUG"],
                [LogLevel.INFO, "INFO"],
                [LogLevel.WARN, "WARN"],
                [LogLevel.ERROR, "ERROR"],
            ];

            for (const [level, label] of levels) {
                const result = format(level, "ns/comp", "msg");
                assert.ok(result.includes(label), `should include label ${label} for level ${level}`);
            }
        });

        it("should include a timestamp in HH:MM:SS format", () => {
            const result = format(LogLevel.INFO, "ns/comp", "msg");

            // The timestamp is inside brackets; strip ANSI codes for matching
            const stripped = result.replace(/\x1b\[[0-9;]*m/g, "");
            // Match pattern: [HH:MM:SS]
            assert.match(stripped, /\[\d{2}:\d{2}:\d{2}\]/, "should contain a HH:MM:SS timestamp");
        });

        it("should separate namespace and component with /", () => {
            const result = format(LogLevel.INFO, "gateway/ShardManager", "test");
            // Strip ANSI codes
            const stripped = result.replace(/\x1b\[[0-9;]*m/g, "");
            assert.ok(
                stripped.includes("gateway") && stripped.includes("ShardManager"),
                "should contain both namespace and component"
            );
            assert.ok(stripped.includes("/"), "should contain the / separator");
        });
    });
});
