export const org = {
  name: "Delta Sigma Pi",
  chapterName: "Nu Chapter",
  shortName: "DSP Nu",
  greekLetters: "ΔΣΠ",
  tagline: "Nu Chapter Portal",
  domain: "dsp.jacobtartabini.com",

  terms: {
    member: "Brother",
    members: "Brothers",
    pledge: "PNM",
    chapter: "Chapter",
    officer: "Officer",
  },

  eventCategories: [
    { key: "chapter", label: "Chapter" },
    { key: "rush", label: "Rush" },
    { key: "fundraising", label: "Fundraising" },
    { key: "service", label: "Service" },
    { key: "brotherhood", label: "Brotherhood" },
    { key: "professionalism", label: "Professionalism" },
    { key: "dei", label: "DE&I" },
  ] as const,

  newMemberCategory: { key: "new_member", label: "New Member" } as const,
  execCategory: { key: "exec", label: "Exec" } as const,

  scoredCategories: ["chapter", "professionalism", "brotherhood", "fundraising", "service"] as const,

  positions: [
    "President",
    "Senior Vice President",
    "VP of Chapter Operations",
    "VP of Pledge Education",
    "VP of New Member Education",
    "VP of Professional Activities",
    "VP of Finance",
    "VP of Community Service",
    "VP of Alumni Relations",
    "VP of Scholarship & Awards",
    "VP of Brotherhood",
    "VP of DEI",
    "VP of Fundraising",
    "Chancellor",
    "Historian",
  ],

  pdpOfficerTitles: [
    "VP of New Member Development",
    "VP of Pledge Education",
    "VP of New Member Education",
  ],

  chapterOpsPositions: [
    "VP of Chapter Operations",
  ],

  features: {
    eop: true,
    pdp: true,
    coffeeChats: true,
    familyGames: true,
    dues: true,
    elections: true,
    serviceHours: true,
    jobBoard: true,
    alumni: true,
    paddleSubmissions: true,
    ticketing: true,
  },

  standing: {
    minPoints: 7,
    minServiceHours: 3,
  },

  superAdmins: [
    "jacobtart8@gmail.com",
  ],

  auth: {
    allowGoogle: true,
    allowEmail: true,
    emailPlaceholder: "brother@dsp.org",
  },

  calendar: {
    prodId: "DSP Nu Chapter",
    calName: "DSP Nu Chapter Events",
    uidSuffix: "@dsp-nu.app",
    exportFilename: "dsp-nu-events",
  },

  meta: {
    themeColor: "#6b21a8",
    backgroundColor: "#faf9f7",
    description: "Chapter management app for Delta Sigma Pi Nu Chapter",
    companyName: "Tartabini Enterprises LLC",
  },
} as const;

export type OrgConfig = typeof org;

export const allCategories = [
  ...org.eventCategories.map((c) => c.key),
  org.newMemberCategory.key,
] as const;

export const allCategoriesWithExec = [
  ...allCategories,
  org.execCategory.key,
] as const;

export type EventCategory = (typeof allCategoriesWithExec)[number];

export const categoryLabels: Record<string, string> = Object.fromEntries([
  ...org.eventCategories.map((c) => [c.key, c.label]),
  [org.newMemberCategory.key, org.newMemberCategory.label],
  [org.execCategory.key, org.execCategory.label],
]);

export function hasPosition(profile: { positions?: string[] | null } | null, ...titles: string[]): boolean {
  return titles.some(t => profile?.positions?.includes(t));
}

export function isPDPOfficer(profile: { positions?: string[] | null } | null): boolean {
  return org.pdpOfficerTitles.some(t => profile?.positions?.includes(t));
}

export function isChapterOps(profile: { positions?: string[] | null } | null): boolean {
  return org.chapterOpsPositions.some(t => profile?.positions?.includes(t));
}
