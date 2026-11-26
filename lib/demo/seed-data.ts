// ISB Hood demo data. Everything the clickable prototype shows comes from here.
//
// Edit freely: names, courses, review text, questions. All people and quotes
// are fictional. Dates are written as "days ago" so the demo always looks
// current. Reset the demo from the banner at the top of the app to reload this
// file's contents.
//
// Ids must look like UUIDs (hex digits only); use the helpers below.

export const id = (kind: string, n: number) =>
  `${kind.padEnd(8, "0").slice(0, 8)}-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

// Id prefixes (hex only): a = people, c = courses, b = offerings, e = reviews,
// f = comments, d = flags, 0a = outreach.
export const P = {
  ravi: id("a", 1),
  meera: id("a", 2),
  asha: id("a", 3),
  kiran: id("a", 4),
  dev: id("a", 5),
  nisha: id("a", 6),
  rohan: id("a", 7),
  tara: id("a", 8),
  vikram: id("a", 9),
  neha: id("a", 10),
  arnav: id("a", 11),
  // Primary personas (docs/PERSONAS.md).
  ananya: id("a", 12),
  arjun: id("a", 13),
  karan: id("a", 14),
  ishita: id("a", 15),
} as const;

export type SeedPerson = {
  id: string;
  email: string;
  full_name: string | null;
  programme: "pgp" | "pgp_yl" | "alum" | null;
  cohort: string | null;
  background_function: string | null;
  background_industry: string | null;
  years_experience_band: string | null;
  target_track: string | null;
  role: "reader" | "moderator";
  account_type: "isb" | "contributor";
  verification_status: "not_required" | "pending" | "verified" | "rejected";
  source: string | null;
  /** Shown on the demo "choose who to be" screen. Leave out for background authors. */
  persona?: {
    title: string;
    shows: string;
    door: "reader" | "contributor";
    /** Primary personas (docs/PERSONAS.md): listed first on Sample accounts, by side. */
    side?: "seeker" | "contributor";
    /** Short name for the role, shown on persona cards and in the demo strip. */
    role?: string;
    /** The demo script shown on Home for this persona: what to try, in order. */
    script?: { text: string; href?: string; link?: string }[];
  };
  /** Null: has not filled in "About you" yet. */
  completedDaysAgo: number | null;
};

const person = (
  p: Omit<SeedPerson, "role" | "account_type" | "verification_status" | "source"> &
    Partial<SeedPerson>,
): SeedPerson => ({
  role: "reader",
  account_type: "isb",
  verification_status: "not_required",
  source: "whatsapp_group",
  ...p,
});

export const PEOPLE: SeedPerson[] = [
  // Primary personas: two information seekers and two contributors. Fictional,
  // built from the research personas in docs/PRD.md section 3.1. Walkthroughs
  // for each are in docs/PERSONAS.md.
  person({
    id: P.ananya,
    email: "ananya.kulkarni@isb.edu",
    full_name: "Ananya Kulkarni",
    programme: "pgp",
    cohort: "Co'27",
    background_function: "consulting",
    background_industry: "bfsi",
    years_experience_band: "3-5",
    target_track: "general_management",
    source: "whatsapp_group",
    completedDaysAgo: 5,
    persona: {
      title: "Ananya Kulkarni · PGP Co'27, the Elective Optimiser",
      shows:
        "Ex risk consultant choosing Term 7 electives: compares courses, reads reasons, asks an author",
      door: "reader",
      side: "seeker",
      role: "Elective Optimiser",
      script: [
        { text: "Browse the Term 7 courses you can bid for.", href: "/courses", link: "Courses" },
        {
          text: "Open Pricing Strategy. Note the warning: the professor changed since these reviews.",
          href: "/courses/MKT-501",
          link: "Pricing Strategy",
        },
        {
          text: "Compare it with Corporate Valuation: 6+ hours a week, and every rating has a reason.",
          href: "/courses/FIN-502",
          link: "Corporate Valuation",
        },
        {
          text: "Under any review, open “Ask the author” and ask what the review does not cover.",
        },
        {
          text: "Answer the two-question post-bid survey.",
          href: "/survey/post-bid",
          link: "Survey",
        },
      ],
    },
  }),
  person({
    id: P.arjun,
    email: "arjun.bhatia@isb.edu",
    full_name: "Arjun Bhatia",
    programme: "pgp",
    cohort: "Co'27",
    background_function: "finance",
    background_industry: "bfsi",
    years_experience_band: "6-8",
    target_track: "product",
    source: "friend",
    completedDaysAgo: 9,
    persona: {
      title: "Arjun Bhatia · PGP Co'27, the Career Pivoter",
      shows:
        "CA and ex-banker moving into product: finds courses that help the switch, waits on an author's reply",
      door: "reader",
      side: "seeker",
      role: "Career Pivoter",
      script: [
        {
          text: "Find courses that help a move into product: the list is filtered to “Helps for: Product”.",
          href: "/courses?term=all&track=product",
          link: "Product courses",
        },
        {
          text: "Open Product Management. Your question to Karan is under his review, waiting.",
          href: "/courses/STR-503",
          link: "Product Management",
        },
        {
          text: "Tap “Request a chat” on a review: it is a feature not built yet, so it says so.",
        },
        {
          text: "Switch to Karan, answer the question, then switch back here to read the reply.",
          href: "/sample-accounts",
          link: "Switch persona",
        },
      ],
    },
  }),
  person({
    id: P.karan,
    email: "karan.malhotra@example.com",
    full_name: "Karan Malhotra",
    programme: "alum",
    cohort: "Co'26",
    background_function: "engineering",
    background_industry: "it_software",
    years_experience_band: "3-5",
    target_track: "product",
    account_type: "contributor",
    verification_status: "verified",
    source: "campaign:co26-term7",
    completedDaysAgo: 20,
    persona: {
      title: "Karan Malhotra · Co'26 alum, the Senior Guide",
      shows:
        "Now a product manager, signs in with a personal email: his review is live and a question is waiting for him",
      door: "contributor",
      side: "contributor",
      role: "Senior Guide",
      script: [
        {
          text: "Open My activity: Arjun’s question is waiting for you.",
          href: "/me",
          link: "My activity",
        },
        {
          text: "Tap “Answer” and reply. It shows under your review, labelled “Author”, for every reader.",
        },
        {
          text: "From My activity, edit your review or see it on the course page.",
        },
        {
          text: "Write a second review, for example Data Science for Managers.",
          href: "/write",
          link: "Write",
        },
      ],
    },
  }),
  person({
    id: P.ishita,
    email: "ishita.sharma@isb.edu",
    full_name: "Ishita Sharma",
    programme: "pgp",
    cohort: "Co'27",
    background_function: "analytics",
    background_industry: "ecommerce",
    years_experience_band: "0-2",
    target_track: "consulting",
    source: "team_email",
    completedDaysAgo: 14,
    persona: {
      title: "Ishita Sharma · PGP Co'27, writing about a finished course",
      shows:
        "Took Business Analytics in Term 5 and has not reviewed it yet: the 4-step review form from scratch",
      door: "reader",
      side: "contributor",
      role: "Co'27 writer",
      script: [
        {
          text: "Review Business Analytics, the course you took in Term 5. The professor is already chosen.",
          href: "/write/course-review?course=c0000000-0000-4000-8000-000000000008",
          link: "Start the review",
        },
        {
          text: "Go through the 4 steps. Answers save as you go: close the tab and reopen it to check.",
        },
        {
          text: "Try to continue with a rating but no reason, or a mix that is not 100%: both are stopped.",
        },
        {
          text: "Publish, then switch to Ananya and find your review on Business Analytics.",
          href: "/sample-accounts",
          link: "Switch persona",
        },
      ],
    },
  }),
  person({
    id: P.ravi,
    email: "ravi.menon@isb.edu",
    full_name: "Ravi Menon",
    programme: "pgp",
    cohort: "Co'27",
    background_function: "consulting",
    background_industry: "bfsi",
    years_experience_band: "3-5",
    target_track: "product",
    completedDaysAgo: 12,
    persona: {
      title: "Ravi Menon · PGP Co'27 student",
      shows:
        "Browse and filter courses, read reviews, ask an author, the post-bid survey, his own review",
      door: "reader",
    },
  }),
  person({
    id: P.meera,
    email: "meera.das@isb.edu",
    full_name: "Meera Das",
    programme: "pgp_yl",
    cohort: "YL 2026-28",
    background_function: "engineering",
    background_industry: "it_software",
    years_experience_band: "6-8",
    target_track: "general_management",
    completedDaysAgo: 9,
    persona: {
      title: "Meera Das · PGP YL student",
      shows: "A YL first-year reading what Co'26 learned; she has a question waiting for an answer",
      door: "reader",
    },
  }),
  person({
    id: P.asha,
    email: "asha.rao@isb.edu",
    full_name: "Asha Rao",
    programme: "alum",
    cohort: "Co'26",
    background_function: "finance",
    background_industry: "consulting",
    years_experience_band: "3-5",
    target_track: "product",
    completedDaysAgo: 20,
    source: "team_email",
    persona: {
      title: "Asha Rao · Co'26 alum, writes under her name",
      shows: "A senior with reviews live, a question waiting for her answer, My activity",
      door: "reader",
    },
  }),
  person({
    id: P.kiran,
    email: "kiran.shah@example.com",
    full_name: "Kiran Shah",
    programme: "alum",
    cohort: "Co'26",
    background_function: "analytics",
    background_industry: "ecommerce",
    years_experience_band: "3-5",
    target_track: "finance",
    account_type: "contributor",
    verification_status: "verified",
    source: "campaign:co26-term7",
    completedDaysAgo: 18,
    persona: {
      title: "Kiran Shah · Co'26 alum, verified, writes anonymously",
      shows: "Reviews shown as “Verified Co'26 student”; replies show as “Author”",
      door: "contributor",
    },
  }),
  person({
    id: P.dev,
    email: "dev.nair@example.com",
    full_name: "Dev Nair",
    programme: "alum",
    cohort: "Co'25",
    background_function: "marketing",
    background_industry: "fmcg_retail",
    years_experience_band: "6-8",
    target_track: "marketing",
    account_type: "contributor",
    verification_status: "pending",
    source: "campaign:co25-term7",
    completedDaysAgo: 1,
    persona: {
      title: "Dev Nair · Co'25 alum, not verified yet",
      shows: "What an alum sees before verification: can write, cannot read",
      door: "contributor",
    },
  }),
  person({
    id: P.nisha,
    email: "nisha.kapoor@isb.edu",
    full_name: "Nisha Kapoor",
    programme: "pgp",
    cohort: "Co'27",
    background_function: "product",
    background_industry: "it_software",
    years_experience_band: "3-5",
    target_track: "product",
    role: "moderator",
    completedDaysAgo: 30,
    persona: {
      title: "Nisha Kapoor · Moderator (Group 12)",
      shows: "Flags queue, verifying alumni, courses and outreach imports, metrics, settings",
      door: "reader",
    },
  }),
  person({
    id: P.rohan,
    email: "rohan.iyer@isb.edu",
    full_name: null,
    programme: null,
    cohort: null,
    background_function: null,
    background_industry: null,
    years_experience_band: null,
    target_track: null,
    source: null,
    completedDaysAgo: null,
    persona: {
      title: "Rohan Iyer · New student, first visit",
      shows: "The one-screen “About you” onboarding, then Home",
      door: "reader",
    },
  }),
  // Background authors (not on the persona screen).
  person({
    id: P.tara,
    email: "tara.iyer@isb.edu",
    full_name: "Tara Iyer",
    programme: "alum",
    cohort: "Co'26",
    background_function: "consulting",
    background_industry: "consulting",
    years_experience_band: "3-5",
    target_track: "consulting",
    completedDaysAgo: 22,
  }),
  person({
    id: P.vikram,
    email: "vikram.shah@isb.edu",
    full_name: "Vikram Shah",
    programme: "alum",
    cohort: "Co'26",
    background_function: "finance",
    background_industry: "bfsi",
    years_experience_band: "6-8",
    target_track: "finance",
    completedDaysAgo: 21,
  }),
  person({
    id: P.neha,
    email: "neha.joshi@isb.edu",
    full_name: "Neha Joshi",
    programme: "alum",
    cohort: "Co'26",
    background_function: "sales",
    background_industry: "fmcg_retail",
    years_experience_band: "3-5",
    target_track: "marketing",
    completedDaysAgo: 19,
  }),
  person({
    id: P.arnav,
    email: "arnav.gupta@isb.edu",
    full_name: "Arnav Gupta",
    programme: "alum",
    cohort: "Co'26",
    background_function: "engineering",
    background_industry: "it_software",
    years_experience_band: "0-2",
    target_track: "product",
    completedDaysAgo: 17,
  }),
];

// ------------------------------------------------------------------ courses
export type SeedCourse = {
  id: string;
  code: string;
  title: string;
  area: string;
  offerings: { key: string; professor: string; term: string; cohort: string; current?: boolean }[];
};

export const COURSES: SeedCourse[] = [
  {
    id: id("c", 1),
    code: "MKT-501",
    title: "Pricing Strategy",
    area: "Marketing",
    offerings: [
      { key: "pricing-26", professor: "Prof Sen", term: "Term 7", cohort: "Co'26" },
      {
        key: "pricing-27",
        professor: "Prof Bhatt",
        term: "Term 7",
        cohort: "Co'27",
        current: true,
      },
    ],
  },
  {
    id: id("c", 2),
    code: "FIN-502",
    title: "Corporate Valuation",
    area: "Finance",
    offerings: [
      { key: "valuation-26", professor: "Prof Iyer", term: "Term 7", cohort: "Co'26" },
      {
        key: "valuation-27",
        professor: "Prof Iyer",
        term: "Term 7",
        cohort: "Co'27",
        current: true,
      },
    ],
  },
  {
    id: id("c", 3),
    code: "STR-503",
    title: "Product Management",
    area: "Strategy",
    offerings: [
      { key: "pm-26", professor: "Prof Rao", term: "Term 7", cohort: "Co'26" },
      { key: "pm-27", professor: "Prof Rao", term: "Term 7", cohort: "Co'27", current: true },
    ],
  },
  {
    id: id("c", 4),
    code: "NEG-504",
    title: "Negotiation Analysis",
    area: "Organisational Behaviour",
    offerings: [
      { key: "neg-27", professor: "Prof Kulkarni", term: "Term 7", cohort: "Co'27", current: true },
    ],
  },
  {
    id: id("c", 5),
    code: "OPS-505",
    title: "Data Science for Managers",
    area: "Operations",
    offerings: [
      { key: "ds-26", professor: "Prof Menon", term: "Term 7", cohort: "Co'26" },
      { key: "ds-27", professor: "Prof Menon", term: "Term 7", cohort: "Co'27", current: true },
    ],
  },
  {
    id: id("c", 6),
    code: "MKT-506",
    title: "Strategic Brand Management",
    area: "Marketing",
    offerings: [
      { key: "brand-25", professor: "Prof Das", term: "Term 7", cohort: "Co'25" },
      { key: "brand-27", professor: "Prof Das", term: "Term 7", cohort: "Co'27", current: true },
    ],
  },
  {
    id: id("c", 7),
    code: "FIN-507",
    title: "Venture Capital and Private Equity",
    area: "Finance",
    offerings: [
      { key: "vc-26", professor: "Prof Khanna", term: "Term 7", cohort: "Co'26" },
      { key: "vc-27", professor: "Prof Khanna", term: "Term 7", cohort: "Co'27", current: true },
    ],
  },
  {
    id: id("c", 8),
    code: "STR-508",
    title: "Business Analytics",
    area: "Strategy",
    offerings: [
      { key: "ba-27", professor: "Prof Pillai", term: "Term 5", cohort: "Co'27", current: true },
    ],
  },
];

// ------------------------------------------------------------------ reviews
export type SeedReview = {
  key: string;
  offering: string;
  author: string;
  anonymous?: boolean;
  /** "live" unless the author is not verified yet. */
  status?: "live" | "pending_verification" | "draft";
  daysAgo: number;
  closedToQuestions?: boolean;
  onBehalfOf?: { name: string; cohort: string };
  why: string[];
  workload: "0-2" | "2-4" | "4-6" | "6+";
  /** participation, quizzes, individual, group, midterm, final: must total 100 */
  mix: [number, number, number, number, number, number];
  outlineGap: string;
  quantQual: 1 | 2 | 3 | 4 | 5;
  styles: string[];
  risk: "low" | "medium" | "high";
  riskWhy: string;
  learning: 1 | 2 | 3 | 4 | 5;
  learningWhy: string;
  careers: string[];
  take?: string;
  skip?: string;
  outline: "yes" | "partly" | "no";
};

export const REVIEWS: SeedReview[] = [
  // Pricing Strategy: all reviews are for Prof Sen; Prof Bhatt teaches it now.
  {
    key: "r-pricing-asha",
    offering: "pricing-26",
    author: P.asha,
    daysAgo: 16,
    why: ["career_fit", "interest"],
    workload: "4-6",
    mix: [20, 10, 20, 20, 0, 30],
    outlineGap:
      "The group project has four graded sub-parts that the outline never lists, and two of them land in the same week as the mid-term of other electives.",
    quantQual: 3,
    styles: ["case_discussion", "guest_heavy"],
    risk: "medium",
    riskWhy: "Tight curve; the final decides most of it.",
    learning: 5,
    learningWhy:
      "Every case maps to a real pricing call. I used the value-based pricing framework in my first month as a PM.",
    careers: ["product_management", "brand_management"],
    take: "Anyone heading to product or marketing roles.",
    outline: "partly",
  },
  {
    key: "r-pricing-kiran",
    offering: "pricing-26",
    author: P.kiran,
    anonymous: true,
    daysAgo: 14,
    why: ["career_fit"],
    workload: "4-6",
    mix: [30, 0, 20, 20, 0, 30],
    outlineGap:
      "Class participation is graded every single session and cold calls are frequent, which the outline describes only as 'participation 30%'.",
    quantQual: 4,
    styles: ["case_discussion"],
    risk: "high",
    riskWhy: "Participation marks are harsh if you miss sessions.",
    learning: 4,
    learningWhy:
      "The conjoint and willingness-to-pay sessions were the most practical quant work I did all year.",
    careers: ["product_management", "strategy_consulting"],
    skip: "If you want a light term: the project and cold calls together are heavy.",
    outline: "no",
  },
  {
    key: "r-pricing-tara",
    offering: "pricing-26",
    author: P.tara,
    daysAgo: 13,
    why: ["interest", "friends"],
    workload: "2-4",
    mix: [20, 10, 20, 20, 0, 30],
    outlineGap:
      "Guest speakers take up four sessions and the final draws heavily on what they said, so missing them hurts more than the outline suggests.",
    quantQual: 3,
    styles: ["case_discussion", "guest_heavy"],
    risk: "medium",
    riskWhy: "Final is open book but long; time runs out.",
    learning: 4,
    learningWhy:
      "Strong for consulting interviews: three of my case interview questions were pricing cases straight out of this class.",
    careers: ["strategy_consulting"],
    take: "Consultants who want pricing cases for interviews.",
    outline: "partly",
  },
  // Corporate Valuation: same professor both years.
  {
    key: "r-val-vikram",
    offering: "valuation-26",
    author: P.vikram,
    daysAgo: 15,
    why: ["career_fit", "concentration_credit"],
    workload: "6+",
    mix: [10, 20, 30, 10, 0, 30],
    outlineGap:
      "Every weekly problem set is a full DCF in Excel; budget six to eight hours a week, which the outline does not say.",
    quantQual: 5,
    styles: ["lecture", "project"],
    risk: "high",
    riskWhy: "Quant-heavy final with no partial credit for set-up.",
    learning: 5,
    learningWhy:
      "The best preparation for banking and PE technicals; I reused my model template in two interviews.",
    careers: ["investment_banking", "pe_vc", "corporate_finance"],
    take: "Anyone targeting IB, PE or corporate development.",
    skip: "If you have never built a financial model, take a refresher first.",
    outline: "yes",
  },
  {
    key: "r-val-kiran",
    offering: "valuation-26",
    author: P.kiran,
    anonymous: true,
    daysAgo: 12,
    why: ["career_fit"],
    workload: "6+",
    mix: [10, 20, 30, 10, 0, 30],
    outlineGap:
      "The final project uses a live company and Prof Iyer expects you to defend every assumption in a viva, which is not in the outline.",
    quantQual: 5,
    styles: ["lecture", "project"],
    risk: "high",
    riskWhy: "The viva is unpredictable and counts for a lot.",
    learning: 4,
    learningWhy:
      "Hard but worth it; the viva taught me to defend numbers the way I now do in investment committee.",
    careers: ["investment_banking", "corporate_finance"],
    take: "Finance track students with time to spare this term.",
    outline: "partly",
  },
  {
    key: "r-val-asha",
    offering: "valuation-26",
    author: P.asha,
    daysAgo: 11,
    why: ["concentration_credit", "professor"],
    workload: "4-6",
    mix: [10, 20, 30, 10, 0, 30],
    outlineGap: "The readings are optional on paper but the quizzes test them directly.",
    quantQual: 4,
    styles: ["lecture"],
    risk: "medium",
    riskWhy: "Quizzes are frequent but small.",
    learning: 4,
    learningWhy: "Gave me enough finance fluency to talk to CFOs as a PM; not just for bankers.",
    careers: ["fpa", "product_management"],
    take: "Non-finance people who want real fluency.",
    outline: "partly",
  },
  {
    key: "r-val-neha",
    offering: "valuation-26",
    author: P.neha,
    daysAgo: 9,
    why: ["grades"],
    workload: "6+",
    mix: [10, 20, 30, 10, 0, 30],
    outlineGap: "Office hours fill up fast before the project deadline; book a week ahead.",
    quantQual: 5,
    styles: ["lecture", "project"],
    risk: "high",
    riskWhy: "I took it for grades and it was the hardest A of the year.",
    learning: 3,
    learningWhy:
      "Useful, but too technical for a marketing career; I would choose differently now.",
    careers: ["corporate_finance"],
    skip: "Marketing track students who want a gentle term.",
    outline: "yes",
  },
  // Product Management.
  {
    key: "r-pm-asha",
    offering: "pm-26",
    author: P.asha,
    daysAgo: 10,
    why: ["career_fit", "interest"],
    workload: "4-6",
    mix: [20, 0, 20, 30, 0, 30],
    outlineGap:
      "The group project is a real PRD for a partner startup, with two founder reviews that the outline does not mention.",
    quantQual: 2,
    styles: ["workshop", "project", "guest_heavy"],
    risk: "low",
    riskWhy: "Generous on effort; clear rubric.",
    learning: 5,
    learningWhy:
      "The single most useful course for PM interviews; my PRD from class became my portfolio piece.",
    careers: ["product_management"],
    take: "Career switchers into product, especially from finance or consulting.",
    outline: "partly",
  },
  {
    key: "r-pm-arnav",
    offering: "pm-26",
    author: P.arnav,
    daysAgo: 8,
    why: ["career_fit"],
    workload: "4-6",
    mix: [20, 0, 20, 30, 0, 30],
    outlineGap:
      "Expect weekly user interviews outside class time; scheduling them is the hardest part.",
    quantQual: 2,
    styles: ["workshop", "project"],
    risk: "low",
    riskWhy: "Grades track effort closely.",
    learning: 4,
    learningWhy: "Great structure; if you were a PM before ISB, the first half will feel familiar.",
    careers: ["product_management"],
    take: "First-time PMs.",
    skip: "Ex-PMs looking for something new.",
    outline: "yes",
  },
  {
    key: "r-pm-tara",
    offering: "pm-26",
    author: P.tara,
    daysAgo: 7,
    why: ["interest", "friends"],
    workload: "2-4",
    mix: [20, 0, 20, 30, 0, 30],
    outlineGap: "The final is a product teardown presentation, not a written exam.",
    quantQual: 2,
    styles: ["workshop", "guest_heavy"],
    risk: "low",
    riskWhy: "Presentation-based; well supported.",
    learning: 4,
    learningWhy: "Good even for consultants; product thinking came up in my strategy interviews.",
    careers: ["product_management", "strategy_consulting"],
    take: "Consultants curious about product.",
    outline: "yes",
  },
  // Data Science for Managers: only two reviews (low confidence).
  {
    key: "r-ds-vikram",
    offering: "ds-26",
    author: P.vikram,
    daysAgo: 6,
    why: ["career_fit", "workload"],
    workload: "2-4",
    mix: [10, 30, 30, 0, 0, 30],
    outlineGap: "Python is assumed from week two even though the outline says no prerequisites.",
    quantQual: 4,
    styles: ["lecture", "workshop"],
    risk: "medium",
    riskWhy: "Weekly quizzes add up.",
    learning: 3,
    learningWhy: "Fine introduction, but too shallow if you already code.",
    careers: ["strategy_bizops", "growth_analytics"],
    take: "Managers who want to talk to data teams.",
    outline: "partly",
  },
  {
    key: "r-ds-neha",
    offering: "ds-26",
    author: P.neha,
    daysAgo: 5,
    why: ["interest"],
    workload: "4-6",
    mix: [10, 30, 30, 0, 0, 30],
    outlineGap: "The labs run long; plan for an extra two hours a week.",
    quantQual: 4,
    styles: ["workshop"],
    risk: "medium",
    riskWhy: "Lab grading is strict on formatting.",
    learning: 4,
    learningWhy:
      "For a non-coder this opened a door; I now read analytics dashboards with confidence.",
    careers: ["digital_marketing", "growth_analytics"],
    take: "Non-coders who want to start.",
    outline: "no",
  },
  // Strategic Brand Management: one live review, one waiting for Dev's verification.
  {
    key: "r-brand-concierge",
    offering: "brand-25",
    author: P.nisha,
    daysAgo: 4,
    onBehalfOf: { name: "Sanjana Pai", cohort: "Co'25" },
    why: ["career_fit"],
    workload: "2-4",
    mix: [30, 0, 20, 20, 0, 30],
    outlineGap:
      "The brand audit project needs primary research in Hyderabad stores; transport time is not in the outline.",
    quantQual: 1,
    styles: ["case_discussion", "project"],
    risk: "low",
    riskWhy: "Generous grading for effort.",
    learning: 4,
    learningWhy: "The brand audit is exactly what FMCG interviewers ask you to walk through.",
    careers: ["brand_management"],
    take: "FMCG marketing hopefuls.",
    outline: "partly",
  },
  {
    key: "r-brand-dev",
    offering: "brand-25",
    author: P.dev,
    status: "pending_verification",
    daysAgo: 1,
    why: ["career_fit", "professor"],
    workload: "2-4",
    mix: [30, 0, 20, 20, 0, 30],
    outlineGap: "Prof Das grades the class blog posts, which the outline lists as optional.",
    quantQual: 1,
    styles: ["case_discussion"],
    risk: "low",
    riskWhy: "Clear expectations.",
    learning: 5,
    learningWhy: "Shaped how I run brand reviews as a marketing manager today.",
    careers: ["brand_management", "sales_category"],
    take: "Anyone going into brand roles.",
    outline: "partly",
  },
  // Venture Capital and Private Equity.
  {
    key: "r-vc-vikram",
    offering: "vc-26",
    author: P.vikram,
    daysAgo: 3,
    why: ["career_fit", "professor"],
    workload: "4-6",
    mix: [20, 0, 20, 30, 0, 30],
    outlineGap: "The term sheet negotiation simulation is graded and runs over a weekend.",
    quantQual: 4,
    styles: ["case_discussion", "guest_heavy"],
    risk: "medium",
    riskWhy: "Simulation results affect the grade.",
    learning: 5,
    learningWhy: "Guest GPs were the best networking of the year; two of them now mentor me.",
    careers: ["pe_vc"],
    take: "VC and PE track students.",
    outline: "partly",
  },
  {
    key: "r-vc-arnav",
    offering: "vc-26",
    author: P.arnav,
    daysAgo: 2,
    why: ["interest"],
    workload: "2-4",
    mix: [20, 0, 20, 30, 0, 30],
    outlineGap:
      "Pitches are judged by visiting investors, so preparation matters more than the outline suggests.",
    quantQual: 3,
    styles: ["guest_heavy", "case_discussion"],
    risk: "medium",
    riskWhy: "Investor panel marks vary.",
    learning: 4,
    learningWhy: "Useful for anyone thinking of founding, not only investors.",
    careers: ["pe_vc", "entrepreneurship"],
    take: "Founders-to-be.",
    outline: "yes",
    closedToQuestions: true,
  },
  // Primary persona Karan: a live review with a question waiting (from Arjun).
  {
    key: "r-pm-karan",
    offering: "pm-26",
    author: P.karan,
    daysAgo: 10,
    why: ["career_fit", "professor"],
    workload: "4-6",
    mix: [20, 0, 20, 30, 0, 30],
    outlineGap:
      "The group project is a full product teardown with a live user interview round; plan for two weekends of fieldwork that the outline does not mention.",
    quantQual: 2,
    styles: ["case_discussion", "project"],
    risk: "medium",
    riskWhy: "Group marks dominate, so your team matters more than usual.",
    learning: 5,
    learningWhy:
      "I came from engineering, and this was where I learned to write a PRD and defend priorities. I used the prioritisation exercise in my first product interview.",
    careers: ["product_management"],
    take: "Anyone switching into product, especially without a product title before ISB.",
    outline: "partly",
  },
  // Business Analytics (Term 5): Ravi's own review, so his course page shows "Your review".
  {
    key: "r-ba-ravi",
    offering: "ba-27",
    author: P.ravi,
    daysAgo: 20,
    why: ["concentration_credit", "workload"],
    workload: "2-4",
    mix: [20, 20, 20, 10, 0, 30],
    outlineGap: "The Excel solver labs are graded on time; practise the shortcuts beforehand.",
    quantQual: 4,
    styles: ["lecture", "workshop"],
    risk: "low",
    riskWhy: "Predictable quizzes.",
    learning: 4,
    learningWhy: "Solid foundation in decision models that I already used in a case competition.",
    careers: ["strategy_consulting", "strategy_bizops"],
    take: "Anyone who wants a structured quant course.",
    outline: "yes",
  },
];

// ----------------------------------------------------------------- comments
export type SeedComment = {
  key: string;
  review: string;
  author: string;
  body: string;
  hoursAgo: number;
  /** A reply to another seeded comment. */
  replyTo?: string;
};

export const COMMENTS: SeedComment[] = [
  // Primary personas: Arjun asked Karan; not answered yet.
  {
    key: "q-pm-arjun",
    review: "r-pm-karan",
    author: P.arjun,
    body: "I am a CA coming from banking with no product experience. Did the project need any coding or wireframing, or can a non-tech person carry their weight?",
    hoursAgo: 20,
  },
  // Answered: Ravi asked Asha, Asha replied.
  {
    key: "q-pricing-final",
    review: "r-pricing-asha",
    author: P.ravi,
    body: "How heavy is the final? Is it open book?",
    hoursAgo: 72,
  },
  {
    key: "a-pricing-final",
    review: "r-pricing-asha",
    author: P.asha,
    replyTo: "q-pricing-final",
    body: "About 30 percent, open book, but long. Practise timing with last year's paper.",
    hoursAgo: 60,
  },
  {
    key: "r2-pricing-final",
    review: "r-pricing-asha",
    author: P.ravi,
    replyTo: "q-pricing-final",
    body: "Thanks, that helps a lot.",
    hoursAgo: 58,
  },
  // Answered by an anonymous author (shows as "Author").
  {
    key: "q-val-viva",
    review: "r-val-kiran",
    author: P.ravi,
    body: "What does the viva actually test: the model or the story?",
    hoursAgo: 40,
  },
  {
    key: "a-val-viva",
    review: "r-val-kiran",
    author: P.kiran,
    replyTo: "q-val-viva",
    body: "Mostly the assumptions. Be ready to defend your growth rate and WACC with sources.",
    hoursAgo: 30,
  },
  // Waiting for Kiran's answer (asked by Meera, PGP YL).
  {
    key: "q-val-load",
    review: "r-val-kiran",
    author: P.meera,
    body: "Would you take it again with a full placement load in the same term?",
    hoursAgo: 20,
  },
  // Waiting for Asha's answer.
  {
    key: "q-pm-switch",
    review: "r-pm-asha",
    author: P.ravi,
    body: "I'm switching from consulting to product. Is this enough on its own, or should I pair it with Data Science for Managers?",
    hoursAgo: 8,
  },
  // Flagged comments (see FLAGS).
  {
    key: "c-flag-personal",
    review: "r-val-neha",
    author: P.arnav,
    body: "Honestly the professor plays favourites in the viva.",
    hoursAgo: 26,
  },
  {
    key: "c-flag-pay",
    review: "r-vc-vikram",
    author: P.tara,
    body: "Worth it: the fund that hired me offered 32 LPA.",
    hoursAgo: 18,
  },
];

// -------------------------------------------------------------------- flags
export const FLAGS: {
  target: { review?: string; comment?: string };
  reporter: string | null;
  reason: string;
  hoursAgo: number;
  auto?: boolean;
}[] = [
  {
    target: { comment: "c-flag-personal" },
    reporter: P.meera,
    reason: "A personal remark about faculty, staff or students",
    hoursAgo: 22,
  },
  {
    target: { comment: "c-flag-pay" },
    reporter: null,
    reason: "Possible pay or offer figure, posted after the warning",
    hoursAgo: 18,
    auto: true,
  },
  {
    target: { review: "r-ds-neha" },
    reporter: P.ravi,
    reason: "False or misleading: Python is not required",
    hoursAgo: 5,
  },
];

// ------------------------------------------------------------ outreach list
export const OUTREACH: {
  name: string;
  cohort: string;
  email?: string;
  courses: string[];
  campaign: string;
  claimedBy?: string;
}[] = [
  {
    name: "Kiran Shah",
    cohort: "Co'26",
    email: "kiran.shah@example.com",
    courses: ["MKT-501", "FIN-502"],
    campaign: "co26-term7",
    claimedBy: P.kiran,
  },
  { name: "Dev Nair", cohort: "Co'25", courses: ["MKT-506"], campaign: "co25-term7" },
  { name: "Sanjana Pai", cohort: "Co'25", courses: ["MKT-506"], campaign: "co25-term7" },
  { name: "Rahul Bose", cohort: "Co'26", courses: ["NEG-504", "OPS-505"], campaign: "co26-term7" },
  { name: "Ishita Verma", cohort: "Co'26", courses: ["FIN-507"], campaign: "co26-term7" },
];

// ----------------------------------------------------- background activity
// Anonymous readers whose clicks and survey answers fill the metrics page.
// They never appear on screen by name.
export const BACKGROUND = {
  /** PGP Co'27 readers. */
  pgpReaders: 46,
  /** PGP YL readers. */
  ylReaders: 9,
  /** Of all background readers: share who viewed a course page with 3+ reviews. */
  valueShare: 0.7,
  /** Share who came back on a later day. */
  returnShare: 0.3,
  /** Post-bid survey answers, in order: changed (with a course named), confirmed, no effect, did not use. */
  postBid: { changed: 8, confirmed: 12, noEffect: 7, didNotUse: 5 },
  /** Readers who clicked "Request a chat"; how many of them asked for early access. */
  chatClicks: 9,
  chatEarlyAccess: 5,
  /** People who opened the review form but did not submit. */
  formAbandoned: 6,
};
