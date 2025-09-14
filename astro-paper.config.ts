import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://umairahmad-ua.github.io/",
    title: "Umair Ahmad",
    description:
      "Notes from a Principal AI Engineer building multi-agent systems on Google Cloud. Articles, weekly AI notes, and the projects behind them.",
    author: "Umair Ahmad",
    profile: "https://umairahmad-ua.github.io/about/",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "America/Chicago",
    dir: "ltr",
  },
  posts: {
    perPage: 12,
    perIndex: 4,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: true,
      url: "https://github.com/umairahmad-ua/umairahmad-ua.github.io/edit/main/",
    },
    search: "pagefind",
  },
  socials: [
    { name: "github", url: "https://github.com/umairahmad-ua" },
    { name: "linkedin", url: "https://www.linkedin.com/in/umairahmad-ua/" },
    { name: "mail", url: "mailto:umair.ahmad5966@gmail.com" },
  ],
  shareLinks: [
    { name: "linkedin", url: "https://www.linkedin.com/sharing/share-offsite/?url=" },
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
