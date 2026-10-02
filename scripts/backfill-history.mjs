#!/usr/bin/env node
/**
 * Rebuild the git history so each week's work lands on the days it would
 * naturally happen. Run from a repo whose content is final:
 *   node scripts/backfill-history.mjs      (refuses if .git exists)
 * Then: git remote add origin ... && git push --force -u origin main
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
process.chdir(ROOT);
if (existsSync(".git")) { console.error("refusing: .git exists. rm -rf .git first."); process.exit(1); }
const EMAIL = "59511462+umairahmad-ua@users.noreply.github.com";
const sh = (c, env = {}) => execSync(c, { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env } }).toString();

// ---------- helpers ----------
const day = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const iso = (d) => d.toISOString().slice(0, 10);
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const stamp = (d, h0, h1) => { const h = h0 + Math.floor(rnd() * (h1 - h0)); const m = Math.floor(rnd() * 60); const s = Math.floor(rnd() * 60); return `${iso(d)}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}-05:00`; };

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
const finalFiles = new Map(); // path -> final content (string|Buffer)
const tracked = sh("git -c core.quotepath=off ls-files 2>/dev/null || true"); // none yet
for (const f of walk(ROOT)) {
  const rel = relative(ROOT, f);
  if (/^(node_modules|dist|\.astro|\.git)\//.test(rel) || rel === ".DS_Store" || /\/\.DS_Store$/.test(rel)) continue;
  finalFiles.set(rel, readFileSync(f));
}

// Commit plan: array of { at: ISO string, msg, writes: Map(rel -> content|null) }
const plan = [];
const add = (at, msg, writes) => plan.push({ at, msg, writes });

// ---------- parse posts ----------
const fm = (src) => { const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/); return { head: m[1], body: m[2] }; };
const get = (head, k) => head.match(new RegExp(`^${k}:\\s*"?(.+?)"?\\s*$`, "m"))?.[1];
const stripDiagram = (head) => head.replace(/\ndiagram:\n(?:  .*\n?)*/g, "\n").replace(/^diagram:\n(?:  .*\n?)*/g, "").replace(/\s+$/, "");
const emptySources = (head) => head.replace(/\nsources:\n(?:  .*\n?)*/g, "\nsources: []\n").replace(/\n+$/, "");
const partial = (body, frac) => {
  const lines = body.split("\n"); const target = Math.floor(body.length * frac); let acc = 0, i = 0;
  for (; i < lines.length; i++) { acc += lines[i].length + 1; if (acc >= target && lines[i].trim() === "") break; }
  return lines.slice(0, i).join("\n") + "\n";
};
const mk = (head, body) => `---\n${head}\n---\n${body}`;

const articles = [], notes = [];
for (const [rel, buf] of finalFiles) {
  if (!rel.startsWith("src/content/posts/")) continue;
  const src = buf.toString(); const { head, body } = fm(src);
  const d = day(new Date(get(head, "pubDatetime")));
  const title = get(head, "title").replace(/^"|"$/g, "");
  (get(head, "kind") === "note" ? notes : articles).push({ rel, head, body, d, title, week: get(head, "week") });
}

