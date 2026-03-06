// ---- Theme toggle ----

const themeToggle = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
    themeToggle.textContent = savedTheme === "light" ? "☾" : "☀";
}

themeToggle.addEventListener("click", () => {
    document.body.classList.add("theme-transition");
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    const next = isLight ? "dark" : "light";
    if (next === "dark") {
        document.documentElement.removeAttribute("data-theme");
    } else {
        document.documentElement.setAttribute("data-theme", "light");
    }
    themeToggle.textContent = next === "light" ? "☾" : "☀";
    localStorage.setItem("theme", next);
    setTimeout(() => document.body.classList.remove("theme-transition"), 350);
});


// ---- Navigation ----

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const toggle = document.querySelector(".menu-toggle");
const links = document.querySelectorAll(".sidebar-link");
const pages = document.querySelectorAll(".page");

function navigate(pageId, scrollTo) {
    pages.forEach(p => p.classList.remove("active"));
    links.forEach(l => l.classList.remove("active"));

    const page = document.getElementById(pageId);
    const link = document.querySelector(`.sidebar-link[data-page="${pageId}"]`);

    if (page) page.classList.add("active");
    if (link) link.classList.add("active");

    // Close mobile sidebar
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("open");

    // Scroll
    if (scrollTo) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const el = page?.querySelector(`[data-search-id="${CSS.escape(scrollTo)}"]`);
            if (el) {
                el.scrollIntoView({ block: "start" });
                return;
            }
            window.scrollTo(0, 0);
        }));
    } else {
        window.scrollTo(0, 0);
    }

    history.replaceState(null, "", `#${pageId}`);
}

// Sidebar link clicks
links.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        navigate(link.dataset.page);
    });
});

// Brand click
document.querySelector(".brand").addEventListener("click", (e) => {
    e.preventDefault();
    navigate("introduction");
});

// Mobile toggle
toggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    sidebarOverlay.classList.toggle("open");
});

sidebarOverlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("open");
});

// Handle initial hash
const hash = location.hash.slice(1);
if (hash && document.getElementById(hash)) {
    navigate(hash);
}


// ---- Search ----

const searchOverlay = document.getElementById("search-overlay");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const searchTrigger = document.getElementById("search-trigger");
let activeIndex = -1;

// Build search index on load
const searchIndex = [];

