#!/usr/bin/env node
/**
 * Scaffold this week's note.
 *   npm run new:note            -> note for the ISO week ending next Sunday (or today if Sunday)
 *   npm run new:note 2026-09-20 -> note for the week ending on that Sunday
 */
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const arg = process.argv[2];
let sunday = arg ? new Date(`${arg}T00:00:00Z`) : new Date();
if (!arg) {
  const day = sunday.getUTCDay();
  const add = day === 0 ? 0 : 7 - day;
  sunday = new Date(Date.UTC(sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate() + add));
}
const monday = new Date(sunday.getTime() - 6 * 86400000);

function isoWeek(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return { week: Math.ceil(((date - yearStart) / 86400000 + 1) / 7), year: date.getUTCFullYear() };
}
const { week, year } = isoWeek(sunday);
const ww = String(week).padStart(2, "0");
const yy = String(year).slice(2);
const slug = `w${ww}-${yy}`;
const file = join(ROOT, "src/content/posts/notes", `${slug}.md`);
if (existsSync(file)) {
  console.error(`exists: ${file}`);
  process.exit(1);
}
const iso = d => d.toISOString().slice(0, 10);
writeFileSync(
  file,
  `---
title: "Week ${ww}/${yy}: TITLE"
description: "ONE SENTENCE."
pubDatetime: ${iso(sunday)}T23:00:00Z
kind: note
week: "${ww}/${yy}"
tags: ["weekly"]
sources: []
---

Week of ${iso(monday)} to ${iso(sunday)}.

## What happened

- 

## What I make of it

`
);
console.log(`created ${file}`);
