#!/usr/bin/env node
/**
 * Content QA for umairahmad-ua.github.io
 *
 * Fails (exit 1) when:
 *  - a post cites a source dated after its own pubDatetime
 *  - a post body contains banned words or punctuation from the voice contract
 *  - required frontmatter is missing
 *  - an internal link points to a post that does not exist
 *  - a note's `week` label does not match its pubDatetime ISO week
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const POSTS = join(ROOT, "src/content/posts");

const BANNED = [
  /—/g, // em dash
  /;(?![^`]*`)/g, // semicolons outside inline code (approximate)
  /\bleverag(e|es|ed|ing)\b/gi,
  /\bdelv(e|es|ed|ing)\b/gi,
  /\bnavigat(e|es|ed|ing)\b/gi,
  /\blandscape\b/gi,
  /\bjourney\b/gi,
  /\bunlock(s|ed|ing)?\b/gi,
  /\bshipped\b/gi,
  /\bships?\b(?! (window|windows|lane|lanes|container|containers|date|dates))/gi,
  /\bshipping\b(?! (window|windows|consolidation|lane|lanes|cost|costs|time|times|container|containers|schedule|schedules))/gi,
  /\bproduction-grade\b/gi,
  /\bit'?s worth noting\b/gi,
  /\bnotably\b/gi,
  /\bin essence\b/gi,
  /\bgame[- ]chang(er|ing)\b/gi,
  /\bcutting[- ]edge\b/gi,
  /\bstate[- ]of[- ]the[- ]art\b/gi,
  /\brobust\b/gi,
  /\bseamless(ly)?\b/gi,
  /!(?![^`]*`)(?!\[)/g, // exclamation marks outside code / image syntax
];

const errors = [];
const warnings = [];

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name.startsWith("_") ? [] : walk(p);
    return /\.(md|mdx)$/.test(name) && !name.startsWith("_") ? [p] : [];
  });
}

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const fm = m[1];
  const body = m[2];
  const get = key => {
    const r = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return r ? r[1].trim().replace(/^["']|["']$/g, "") : undefined;
  };
  const sources = [...fm.matchAll(/-\s*title:.*\n\s*url:\s*(\S+)\n\s*date:\s*(\S+)/g)].map(
    s => ({ url: s[1].replace(/^["']|["']$/g, ""), date: new Date(s[2]) })
  );
  return { get, body, sources, raw: fm };
}

function isoWeek(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return { week, year: date.getUTCFullYear() };
}

function stripCode(body) {
  return body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "")
    .replace(/\]\((https?:\/\/[^)]+)\)/g, "](URL)")
    .replace(/https?:\/\/\S+/g, "URL");
}

const files = walk(POSTS);
const slugs = new Set(
  files.map(f => relative(POSTS, f).replace(/\.(md|mdx)$/, ""))
);

for (const file of files) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, "utf8");
  const fm = parseFrontmatter(src);
  if (!fm) {
    errors.push(`${rel}: no frontmatter`);
    continue;
  }
  for (const key of ["title", "description", "pubDatetime", "kind"]) {
    if (!fm.get(key)) errors.push(`${rel}: missing ${key}`);
  }
  const pub = new Date(fm.get("pubDatetime"));
  if (Number.isNaN(pub.getTime())) errors.push(`${rel}: bad pubDatetime`);

  // Sources must not postdate the post.
  for (const s of fm.sources) {
    if (Number.isNaN(s.date.getTime())) {
      errors.push(`${rel}: source ${s.url} has a bad date`);
    } else if (s.date.getTime() > pub.getTime()) {
      errors.push(
        `${rel}: source ${s.url} dated ${s.date.toISOString().slice(0, 10)} is after publish date ${pub.toISOString().slice(0, 10)}`
      );
    }
  }

  // Notes: week label must match the ISO week of the Monday before the Sunday publish.
  if (fm.get("kind") === "note") {
    const week = fm.get("week");
    if (!week) errors.push(`${rel}: note without week`);
    else {
      // publish is Sunday; the note covers the ISO week ending that Sunday
      const { week: w, year } = isoWeek(pub);
      const expected = `${String(w).padStart(2, "0")}/${String(year).slice(2)}`;
      if (week !== expected) errors.push(`${rel}: week "${week}" should be "${expected}"`);
    }
  }

  // Voice contract on body prose.
  const prose = stripCode(fm.body);
  for (const re of BANNED) {
    const hits = prose.match(re);
    if (hits) errors.push(`${rel}: banned pattern ${re} (${hits.length}x)`);
  }

  // Internal post links must resolve.
  for (const m of prose.matchAll(/\]\(\/posts\/([^)#?]+?)\/?\)/g)) {
    if (!slugs.has(m[1])) errors.push(`${rel}: dead internal link /posts/${m[1]}`);
  }

  // Word count sanity.
  const words = prose.split(/\s+/).filter(Boolean).length;
  if (fm.get("kind") === "note" && (words < 180 || words > 480))
    warnings.push(`${rel}: note is ${words} words`);
  if (fm.get("kind") === "article" && words < 900)
    warnings.push(`${rel}: article is only ${words} words`);
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);
console.log(`\nqa: ${files.length} posts checked, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