function buildIndex() {
    // Index sidebar pages
    links.forEach(link => {
        searchIndex.push({
            title: link.textContent.trim(),
            section: "Page",
            page: link.dataset.page,
            anchor: null,
        });
    });

    // Index headings inside each page
    pages.forEach(page => {
        const pageId = page.id;
        const pageName = document.querySelector(`.sidebar-link[data-page="${pageId}"]`)?.textContent.trim() || pageId;

        page.querySelectorAll("h2, h3").forEach(h => {
            const text = h.textContent.trim();
            if (!text) return;

            const anchorId = `s-${pageId}-${text.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;
            h.setAttribute("data-search-id", anchorId);

            searchIndex.push({
                title: text,
                section: pageName,
                page: pageId,
                anchor: anchorId,
            });
        });

        // Index code elements in tables
        page.querySelectorAll("td:first-child > code:first-child").forEach(code => {
            const text = code.textContent.trim();
            if (!text || text.length < 2) return;

            const table = code.closest("table");
            if (!table) return;

            let sectionName = pageName;
            let anchorId = null;

            const allHeadings = page.querySelectorAll("h2, h3");
            for (let i = allHeadings.length - 1; i >= 0; i--) {
                const h = allHeadings[i];
                if (table.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_PRECEDING) {
                    sectionName = h.textContent.trim();
                    anchorId = h.getAttribute("data-search-id");
                    break;
                }
            }

            searchIndex.push({
                title: text,
                section: sectionName,
                page: pageId,
                anchor: anchorId,
            });
        });
    });
}

buildIndex();

// Search functions
function openSearch() {
    searchOverlay.classList.add("open");
    searchInput.value = "";
    searchInput.focus();
    activeIndex = -1;
    renderResults("");
}

function closeSearch() {
    searchOverlay.classList.remove("open");
    searchInput.value = "";
    searchResults.innerHTML = "";
}

function renderResults(query) {
    if (!query) {
        const popular = searchIndex.filter(e => e.section === "Page");
        searchResults.innerHTML = popular.map((r, i) =>
            `<div class="search-result${i === 0 ? " active" : ""}" data-idx="${i}">
                <span class="search-result-title">${esc(r.title)}</span>
                <span class="search-result-section">${esc(r.section)}</span>
            </div>`
        ).join("");
        activeIndex = 0;
        searchResults._results = popular;
        bindResultClicks();
        return;
    }

    const q = query.toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);

    const scored = [];
    for (const entry of searchIndex) {
        const t = entry.title.toLowerCase();
        let score = 0;
        let allMatch = true;

        for (const term of terms) {
            if (t.includes(term)) {
                score += 10;
                if (t.startsWith(term)) score += 5;
                if (t === term) score += 10;
            } else if (entry.section.toLowerCase().includes(term)) {
                score += 2;
            } else {
                allMatch = false;
                break;
            }
        }

        if (!allMatch) continue;
        if (t.startsWith(q)) score += 20;
        if (t.length > 40) score -= 2;
        if (entry.section === "Page") score += 3;

        scored.push({ ...entry, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, 12);

    if (results.length === 0) {
        searchResults.innerHTML = `<div class="search-empty">No results for "${esc(query)}"</div>`;
        activeIndex = -1;
        return;
    }

    searchResults.innerHTML = results.map((r, i) =>
        `<div class="search-result${i === 0 ? " active" : ""}" data-idx="${i}">
            <span class="search-result-title">${highlight(r.title, terms)}</span>
            <span class="search-result-section">${esc(r.section)}</span>
        </div>`
    ).join("");

    activeIndex = 0;
    bindResultClicks();
    searchResults._results = results;
}

function highlight(text, terms) {
    let html = esc(text);
    for (const term of terms) {
        const re = new RegExp(`(${escRegex(term)})`, "gi");
        html = html.replace(re, "<mark>$1</mark>");
    }
    return html;
}

function selectResult(idx) {
    const items = searchResults.querySelectorAll(".search-result");
    items.forEach(el => el.classList.remove("active"));
    if (items[idx]) {
        items[idx].classList.add("active");
        items[idx].scrollIntoView({ block: "nearest" });
    }
    activeIndex = idx;
}

function confirmResult() {
    const results = searchResults._results ||
        searchIndex.filter(e => e.section === "Page").slice(0, 8);
    const r = results[activeIndex];
    if (!r) return;

    closeSearch();
    navigate(r.page, r.anchor);
}

function bindResultClicks() {
    searchResults.querySelectorAll(".search-result").forEach(el => {
        el.addEventListener("click", () => {
            activeIndex = parseInt(el.dataset.idx);
            confirmResult();
        });
        el.addEventListener("mouseenter", () => {
            selectResult(parseInt(el.dataset.idx));
        });
    });
}

// Helpers
function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
}

function escRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Event listeners
searchTrigger.addEventListener("click", openSearch);

searchOverlay.addEventListener("click", (e) => {
    if (e.target === searchOverlay) closeSearch();
});

searchInput.addEventListener("input", () => {
    renderResults(searchInput.value.trim());
});

searchInput.addEventListener("keydown", (e) => {
    const items = searchResults.querySelectorAll(".search-result");
    const count = items.length;

    if (e.key === "ArrowDown") {
        e.preventDefault();
        selectResult((activeIndex + 1) % count);
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectResult((activeIndex - 1 + count) % count);
    } else if (e.key === "Enter") {
        e.preventDefault();
        confirmResult();
    } else if (e.key === "Escape") {
        closeSearch();
    }
});

// Global Ctrl+K
document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (searchOverlay.classList.contains("open")) {
            closeSearch();
        } else {
            openSearch();
        }
    }
});


// ---- Syntax highlighting (Prism.js) ----

if (typeof Prism !== "undefined") {
    Prism.highlightAll();
} else {
    document.addEventListener("DOMContentLoaded", () => {
        if (typeof Prism !== "undefined") Prism.highlightAll();
    });
    window.addEventListener("load", () => {
        if (typeof Prism !== "undefined") Prism.highlightAll();
    });
}


// ---- Copy buttons ----

document.querySelectorAll("pre > code").forEach(code => {
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.addEventListener("click", () => {
        navigator.clipboard.writeText(code.textContent).then(() => {
            btn.textContent = "Copied!";
            btn.classList.add("copied");
            setTimeout(() => {
                btn.textContent = "Copy";
                btn.classList.remove("copied");
            }, 1500);
        });
    });
    code.parentElement.appendChild(btn);
});


// ---- Heading anchors ----

document.querySelectorAll(".page h2[data-search-id], .page h3[data-search-id]").forEach(h => {
    const a = document.createElement("a");
    a.className = "heading-anchor";
    a.textContent = "#";
    a.href = "javascript:void(0)";
    a.addEventListener("click", () => {
        h.scrollIntoView({ block: "start" });
    });
    h.prepend(a);
});


// ---- Back to top ----

const backToTop = document.getElementById("back-to-top");
window.addEventListener("scroll", () => {
    backToTop.classList.toggle("visible", window.scrollY > 400);
}, { passive: true });
backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});
