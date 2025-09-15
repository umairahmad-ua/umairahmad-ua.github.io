# umairahmad-ua.github.io

Personal site of Umair Ahmad. Astro 7 + AstroPaper theme, deployed to GitHub Pages by `.github/workflows/deploy.yml` on push to `main`.

## Identity rules (never break these)

- Commit as `Umair Ahmad <59511462+umairahmad-ua@users.noreply.github.com>` (the account's GitHub noreply address, so commits link to the profile). This repo sets `user.name`/`user.email` locally. Never use the Zazmic identity or the `umair258` GitHub account here.
- Push with the personal account: `gh auth switch --user umairahmad-ua` before any `gh` call. The remote uses the `github.com-personal` SSH host alias.

## Weekly routine (what a session normally does)

1. `git pull`
2. `npm run new:note` (or `npm run new:note YYYY-MM-DD` for a specific Sunday). This creates `src/content/posts/notes/wNN-YY.md` with the right ISO week and pubDatetime (Sunday 23:00Z).
3. Research the week. Use WebSearch for what actually happened between Monday and Sunday. Every event you mention needs a primary source URL and an exact date. Add each one to `sources:` in the frontmatter and link it inline. Append the verified events to `data/timeline.md` under a `## Week of <Monday>` heading so the record stays complete.
4. Write 250 to 400 words in Umair's voice (below). Have an opinion grounded in his client work.
5. Add one article to `src/content/posts/articles/` every week (Wednesday pubDatetime T15:00:00Z) so cadence stays one note plus one article per week. Use-case specific, tool-rich, 1100 to 1600 words. Also optionally add a project, a project to `src/content/projects/`, or a reading entry to `src/content/reading/`. Update `src/content/pages/now.md` monthly. Start Here groups articles automatically by tags and title keywords (`src/pages/start-here.astro`).
6. `npm run qa` then `npm run build`. Both must pass.
7. Commit with the real current date and a plain message ("Week 39/26 notes"). Push. Check the Actions run is green.

## Voice contract (binding)

Short declarative sentences, 12 to 18 words on average. First person. American spelling. Contrast structure is his signature ("The domain is always new. The ability to figure it out is not.").

Never: em dashes, semicolons, tricolons, exclamation marks, filler adjectives (robust, comprehensive, extensive, cutting-edge, state-of-the-art, seamless, powerful), "leverage", "delve", "navigate", "landscape", "journey", "unlock", "harness" as a verb, "shipped/ship" for releasing software, "drives" as metaphor, "at scale" as filler, "production-grade", "it's worth noting", "notably", "in essence", "game-changer". No LinkedIn tone. State the fact and stop. `scripts/qa.mjs` enforces most of this.

Max two branded tool names per sentence in prose. Code blocks are exempt.

## Facts you may use (do not invent beyond these)

- Principal ML Engineer at Zazmic (Google Cloud Premier Partner) since June 2025. Leads and mentors the ML engineers. Houston, Texas. NEVER state a team head count anywhere on the site.
- Works alongside Google as a partner and directly with client teams at Apple and Meta (via the Let's Forage platform).
- Zazmic programs: Scout (nine-agent marketing intelligence for Let's Forage on Google ADK and Vertex AI Agent Engine, now Gemini Enterprise Agent Platform), legacy-to-BigQuery migration agents, agentic supply-chain planning for an apparel supplier to GAP and Levi's (plants in India, Bahrain, Jordan, Bangladesh), enterprise knowledge agents on Gemini Enterprise, Claude-based cloud operations agent.
- Developers Inc (Jul 2023 to Jun 2025): medical claims 50K+/day, 35% fewer rejections. Qwiet AI Autofix and Ocular. Adspirer NL-to-code. Pinecone RAG, QLoRA on Llama 2 and Mistral 7B.
- Algo (2022 to 2023): forecast accuracy +18%, carrying costs -30%, recommender +20% sales, 500+ SKUs.
- Data Insight (2019 to 2022): 100K+ docs/month, 1M+ images at 95% accuracy, 50% inference speedup, sub-second ASR. Team of 5.
- MS Data Science FAST NUCES 4.00 Gold Medal (EMT-DocNet). BS CS COMSATS Silver Medal. Claude Certified Architect – Foundations (CCAR-F), Anthropic, 2026 (passed week of 2026-03-16). Google Certified Developer, Google Developer Program Tier 1.
- Hypothetical, use-case specific projects are allowed (Umair approved this on 2026-09-17) when the client is described by industry and never named. Approved names only: Let's Forage, Apple and Meta teams, Qwiet AI, Adspirer, the GAP and Levi's apparel supplier. Keep outcome numbers modest and plausible. Real historical numbers above must never be changed.

## Date rule

A post may only cite events dated on or before its `pubDatetime`. `npm run qa` fails otherwise. Do not backdate new posts. New content gets today's date.

## Layout

- `src/content/posts/articles/*.md` long-form, `kind: article`
- `src/content/posts/notes/wNN-YY.md` weekly notes, `kind: note`, `week: "NN/YY"`
- `src/content/projects/*.md`, `src/content/reading/*.md`, `src/content/pages/{about,now,start-here,talks}.md`
- `src/site.extras.ts` holds Giscus, Buttondown and GoatCounter settings. Each stays disabled until its IDs are filled in.
- `data/timeline.md` verified event record with sources. Append, never rewrite.

## Dev

`npm run dev` for the local server, `npm run build` for the full pipeline (qa, astro check, astro build, pagefind).
