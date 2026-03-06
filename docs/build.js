#!/usr/bin/env node

// Builds index.html from shell.html + pages/*.html
// Run: node docs/build.js

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(__dirname, "pages");

// Read shell
const shell = readFileSync(join(__dirname, "shell.html"), "utf-8");

// Page order (matches sidebar)
const pageOrder = [
    "introduction", "quick-start",
    "creating-a-bot", "full-example", "events", "sending-messages",
    "slash-commands", "components", "collectors", "voice", "error-handling",
    "caching", "sweepers", "sharding", "performance", "migration",
    "pkg-client", "pkg-gateway", "pkg-rest",
    "pkg-voice", "pkg-lavalink", "pkg-types", "pkg-threads", "pkg-logger",
    "api-reference",
];

// Verify all files exist
const available = new Set(readdirSync(pagesDir).filter(f => f.endsWith(".html")).map(f => f.replace(".html", "")));
const pageIds = pageOrder.filter(id => {
    if (!available.has(id)) {
        console.warn(`Warning: pages/${id}.html not found, skipping`);
        return false;
    }
    return true;
});

// Build page divs
const pageDivs = pageIds.map(id => {
    const content = readFileSync(join(pagesDir, `${id}.html`), "utf-8").trimEnd();
    const isFirst = id === "introduction";
    return `        <div class="page${isFirst ? " active" : ""}" id="${id}">\n${indent(content, 12)}\n        </div>`;
}).join("\n\n");

// Replace placeholder in shell
const output = shell.replace("<!-- PAGES -->", pageDivs);

writeFileSync(join(__dirname, "index.html"), output);
console.log(`Built index.html with ${pageIds.length} pages`);

function indent(text, spaces) {
    const pad = " ".repeat(spaces);
    let inPre = false;
    return text.split("\n").map(line => {
        if (!inPre && line.includes("<pre>")) inPre = true;
        const out = (!inPre && line) ? pad + line : line;
        if (inPre && line.includes("</pre>")) inPre = false;
        return out;
    }).join("\n");
}
