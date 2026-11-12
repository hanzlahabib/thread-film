// Renders demo-screens/*.html to public/captures/<screen>-<theme>.png (1920x1080 @2x)
// and measures every [data-anchor] element into demo-screens/anchors.json + anchors.md.
//
//   pnpm run render:screens                 # the Fernwick screens
//   pnpm run render:screens -- order        # one screen
//   pnpm run render:screens -- --set mobile # the Dayfold phone screens: demo-screens/mobile/*.html at 390x844 @3
//                                           #   -> public/captures/mobile/<screen>-<theme>.png and
//                                           #   src/film/mobile/anchors.json (anchors and the text rectangles of each screen)
//   CHROME_PATH=/path/to/chrome pnpm run render:screens
//
// Edit the HTML (or add your own screen + data-anchor attributes), then re-run.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// A set is a folder of screens, how it is captured and where its measurements go. `text` also writes the
// rectangle of every line of text (for label placement); the Fernwick set keeps its anchors file as it was.
const SETS = {
  fernwick: { src: join(ROOT, "demo-screens"), out: join(ROOT, "public", "captures"), viewport: { width: 1920, height: 1080, deviceScaleFactor: 2 }, json: join(ROOT, "demo-screens", "anchors.json"), md: join(ROOT, "demo-screens", "anchors.md"), text: false },
  mobile: { src: join(ROOT, "demo-screens", "mobile"), out: join(ROOT, "public", "captures", "mobile"), viewport: { width: 390, height: 844, deviceScaleFactor: 3 }, json: join(ROOT, "src", "film", "mobile", "anchors.json"), md: join(ROOT, "demo-screens", "mobile", "anchors.md"), text: true },
};
const THEMES = ["dark", "light"];
// Distance of the gutter landing point from the element edge: far enough to sit
// in the whitespace around the element, close enough that the line stays short.
const GUTTER_GAP = 18;
// How far beyond the gutter we look for text when reporting the free run.
const CLEAR_PROBE = 240;

function findChrome() {
  const env = process.env.CHROME_PATH;
  if (env) return env;
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  const hit = candidates.find((p) => existsSync(p));
  if (hit) return hit;
  // Remotion's own browser (pnpm exec remotion browser ensure).
  const rem = join(ROOT, "node_modules", ".remotion");
  if (existsSync(rem)) {
    for (const d of readdirSync(rem)) {
      for (const bin of ["chrome-headless-shell", "chrome"]) {
        const p = join(rem, d, bin);
        if (existsSync(p) && statSync(p).isFile()) return p;
      }
    }
  }
  throw new Error("No Chrome found. Set CHROME_PATH or run: pnpm exec remotion browser ensure");
}

// Runs in the page: measures anchors and picks a text-free gutter point for each.
function measure({ gap, probe, width, height, withText }) {
  const textRects = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const r = document.createRange();
    r.selectNodeContents(n);
    for (const b of r.getClientRects()) {
      if (b.width > 0 && b.height > 0) textRects.push({ node: n, x: b.left, y: b.top, w: b.width, h: b.height });
    }
  }
  const hitsText = (px, py, own, pad) =>
    textRects.some((t) => !own.contains(t.node) && px > t.x - pad && px < t.x + t.w + pad && py > t.y - pad && py < t.y + t.h + pad);

  const dirs = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };
  const out = {};
  const dupes = [];
  for (const el of document.querySelectorAll("[data-anchor]")) {
    const name = el.dataset.anchor;
    if (out[name]) dupes.push(name);
    const b = el.getBoundingClientRect();
    const rect = { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) };
    const edgeAt = (s) =>
      s === "left" ? [b.left, b.top + b.height / 2]
      : s === "right" ? [b.right, b.top + b.height / 2]
      : s === "top" ? [b.left + b.width / 2, b.top]
      : [b.left + b.width / 2, b.bottom];
    const pref = el.dataset.side;
    const order = [pref, "right", "left", "top", "bottom"].filter((s, i, a) => s && a.indexOf(s) === i);
    let chosen = null;
    for (const side of order) {
      const [ex, ey] = edgeAt(side);
      const [dx, dy] = dirs[side];
      const gx = ex + dx * gap, gy = ey + dy * gap;
      if (gx < 8 || gx > width - 8 || gy < 8 || gy > height - 8) continue;
      let ok = true;
      for (let d = 0; d <= gap; d += 3) if (hitsText(ex + dx * d, ey + dy * d, el, 3)) ok = false;
      if (hitsText(gx, gy, el, 6)) ok = false;
      if (!ok) continue;
      let run = 0;
      while (run < probe && !hitsText(gx + dx * run, gy + dy * run, el, 4)) run += 4;
      chosen = { side, edge: { x: Math.round(ex), y: Math.round(ey) }, gutter: { x: Math.round(gx), y: Math.round(gy) }, clearRun: run, preferred: side === pref };
      break;
    }
    const label = (el.innerText || "").replace(/\s*\n\s*/g, " / ").trim().slice(0, 48);
    out[name] = { label, rect, ...(chosen ?? { side: null, edge: null, gutter: null, clearRun: 0, preferred: false }) };
  }
  const text = withText
    ? textRects.filter((t) => t.x + t.w > 0 && t.y + t.h > 0 && t.x < width && t.y < height).map((t) => ({ x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.w), h: Math.round(t.h) }))
    : undefined;
  return { anchors: out, dupes, text };
}

