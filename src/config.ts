export const SITE = {
  website: "https://connor-mcshane.github.io", // replace this with your deployed domain
  author: "Connor McShane",
  profile: "https://connor-mcshane.github.io/",
  desc: "Personal website and blog of Connor McShane, Senior Data Engineer based in London.",
  title: "Connor McShane",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: false, // Disabling light mode to enforce dark neon aesthetic
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "Edit page",
    url: "",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Europe/London", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
