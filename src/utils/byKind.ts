import type { CollectionEntry } from "astro:content";

export const isArticle = (p: CollectionEntry<"posts">) =>
  p.data.kind === "article";
export const isNote = (p: CollectionEntry<"posts">) => p.data.kind === "note";