async function main() {
  const args = process.argv.slice(2);
  const setName = args.includes("--set") ? args[args.indexOf("--set") + 1] : "fernwick";
  const set = SETS[setName];
  if (!set) throw new Error(`Unknown set "${setName}". Known: ${Object.keys(SETS).join(", ")}`);
  const { src: SRC, out: OUT, viewport: VIEWPORT } = set;
  const only = args.filter((a, i) => !a.startsWith("-") && args[i - 1] !== "--set");
  const screens = readdirSync(SRC)
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(/\.html$/, ""))
    .filter((n) => !only.length || only.includes(n));
  mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ["--no-sandbox", "--hide-scrollbars", "--font-render-hinting=none"] });
  const result = {};
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    for (const name of screens) {
      const per = {};
      for (const theme of THEMES) {
        await page.goto(pathToFileURL(join(SRC, `${name}.html`)).href, { waitUntil: "load" });
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await page.evaluate(() => document.fonts.ready);
        per[theme] = await page.evaluate(measure, { gap: GUTTER_GAP, probe: CLEAR_PROBE, width: VIEWPORT.width, height: VIEWPORT.height, withText: set.text });
        if (per[theme].dupes.length) console.warn(`${name}: duplicate anchors ${per[theme].dupes.join(", ")}`);
        const file = join(OUT, `${name}-${theme}.png`);
        await page.screenshot({ path: file, type: "png" });
        console.log("wrote", file);
      }
      // Layout is theme-independent; keep the dark measurement as the source of truth.
      for (const [k, v] of Object.entries(per.light.anchors)) {
        const d = per.dark.anchors[k];
        if (!d || Math.abs(d.rect.x - v.rect.x) + Math.abs(d.rect.y - v.rect.y) + Math.abs(d.rect.w - v.rect.w) + Math.abs(d.rect.h - v.rect.h) > 1) {
          console.warn(`${name}: anchor "${k}" differs between themes`);
        }
      }
      result[name] = set.text ? { anchors: per.dark.anchors, text: per.dark.text } : per.dark.anchors;
    }
  } finally {
    await browser.close();
  }

  if (only.length) {
    console.log("Partial run: anchors.json/anchors.md not rewritten.");
    return;
  }
  const json = { viewport: { width: VIEWPORT.width, height: VIEWPORT.height }, gutterGap: GUTTER_GAP, screens: result };
  mkdirSync(dirname(set.json), { recursive: true });
  writeFileSync(set.json, JSON.stringify(json, null, 2) + "\n");
  writeFileSync(set.md, toMarkdown(Object.fromEntries(Object.entries(result).map(([k, v]) => [k, set.text ? v.anchors : v])), VIEWPORT));
  console.log("wrote anchors.json and anchors.md");
}

function toMarkdown(screens, viewport) {
  const head = `# Anchors

Candidate pointing targets for each demo screen, in ${viewport.width}x${viewport.height} coordinates
(top-left origin). Measured from the rendered page by
\`scripts/render-screens.mjs\` (\`getBoundingClientRect\`), so re-run it after
editing a screen. Generated file: edit the \`data-anchor\` attributes in the
HTML instead of this table.

- **Rect**: \`x, y, w, h\` of the element.
- **Edge**: the midpoint of the chosen side, where a line touches the element.
- **Gutter**: a point ${GUTTER_GAP}px outside that edge in empty space. No text
  node lies on the segment from gutter to edge, so a line can land there
  without crossing text.
- **Free run**: how many px beyond the gutter, in the same direction, are still
  free of text (capped at ${CLEAR_PROBE}). Use it to decide how long an approach
  segment can be.

The same names recur on every screen for the thread's carried values:
\`object\` (Order #1042), \`amount\` ($212.54), \`customer\` (Mara Okafor),
\`status\`, \`primary-action\`, \`timeline\`.
`;
  const body = Object.entries(screens)
    .map(([name, anchors]) => {
      const rows = Object.entries(anchors)
        .map(([k, a]) => {
          const g = a.gutter ? `(${a.gutter.x}, ${a.gutter.y})` : "none";
          const e = a.edge ? `(${a.edge.x}, ${a.edge.y})` : "none";
          return `| \`${k}\` | ${a.label.replace(/\|/g, "/")} | ${a.rect.x}, ${a.rect.y}, ${a.rect.w}, ${a.rect.h} | ${a.side ?? "none"} | ${e} | ${g} | ${a.clearRun} |`;
        })
        .join("\n");
      return `## ${name}\n\n| Anchor | Content | Rect (x, y, w, h) | Side | Edge | Gutter | Free run |\n|---|---|---|---|---|---|---|\n${rows}\n`;
    })
    .join("\n");
  return `${head}\n${body}`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
