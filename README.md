# umairahmad-ua.github.io

Source for [umairahmad-ua.github.io](https://umairahmad-ua.github.io), the personal site of Umair Ahmad. Articles and weekly notes on building multi-agent AI systems for real companies, plus projects and reading.

Built with [Astro](https://astro.build) and the [AstroPaper](https://github.com/satnaing/astro-paper) theme. Deployed to GitHub Pages by GitHub Actions.

```
npm install
npm run dev        # local server
npm run new:note   # scaffold this week's note
npm run qa         # content checks: dates vs sources, voice rules, links
npm run build      # qa + astro check + build + pagefind
```

Every weekly note lists dated sources in its frontmatter. `scripts/qa.mjs` fails the build if a post cites anything dated after its own publish date.