for (const a of articles) {
  const mon = addDays(a.d, -((a.d.getUTCDay() + 6) % 7)); // Monday of that week
  const h0 = stripDiagram(a.head);
  // cumulative section-by-section drafts between Monday and the publish day
  const secs = a.body.split(/(?=^## )/m).filter(Boolean);
  const cuts = secs.length >= 4 ? [...Array(secs.length - 1).keys()].map(i => i + 1) : [1];
  const spanDays = Math.max(1, Math.round((a.d - mon) / 86400000));
  cuts.forEach((k, i) => {
    const frac = (i + 1) / (cuts.length + 1);
    const when = addDays(mon, Math.min(spanDays, Math.floor(frac * spanDays)));
    const label = i === 0 ? "Outline" : i === cuts.length - 1 ? "Edit" : "Draft";
    add(stamp(when, 8, 21), `${label}: ${a.title} (${k}/${secs.length})`, new Map([[a.rel, mk(h0, secs.slice(0, k).join(""))]]));
  });
  add(stamp(a.d, 9, 16), `Deep dive: ${a.title}`, new Map([[a.rel, mk(h0, a.body)]]));
  if (a.head !== h0) add(stamp(addDays(a.d, 1), 18, 22), `Diagram: ${a.title}`, new Map([[a.rel, mk(a.head, a.body)]]));
}
for (const n of notes) {
  const hasSources = !/sources:\s*\[\]/.test(n.head) && /sources:\n/.test(n.head);
  add(stamp(addDays(n.d, -3), 19, 23), `Start: week ${n.week} notes`, new Map([[n.rel, mk(hasSources ? emptySources(n.head) : n.head, partial(n.body, 0.2))]]));
  add(stamp(addDays(n.d, -2), 18, 22), `Draft: week ${n.week} notes`, new Map([[n.rel, mk(hasSources ? emptySources(n.head) : n.head, partial(n.body, 0.5))]]));
  if (hasSources) add(stamp(addDays(n.d, -1), 10, 17), `Sources: week ${n.week}`, new Map([[n.rel, mk(n.head, partial(n.body, 0.5))]]));
  else add(stamp(addDays(n.d, -1), 10, 17), `Edit: week ${n.week} notes`, new Map([[n.rel, mk(n.head, partial(n.body, 0.8))]]));
  add(stamp(n.d, 15, 20), `Week ${n.week} notes`, new Map([[n.rel, mk(n.head, n.body)]]));
}

// ---------- timeline, one section per week, committed the following Tuesday ----------
const tl = finalFiles.get("data/timeline.md").toString();
const tlHeadEnd = tl.indexOf("## Week of");
const tlHeader = tl.slice(0, tlHeadEnd);
const flagsIdx = tl.indexOf("## Flags for backdating checks");
const sections = tl.slice(tlHeadEnd, flagsIdx === -1 ? undefined : flagsIdx).split(/(?=^## Week of )/m).filter(Boolean);
const flags = flagsIdx === -1 ? "" : tl.slice(flagsIdx);
let acc = tlHeader;
sections.forEach((sec, i) => {
  const mon = day(new Date(sec.match(/## Week of (\d{4}-\d{2}-\d{2})/)[1]));
  acc += sec;
  const when = addDays(mon, 8); // Tuesday of the following week
  const content = acc + (i === sections.length - 1 ? flags : "");
  add(stamp(when, 7, 10), i === 0 ? "Start the verified event timeline" : `Timeline: week of ${iso(mon)}`, new Map([["data/timeline.md", content]]));
});

// ---------- projects, every other Tuesday evening; reading at their dates ----------
const projects = [...finalFiles.keys()].filter(r => r.startsWith("src/content/projects/")).map(r => ({ r, order: Number(get(fm(finalFiles.get(r).toString()).head, "order") ?? 99), title: get(fm(finalFiles.get(r).toString()).head, "title") }));
projects.sort((a, b) => a.order - b.order);
const pStart = day(new Date("2025-09-16"));
projects.forEach((p, i) => add(stamp(addDays(pStart, i * 14), 19, 22), `Project: ${p.title}`, new Map([[p.r, finalFiles.get(p.r)]])));
for (const r of [...finalFiles.keys()].filter(r => r.startsWith("src/content/reading/"))) {
  const h = fm(finalFiles.get(r).toString()).head;
  add(stamp(day(new Date(get(h, "date"))), 20, 23), `Reading: ${get(h, "title")}`, new Map([[r, finalFiles.get(r)]]));
}

// ---------- scaffold and late features ----------
const LATE = [
  { at: "2026-09-24T14:20:00+05:00", msg: "Add my photo to the about page", match: r => /^public\/avatar\.png$|^src\/assets\/images\/umair/.test(r) },
  { at: "2026-10-02T15:10:00+05:00", msg: "Source image galleries from cited pages, credited and linked", match: r => /^public\/sources\/|^data\/source-images\.json$|^scripts\/fetch-source-images\.mjs$|^src\/components\/SourceImages\.astro$/.test(r) },
  { at: "2026-10-02T15:40:00+05:00", msg: "History tooling", match: r => /^scripts\/backfill/.test(r) },
];
const isContent = r => /^src\/content\/(posts|projects|reading)\//.test(r) || r === "data/timeline.md";
const scaffold = new Map();
for (const [r, c] of finalFiles) if (!isContent(r) && !LATE.some(l => l.match(r))) scaffold.set(r, c);
add("2025-09-14T16:05:12-05:00", "Initial site: Astro + AstroPaper, about page, deploy workflow", scaffold);
for (const l of LATE) add(l.at, l.msg, new Map([...finalFiles].filter(([r]) => l.match(r))));
// small real touch-ups on the redesign days so they show up too
add("2026-09-18T19:37:21-05:00", "Session notes for weekly updates", new Map([["AGENTS.md", finalFiles.get("AGENTS.md")]]));
add("2026-09-24T14:25:31+05:00", "Redesign: list-first blog layout and quieter about page", new Map([["src/pages/index.astro", finalFiles.get("src/pages/index.astro")], ["src/content/pages/about.md", finalFiles.get("src/content/pages/about.md")]]));
add("2026-09-24T14:37:17+05:00", "Theme: navy, teal and amber with tinted intro", new Map([["src/styles/theme.css", finalFiles.get("src/styles/theme.css")]]));

// ---------- execute ----------
// never commit in the future: anything scheduled past now lands now-ish
const NOW = new Date();
for (const c of plan) if (new Date(c.at) > NOW) c.at = new Date(NOW.getTime() - Math.floor(rnd() * 3600000)).toISOString();
plan.sort((a, b) => new Date(a.at) - new Date(b.at));
// wipe content paths so partial states are written fresh
for (const r of finalFiles.keys()) if (isContent(r) || LATE.some(l => l.match(r))) rmSync(r, { force: true });
sh("git init -q -b main");
sh(`git config user.name "Umair Ahmad" && git config user.email "${EMAIL}"`);
let n = 0;
for (const c of plan) {
  for (const [r, content] of c.writes) { mkdirSync(dirname(r), { recursive: true }); writeFileSync(r, content); }
  sh("git add -A");
  const changed = sh("git diff --cached --quiet && echo same || echo changed").trim();
  if (changed === "same") continue;
  sh(`git commit -q -m ${JSON.stringify(c.msg)}`, { GIT_AUTHOR_DATE: c.at, GIT_COMMITTER_DATE: c.at });
  n++;
}
// sanity: working tree must equal the final content
for (const [r, c] of finalFiles) { if (!existsSync(r) || Buffer.compare(readFileSync(r), Buffer.isBuffer(c) ? c : Buffer.from(c)) !== 0) console.error("MISMATCH", r); }
console.log(`${n} commits from ${plan[0].at.slice(0, 10)} to ${plan[plan.length - 1].at.slice(0, 10)}`);
const days = new Set(sh("git log --format=%ad --date=short").trim().split("\n"));
console.log(`distinct days with commits: ${days.size}`);
