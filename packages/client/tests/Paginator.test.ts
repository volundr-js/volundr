import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { paginate, paginateAll } from "../src/utils/Paginator.js";

describe("Paginator", () => {
    function makeFetcher(total: number, pageSize: number) {
        const items = Array.from({ length: total }, (_, i) => ({
            id: String(i + 1),
            name: `item-${i + 1}`,
        }));

        return (opts: { limit: number; after?: string }) => {
            const afterIndex = opts.after ? items.findIndex((item) => item.id === opts.after) + 1 : 0;
            const page = items.slice(afterIndex, afterIndex + opts.limit);
            return Promise.resolve(page);
        };
    }

    describe("paginate", () => {
        it("should yield pages until all items are consumed", async () => {
            const pages: { id: string }[][] = [];
            for await (const page of paginate(makeFetcher(25, 10), { limit: 10 })) {
                pages.push(page);
            }
            assert.equal(pages.length, 3);
            assert.equal(pages[0]!.length, 10);
            assert.equal(pages[1]!.length, 10);
            assert.equal(pages[2]!.length, 5);
        });

        it("should yield single page for small results", async () => {
            const pages: { id: string }[][] = [];
            for await (const page of paginate(makeFetcher(3, 10), { limit: 10 })) {
                pages.push(page);
            }
            assert.equal(pages.length, 1);
            assert.equal(pages[0]!.length, 3);
        });

        it("should yield nothing for empty results", async () => {
            const pages: { id: string }[][] = [];
            for await (const page of paginate(makeFetcher(0, 10), { limit: 10 })) {
                pages.push(page);
            }
            assert.equal(pages.length, 0);
        });

        it("should respect after parameter", async () => {
            const pages: { id: string }[][] = [];
            for await (const page of paginate(makeFetcher(10, 100), { limit: 100, after: "5" })) {
                pages.push(page);
            }
            assert.equal(pages.length, 1);
            assert.equal(pages[0]![0]!.id, "6");
            assert.equal(pages[0]!.length, 5);
        });
    });

    describe("paginateAll", () => {
        it("should collect all pages into a flat array", async () => {
            const all = await paginateAll(makeFetcher(25, 10), { limit: 10 });
            assert.equal(all.length, 25);
            assert.equal(all[0]!.id, "1");
            assert.equal(all[24]!.id, "25");
        });

        it("should return empty array for no results", async () => {
            const all = await paginateAll(makeFetcher(0, 10), { limit: 10 });
            assert.equal(all.length, 0);
        });

        it("should default limit to 100", async () => {
            const all = await paginateAll(makeFetcher(50, 100));
            assert.equal(all.length, 50);
        });
    });
});
