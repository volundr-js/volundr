import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildFormData } from "../src/FormDataBuilder.js";

describe("buildFormData", () => {
    it("should create FormData with payload_json", () => {
        const form = buildFormData({ content: "hello" }, []);
        assert.ok(form instanceof FormData);
        assert.ok(form.has("payload_json"));
    });

    it("should include files as files[n]", () => {
        const form = buildFormData({ content: "hi" }, [
            { name: "test.txt", data: Buffer.from("content"), contentType: "text/plain" },
        ]);
        assert.ok(form.has("payload_json"));
        assert.ok(form.has("files[0]"));
    });

    it("should handle multiple files", () => {
        const form = buildFormData({}, [
            { name: "a.txt", data: Buffer.from("aaa") },
            { name: "b.png", data: new Uint8Array([1, 2, 3]) },
            { name: "c.json", data: Buffer.from("{}"), contentType: "application/json" },
        ]);
        assert.ok(form.has("files[0]"));
        assert.ok(form.has("files[1]"));
        assert.ok(form.has("files[2]"));
    });

    it("should handle Blob data directly", () => {
        const blob = new Blob(["hello"], { type: "text/plain" });
        const form = buildFormData({ content: "test" }, [
            { name: "blob.txt", data: blob },
        ]);
        assert.ok(form.has("files[0]"));
    });

    it("should serialize JSON body in payload_json", () => {
        const body = { content: "hello", embeds: [{ title: "test" }] };
        const form = buildFormData(body, [
            { name: "file.txt", data: Buffer.from("data") },
        ]);
        const payloadJson = form.get("payload_json");
        assert.ok(payloadJson !== null);
    });
});
