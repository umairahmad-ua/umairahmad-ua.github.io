#!/usr/bin/env node
// Usage: node scripts/add-diagram.mjs <article-slug> <spec.json>
// Inserts (or replaces) a `diagram:` block in the article's frontmatter.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const ROOT = new URL("..", import.meta.url).pathname;
const [slug, specPath] = process.argv.slice(2);
if (!slug || !specPath) { console.error("usage: add-diagram <slug> <spec.json>"); process.exit(1); }
const file = join(ROOT, "src/content/posts/articles", `${slug}.md`);
if (!existsSync(file)) { console.error("no such article:", file); process.exit(1); }
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const KINDS = new Set(["source","agent","tool","model","store","human","output"]);
const errs = [];
if (typeof spec.caption !== "string" || spec.caption.length < 10) errs.push("caption missing");
if (!Array.isArray(spec.nodes) || spec.nodes.length < 3 || spec.nodes.length > 14) errs.push("3..14 nodes required");
const ids = new Set();
for (const n of spec.nodes ?? []) {
  if (!n.id || ids.has(n.id)) errs.push(`bad/duplicate id ${n.id}`); ids.add(n.id);
  if (typeof n.label !== "string" || n.label.length > 28) errs.push(`label too long: ${n.label}`);
  if (!Number.isInteger(n.col) || n.col < 0 || n.col > 5) errs.push(`col 0..5 required on ${n.id}`);
  if (n.kind && !KINDS.has(n.kind)) errs.push(`bad kind ${n.kind}`);
}
for (const e of spec.edges ?? []) {
  if (!Array.isArray(e) || e.length < 2 || !ids.has(e[0]) || !ids.has(e[1])) errs.push(`bad edge ${JSON.stringify(e)}`);
  if (e[2] && (typeof e[2] !== "string" || e[2].length > 22)) errs.push(`edge label too long: ${e[2]}`);
}
if (/—|;/.test(spec.caption)) errs.push("caption has em dash or semicolon");
if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
const q = s => JSON.stringify(s);
let yaml = `diagram:\n  caption: ${q(spec.caption)}\n  nodes:\n`;
for (const n of spec.nodes) yaml += `    - { id: ${q(n.id)}, label: ${q(n.label)}, col: ${n.col}, kind: ${q(n.kind ?? "tool")} }\n`;
yaml += `  edges:\n`;
for (const e of spec.edges ?? []) yaml += `    - [${e.map(q).join(", ")}]\n`;
let src = readFileSync(file, "utf8");
const m = src.match(/^---\n([\s\S]*?)\n---\n/);
if (!m) { console.error("no frontmatter"); process.exit(1); }
let fm = m[1].replace(/\ndiagram:\n(?:  .*\n?)*/g, "\n").replace(/^diagram:\n(?:  .*\n?)*/g, "");
fm = fm.replace(/\s+$/, "") + "\n" + yaml.replace(/\n$/, "");
src = `---\n${fm}\n---\n` + src.slice(m[0].length);
writeFileSync(file, src);
console.log(`diagram added to ${slug} (${spec.nodes.length} nodes, ${(spec.edges ?? []).length} edges)`);
