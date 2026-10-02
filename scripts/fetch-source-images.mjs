#!/usr/bin/env node
/**
 * For every source URL cited in posts, fetch the page's og:image (or twitter:image),
 * download it, resize to <=1200px wide, and save under public/sources/<hash>.jpg.
 * Writes data/source-images.json mapping url -> { file, w, h, site }.
 * Re-runs are incremental: URLs already in the map are skipped unless --force.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT_DIR = join(ROOT, "public/sources");
const MAP = join(ROOT, "data/source-images.json");
mkdirSync(OUT_DIR, { recursive: true });
const map = existsSync(MAP) ? JSON.parse(readFileSync(MAP, "utf8")) : {};
const force = process.argv.includes("--force");
const SKIP = [/wikipedia\.org/, /github\.com\/[^/]+\/[^/]+$/];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? walk(join(dir, d.name)) : /\.mdx?$/.test(d.name) ? [join(dir, d.name)] : []);
}
const urls = new Set();
for (const f of walk(join(ROOT, "src/content/posts"))) {
  const fm = readFileSync(f, "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  for (const m of fm.matchAll(/^\s*url:\s*"?([^"\n]+)"?\s*$/gm)) urls.add(m[1].trim());
}
const todo = [...urls].filter(u => (force || !(u in map)) && !SKIP.some(r => r.test(u)));
console.log(`${urls.size} unique sources, ${todo.length} to fetch`);

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36";
async function getImage(url) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "follow", signal: ctrl.signal });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 400000);
    const pick = (re) => html.match(re)?.[1];
    let img = pick(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i)
      ?? pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i)
      ?? pick(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i)
      ?? pick(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i);
    if (!img) return null;
    img = new URL(img.replace(/&amp;/g, "&"), res.url).href;
    const decode = (t) => t.replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
    const site = decode(pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ?? new URL(res.url).hostname.replace(/^www\./, ""));
    const r2 = await fetch(img, { headers: { "user-agent": UA }, signal: ctrl.signal });
    if (!r2.ok) return null;
    const buf = Buffer.from(await r2.arrayBuffer());
    if (buf.length < 2000) return null;
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 300) return null;
    const hash = createHash("sha1").update(url).digest("hex").slice(0, 16);
    const file = `sources/${hash}.jpg`;
    const out = await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 82 }).toFile(join(ROOT, "public", file));
    return { file: "/" + file, w: out.width, h: out.height, site, src: img };
  } catch { return null; } finally { clearTimeout(t); }
}

let ok = 0, fail = 0;
const queue = [...todo];
async function worker() {
  while (queue.length) {
    const u = queue.shift();
    const r = await getImage(u);
    if (r) { map[u] = r; ok++; } else { map[u] = null; fail++; }
    if ((ok + fail) % 20 === 0) { writeFileSync(MAP, JSON.stringify(map, null, 1)); console.log(`  ${ok} ok, ${fail} none`); }
  }
}
await Promise.all([...Array(6)].map(worker));
writeFileSync(MAP, JSON.stringify(map, null, 1));
console.log(`done: ${ok} images saved, ${fail} sources without a usable image`);
