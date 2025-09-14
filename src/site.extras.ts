/**
 * Optional third-party integrations. Each block is disabled until its
 * identifiers are filled in, so the site builds cleanly without them.
 */
export const extras = {
  // https://giscus.app  (requires GitHub Discussions enabled on the repo)
  giscus: {
    enabled: false,
    repo: "umairahmad-ua/umairahmad-ua.github.io",
    repoId: "",
    category: "Comments",
    categoryId: "",
  },
  // https://buttondown.com
  newsletter: {
    enabled: false,
    provider: "buttondown" as const,
    username: "",
  },
  // https://www.goatcounter.com  (privacy friendly, no cookies)
  analytics: {
    enabled: false,
    goatcounterCode: "",
  },
};
