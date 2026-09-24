import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import config from "@/config";

export const BLOG_PATH = "src/content/posts";

const source = z.object({
  title: z.string(),
  url: z.string().url(),
  date: z.coerce.date(),
});

const diagramNode = z.object({
  id: z.string(),
  label: z.string(),
  col: z.number().int().min(0).max(5),
  kind: z.enum(["source", "agent", "tool", "model", "store", "human", "output"]).default("tool"),
});
const diagram = z.object({
  caption: z.string(),
  nodes: z.array(diagramNode).min(3).max(14),
  edges: z.array(z.tuple([z.string(), z.string()]).or(z.tuple([z.string(), z.string(), z.string()]))).default([]),
});

const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(config.site.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      // "article" = long-form essay or tutorial, "note" = weekly AI note
      kind: z.enum(["article", "note"]).default("article"),
      // ISO week label for notes, e.g. "38/25"
      week: z.string().optional(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
      // Every dated external claim in the body must have an entry here.
      // scripts/qa.mjs fails the build if any source.date > pubDatetime.
      sources: z.array(source).default([]),
      // Architecture sketch rendered by src/components/Diagram.astro (essays)
      diagram: diagram.optional(),
    }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    canonicalURL: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    role: z.string(),
    org: z.string(),
    period: z.string(),
    stack: z.array(z.string()).default([]),
    url: z.string().url().optional(),
    repo: z.string().url().optional(),
    order: z.number().default(100),
    featured: z.boolean().default(false),
  }),
});

const reading = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/reading" }),
  schema: z.object({
    title: z.string(),
    url: z.string().url(),
    author: z.string().optional(),
    date: z.coerce.date(),
    kind: z.enum(["paper", "post", "book", "talk", "doc"]).default("post"),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { posts, pages, projects, reading };
