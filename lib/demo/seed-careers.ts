// ISB Hood demo data: career entries (track playbooks and company notes).
//
// Edit freely, then press "Reset demo data". The people are fictional and so is
// every word they "wrote". Company names are real recruiters, used only so the
// demo looks realistic: nothing here describes any firm's actual process.
// Never put pay or offer figures here (the app does not collect them).

import { id, P } from "./seed-data";

// Id prefix: 0c = career entries, 0f = comments on career entries.

type Band = "0" | "1-2" | "3-5" | "6-10" | "11-20" | "20+";

export type SeedPlaybook = {
  key: string;
  author: string;
  anonymous?: boolean;
  /** "pending": the author is not verified yet, so the entry waits. */
  status?: "live" | "pending_verification";
  daysAgo: number;
  from: { function: string; industry: string; years_band: string };
  to: { track: string; role: string; company_type: string; company?: string };
  path: {
    before_isb?: string;
    early_terms?: string;
    mid_terms?: string;
    late_terms?: string;
    placement_weeks?: string;
  };
  numbers: { applied: Band; shortlists: Band; interviews: Band; offers: Band };
  mattered: { picks: string[]; why: string };
  /** Course codes from seed-data COURSES. */
  courses: string[];
  latest_safe_start: string;
  mistakes_to_avoid: string;
};

export type SeedCompanyNote = {
  key: string;
  author: string;
  anonymous?: boolean;
  daysAgo: number;
  company: string;
  role: string;
  year: string;
  track: string;
  relationship: "interviewed" | "interned" | "joined";
  process_rounds: string;
  what_was_asked: string;
  prep_that_worked: string;
  culture_and_team?: string;
  recommend: "yes" | "depends" | "no";
  recommend_to_whom: string;
};

export const careerId = (n: number) => id("0c", n);

export const PLAYBOOKS: SeedPlaybook[] = [
  {
    key: "pb-tara-consulting",
    author: P.tara,
    daysAgo: 14,
    from: { function: "consulting", industry: "consulting", years_band: "3-5" },
    to: {
      track: "consulting",
      role: "Associate",
      company_type: "consulting",
      company: "McKinsey & Company",
    },
    path: {
      before_isb:
        "Three years at a Big Four advisory practice. I wrote down five client stories in STAR form before I joined.",
      early_terms:
        "Joined the consulting club, did 2 cases a day from week 3, and kept my GPA in the top third. Skipped most competitions.",
      mid_terms:
        "Moved to cases with ex-consultants only. Did 40 or so in total by the end of Term 5, logging feedback in one sheet.",
      late_terms:
        "Practised market sizing and charts under time pressure. Two mock partner interviews a week from Term 6.",
      placement_weeks:
        "Day 0 shortlist from the CV. Three rounds in one day; the last one was mostly about why consulting again.",
    },
    numbers: { applied: "6-10", shortlists: "3-5", interviews: "3-5", offers: "1-2" },
    mattered: {
      picks: ["case_or_interview_prep", "cv_story", "gpa"],
      why: "Shortlists followed the CV and GPA. After that it was all case practice with honest partners who stopped me when I rambled.",
    },
    courses: ["NEG-504", "STR-508"],
    latest_safe_start:
      "Serious case practice by the start of Term 4. Later than that, you are practising with people who are already ahead.",
    mistakes_to_avoid:
      "Doing 100 cases with anyone who is free. Twenty good ones with structured feedback beat that. Do not ignore fit questions.",
  },
  {
    key: "pb-sid-consulting",
    author: P.sid,
    anonymous: true,
    daysAgo: 12,
    from: { function: "engineering", industry: "it_software", years_band: "3-5" },
    to: {
      track: "consulting",
      role: "Consultant",
      company_type: "consulting",
      company: "Bain & Company",
    },
    path: {
      before_isb:
        "Software engineer for four years. No consulting exposure, so my CV had to explain the switch.",
      early_terms:
        "Rewrote my CV three times with seniors. Took on a POR in the strategy club to show business work.",
      mid_terms:
        "Two live projects with Hyderabad startups. Case practice four times a week; my structuring was weak at first.",
      late_terms: "Focused on numbers speed and synthesis. Recorded my cases and listened back.",
      placement_weeks:
        "Shortlisted at two firms. One interviewer spent half the time on why I was leaving tech.",
    },
    numbers: { applied: "11-20", shortlists: "1-2", interviews: "1-2", offers: "1-2" },
    mattered: {
      picks: ["cv_story", "pors", "case_or_interview_prep"],
      why: "As an engineer the CV story was everything: the POR and live projects gave me business examples to talk about.",
    },
    courses: ["STR-508", "OPS-505"],
    latest_safe_start:
      "If you are from tech, start on your CV story in Term 1. Cases can start in Term 3 if you are consistent.",
    mistakes_to_avoid:
      "Hiding the tech background. Interviewers liked it when I used it as an edge, not when I apologised for it.",
  },
  {
    key: "pb-arnav-product",
    author: P.arnav,
    daysAgo: 13,
    from: { function: "engineering", industry: "it_software", years_band: "0-2" },
    to: {
      track: "product",
      role: "Product Manager",
      company_type: "big_tech",
      company: "Amazon",
    },
    path: {
      before_isb: "Two years as a backend developer. Shipped one internal tool end to end.",
      early_terms:
        "Product club, one teardown a week posted on LinkedIn. Built a small side project to talk about in interviews.",
      mid_terms:
        "Did a product case competition and placed second. Started product sense and metrics mocks with Co'25 PMs.",
      late_terms:
        "Prepared leadership-principle stories: 12 stories mapped to the principles, each with numbers.",
      placement_weeks:
        "Written exercise, then three interviews. Every round asked for a story with data in it.",
    },
    numbers: { applied: "11-20", shortlists: "3-5", interviews: "3-5", offers: "1-2" },
    mattered: {
      picks: ["case_or_interview_prep", "competitions", "prior_domain"],
      why: "The tech background got me past the screen. The competition gave me a story about working with users, which I had none of.",
    },
    courses: ["STR-503", "OPS-505"],
    latest_safe_start:
      "Product mocks from Term 4 are fine if you have shipped something before. Without that, start a side project by Term 2.",
    mistakes_to_avoid:
      "Over-preparing frameworks. Interviewers wanted my own judgement and what I would cut, not a memorised structure.",
  },
  {
    key: "pb-farah-product",
    author: P.farah,
    daysAgo: 11,
    from: { function: "consulting", industry: "bfsi", years_band: "3-5" },
    to: {
      track: "product",
      role: "Associate Product Manager",
      company_type: "startup",
      company: "Razorpay",
    },
    path: {
      before_isb:
        "Risk consulting for banks for four years. I knew payments regulation but had never worked with engineers.",
      early_terms:
        "Learnt basic SQL and wireframing. Joined the product club and the fintech club; did one teardown a fortnight.",
      mid_terms:
        "Summer internship in a fintech product team. That internship was the turning point for the CV.",
      late_terms:
        "Took Product Management and Business Analytics. Practised product cases built around payments and lending.",
      placement_weeks:
        "Two fintechs shortlisted me because of the domain. Interviews were a product case plus a deep dive on my internship.",
    },
    numbers: { applied: "6-10", shortlists: "3-5", interviews: "3-5", offers: "1-2" },
    mattered: {
      picks: ["prior_domain", "case_or_interview_prep", "courses"],
      why: "BFSI domain was my way in: I applied where it counted, not everywhere. The PM course gave me vocabulary I did not have.",
    },
    courses: ["STR-503", "STR-508", "MKT-501"],
    latest_safe_start:
      "Coming from consulting, Term 3 is fine to start, as long as the summer internship is in product.",
    mistakes_to_avoid:
      "Applying to every product role. Firms that valued my domain called back; generic consumer apps did not.",
  },
  {
    key: "pb-asha-product",
    author: P.asha,
    daysAgo: 10,
    from: { function: "finance", industry: "consulting", years_band: "3-5" },
    to: {
      track: "product",
      role: "Product Manager",
      company_type: "big_tech",
      company: "Flipkart",
    },
    path: {
      before_isb: "Transaction advisory. Strong on numbers, nothing on users.",
      early_terms:
        "Spoke to six PMs in the first month to see if I really wanted it. Started a product notes habit.",
      mid_terms:
        "Product case competitions with a mixed team (engineer, designer, me on business case).",
      late_terms:
        "Metrics and root cause practice every day for six weeks. Took Pricing Strategy, which came up in interviews.",
      placement_weeks:
        "One shortlist went to a pricing case. Pricing Strategy was directly useful.",
    },
    numbers: { applied: "11-20", shortlists: "3-5", interviews: "3-5", offers: "1-2" },
    mattered: {
      picks: ["case_or_interview_prep", "courses", "networking"],
      why: "Talking to PMs early stopped me wasting a term. Metrics practice was what the interviews actually tested.",
    },
    courses: ["MKT-501", "STR-503"],
    latest_safe_start:
      "Decide by the end of Term 2. Metrics and product sense prep can start in Term 5 if you practise daily.",
    mistakes_to_avoid:
      "Treating product interviews like finance interviews. Fewer numbers, more why and for whom.",
  },
  {
    key: "pb-vikram-finance",
    author: P.vikram,
    daysAgo: 14,
    from: { function: "finance", industry: "bfsi", years_band: "6-8" },
    to: {
      track: "finance",
      role: "Investment Banking Associate",
      company_type: "financial",
      company: "Goldman Sachs",
    },
    path: {
      before_isb: "Corporate banking for six years. Good with credit, weak on valuation.",
      early_terms:
        "CFA Level 2 alongside Term 1 to 3 (hard, would not repeat). Finance club; built three models from scratch.",
      mid_terms: "Summer internship in an IB team. Learnt to write pitch book pages fast.",
      late_terms:
        "Corporate Valuation and VC and PE. Practised technical questions every evening with two friends.",
      placement_weeks:
        "Technical round on valuation and accounting, then a deal discussion, then fit.",
    },
    numbers: { applied: "6-10", shortlists: "1-2", interviews: "3-5", offers: "1-2" },
    mattered: {
      picks: ["prior_domain", "gpa", "case_or_interview_prep"],
      why: "IB shortlists were GPA and domain driven. After the shortlist, technical depth decided it.",
    },
    courses: ["FIN-502", "FIN-507"],
    latest_safe_start:
      "Technical prep by Term 3 at the latest. The summer internship decides most IB outcomes.",
    mistakes_to_avoid:
      "Doing CFA during the core terms. My GPA dipped in Term 2 and I had to explain it.",
  },
  {
    key: "pb-kiran-finance",
    author: P.kiran,
    anonymous: true,
    daysAgo: 9,
    from: { function: "analytics", industry: "ecommerce", years_band: "3-5" },
    to: {
      track: "finance",
      role: "Investment Analyst",
      company_type: "financial",
      company: "Kotak Investment Banking",
    },
    path: {
      before_isb: "Analytics lead in e-commerce. Never worked in finance.",
      early_terms:
        "Did the finance basics properly: accounting and corporate finance with extra problem sets.",
      mid_terms:
        "Stock pitch competitions; wrote two equity research notes on internet companies, which became my edge.",
      late_terms: "Valuation course, plus a modelling bootcamp the finance club ran.",
      placement_weeks:
        "They cared that I could value internet businesses. The case was a consumer tech IPO.",
    },
    numbers: { applied: "11-20", shortlists: "1-2", interviews: "1-2", offers: "1-2" },
    mattered: {
      picks: ["competitions", "prior_domain", "courses"],
      why: "With no finance job, the equity notes and competitions were my proof. Linking them to my sector made them stand out.",
    },
    courses: ["FIN-502", "FIN-507", "OPS-505"],
    latest_safe_start:
      "From a non-finance background, start the basics in Term 1. Trying to switch in Term 5 is too late for IB.",
    mistakes_to_avoid:
      "Competing with ex-bankers on generic technicals. Pick a sector you know and go deep.",
  },
  {
    key: "pb-neha-marketing",
    author: P.neha,
    daysAgo: 12,
    from: { function: "sales", industry: "fmcg_retail", years_band: "3-5" },
    to: {
      track: "marketing",
      role: "Assistant Brand Manager",
      company_type: "fmcg",
      company: "Hindustan Unilever",
    },
    path: {
      before_isb: "Area sales manager for a beverages company. Lots of trade, no brand work.",
      early_terms:
        "Marketing club and two marketing case competitions. I went to every FMCG guest session.",
      mid_terms:
        "Summer internship in FMCG sales and marketing. Asked to do a brand project on top.",
      late_terms: "Strategic Brand Management and Pricing Strategy. Practised brand cases weekly.",
      placement_weeks: "Group discussion, then a case on a product launch, then an HR round.",
    },
    numbers: { applied: "6-10", shortlists: "3-5", interviews: "3-5", offers: "1-2" },
    mattered: {
      picks: ["competitions", "prior_domain", "cv_story"],
      why: "Sales experience is respected in FMCG. Competitions proved I could think about brands, not only sell them.",
    },
    courses: ["MKT-506", "MKT-501"],
    latest_safe_start:
      "Competitions in Terms 1 to 4 matter for FMCG shortlists; start in Term 1 if marketing is the goal.",
    mistakes_to_avoid:
      "Saying 'I love brands' in interviews. Talk about consumers and the distribution you saw on the ground.",
  },
  {
    key: "pb-priya-gm",
    author: P.priya,
    daysAgo: 8,
    from: { function: "operations", industry: "manufacturing", years_band: "6-8" },
    to: {
      track: "general_management",
      role: "Leadership programme",
      company_type: "conglomerate",
      company: "Aditya Birla Group",
    },
    path: {
      before_isb: "Plant operations for seven years; led a team of 40.",
      early_terms: "Kept my GPA high and took a POR in the student council.",
      mid_terms:
        "Live project on a manufacturing turnaround. Started reading annual reports of the big groups.",
      late_terms:
        "Negotiation Analysis and Business Analytics. Prepared leadership stories with numbers on teams and money.",
      placement_weeks:
        "Long process: psychometric test, case, panel with senior leaders, then a final with the group HR head.",
    },
    numbers: { applied: "3-5", shortlists: "1-2", interviews: "1-2", offers: "1-2" },
    mattered: {
      picks: ["prior_domain", "pors", "gpa"],
      why: "GM programmes looked for leadership with real scale. My plant years and the POR were the whole conversation.",
    },
    courses: ["NEG-504", "STR-508"],
    latest_safe_start:
      "With 6+ years of experience, you can decide on GM roles as late as Term 5; the experience does the work.",
    mistakes_to_avoid:
      "Applying only to GM programmes. There are few seats; I had a backup in operations strategy.",
  },
  {
    key: "pb-rahul-other",
    author: P.rahul,
    daysAgo: 7,
    from: { function: "public_social", industry: "government_nonprofit", years_band: "3-5" },
    to: {
      track: "other",
      role: "Founder's office",
      company_type: "startup",
      company: "Zerodha",
    },
    path: {
      before_isb: "Four years in a state government fellowship and a non-profit.",
      early_terms:
        "Took everything quantitative seriously to fix my weakest area. Joined the entrepreneurship cell.",
      mid_terms: "Worked part-time with a founder on fundraising and hiring; that became my story.",
      late_terms: "VC and PE plus Negotiation Analysis. Met founders through the E-cell.",
      placement_weeks:
        "Off campus mostly. Conversations with founders, then a two-week trial project.",
    },
    numbers: { applied: "6-10", shortlists: "1-2", interviews: "3-5", offers: "1-2" },
    mattered: {
      picks: ["networking", "cv_story", "courses"],
      why: "Founder's office roles are filled through people. The part-time work gave the founders something to check.",
    },
    courses: ["FIN-507", "NEG-504"],
    latest_safe_start:
      "Any time, but the network takes two terms to build. Start meeting founders by Term 4.",
    mistakes_to_avoid: "Waiting for these roles to come to campus. Most never do.",
  },
  {
    key: "pb-dev-marketing",
    author: P.dev,
    status: "pending_verification",
    daysAgo: 1,
    from: { function: "marketing", industry: "fmcg_retail", years_band: "6-8" },
    to: {
      track: "marketing",
      role: "Brand Manager",
      company_type: "fmcg",
      company: "Asian Paints",
    },
    path: {
      before_isb: "Six years in trade marketing for a personal care company.",
      mid_terms: "Two brand competitions and a summer internship in a paints company.",
      placement_weeks: "Case on rural distribution, then a panel with the marketing head.",
    },
    numbers: { applied: "3-5", shortlists: "1-2", interviews: "1-2", offers: "1-2" },
    mattered: {
      picks: ["prior_domain", "competitions"],
      why: "Trade marketing experience was exactly what they wanted for rural growth.",
    },
    courses: ["MKT-506"],
    latest_safe_start: "Term 3 for competitions.",
    mistakes_to_avoid: "Ignoring rural and distribution questions; they asked many.",
  },
];

export const COMPANY_NOTES: SeedCompanyNote[] = [
  {
    key: "cn-mckinsey",
    author: P.tara,
    daysAgo: 13,
    company: "McKinsey & Company",
    role: "Associate",
    year: "2026",
    track: "consulting",
    relationship: "joined",
    process_rounds:
      "CV shortlist, then three case interviews on one day. Each had a fit part at the start.",
    what_was_asked:
      "A market sizing for electric two-wheelers, a profitability case for a hospital chain, and a lot about a time I changed someone's mind.",
    prep_that_worked:
      "Partner-style mocks with ex-consultants. Practising math aloud without a calculator.",
    culture_and_team:
      "Long weeks when a project is live, but very good feedback culture. Staffing on your first project is mostly luck.",
    recommend: "yes",
    recommend_to_whom:
      "People who like structured problems and can take blunt feedback every week.",
  },
  {
    key: "cn-bain",
    author: P.sid,
    anonymous: true,
    daysAgo: 11,
    company: "Bain & Company",
    role: "Consultant",
    year: "2026",
    track: "consulting",
    relationship: "interned",
    process_rounds:
      "Two rounds for the internship: a written case and two interviews. The final round was a partner.",
    what_was_asked:
      "A due diligence case on a software company, and why I was leaving engineering.",
    prep_that_worked: "Reading the firm's published reports on the sectors I knew.",
    culture_and_team:
      "Very friendly team; case teams eat together. Clear expectations on what an intern owns.",
    recommend: "yes",
    recommend_to_whom: "Engineers who want to move to strategy and can tell that story clearly.",
  },
  {
    key: "cn-amazon",
    author: P.arnav,
    daysAgo: 12,
    company: "Amazon",
    role: "Product Manager",
    year: "2026",
    track: "product",
    relationship: "joined",
    process_rounds: "Written product exercise, then three interviews of about an hour each.",
    what_was_asked:
      "Leadership principle stories in every round. One product design question and one on metrics for a seller tool.",
    prep_that_worked:
      "Writing each story with a number in it. Practising follow-up questions until I could go three levels deep.",
    culture_and_team: "Lots of writing; documents instead of slides. You own a lot from week one.",
    recommend: "yes",
    recommend_to_whom: "People who like writing and owning metrics, and are fine with a fast pace.",
  },
  {
    key: "cn-razorpay",
    author: P.farah,
    daysAgo: 10,
    company: "Razorpay",
    role: "Associate Product Manager",
    year: "2026",
    track: "product",
    relationship: "joined",
    process_rounds:
      "Product case, a round with a senior PM on my internship, then a culture round with a founder-level leader.",
    what_was_asked:
      "Design a feature to cut failed payments for small merchants. How would you measure it?",
    prep_that_worked: "Using the product myself for a week and writing down every friction point.",
    culture_and_team:
      "Young, fast and informal. You are expected to talk to engineers and merchants directly.",
    recommend: "depends",
    recommend_to_whom:
      "Good if you have fintech or BFSI background and want to ship quickly. Hard if you want structure.",
  },
  {
    key: "cn-microsoft",
    author: P.asha,
    daysAgo: 9,
    company: "Microsoft",
    role: "Product Manager",
    year: "2026",
    track: "product",
    relationship: "interviewed",
    process_rounds: "Online test, then two interviews. I did not get through the final round.",
    what_was_asked:
      "Improve a productivity app for students. A question on how I would prioritise three asks from different teams.",
    prep_that_worked:
      "Product design practice helped. What I lacked was a technical answer on how the feature would work.",
    recommend: "depends",
    recommend_to_whom: "Prepare a technical layer to your answers if you are not from engineering.",
  },
  {
    key: "cn-goldman",
    author: P.vikram,
    daysAgo: 13,
    company: "Goldman Sachs",
    role: "Investment Banking Associate",
    year: "2026",
    track: "finance",
    relationship: "interned",
    process_rounds: "CV shortlist, technical interview, deal discussion and a fit round.",
    what_was_asked:
      "Walk through a DCF, how depreciation flows through the three statements, and a recent deal I followed.",
    prep_that_worked:
      "Following three deals in the news closely and practising a two-minute pitch on each.",
    culture_and_team: "Intense hours; teams are small, so you get real work quickly.",
    recommend: "yes",
    recommend_to_whom: "People sure about banking who can sustain long weeks for a few years.",
  },
  {
    key: "cn-hul",
    author: P.neha,
    daysAgo: 11,
    company: "Hindustan Unilever",
    role: "Assistant Brand Manager",
    year: "2026",
    track: "marketing",
    relationship: "joined",
    process_rounds: "Group discussion, case presentation, then a panel with HR and a brand leader.",
    what_was_asked:
      "Launch a new variant of a soap in a small town market. What would you change in the first 90 days?",
    prep_that_worked:
      "Visiting stores and talking to shopkeepers about the category before the interview.",
    culture_and_team:
      "Starts with months in sales on the ground. Strong training, clear career ladder.",
    recommend: "yes",
    recommend_to_whom: "People who enjoy consumers and the field, not only the strategy deck.",
  },
  {
    key: "cn-abg",
    author: P.priya,
    daysAgo: 8,
    company: "Aditya Birla Group",
    role: "Leadership programme",
    year: "2026",
    track: "general_management",
    relationship: "joined",
    process_rounds:
      "Psychometric test, business case, panel with senior leaders, final with the group HR head.",
    what_was_asked:
      "How I would turn around a loss-making plant. Many questions on handling unions and difficult teams.",
    prep_that_worked:
      "Preparing three leadership stories with the size of the team and the result.",
    culture_and_team:
      "Rotations across businesses in the first two years. Senior leaders know the programme by name.",
    recommend: "yes",
    recommend_to_whom: "Experienced people who want to run a business unit one day.",
  },
];

export type SeedCareerComment = {
  key: string;
  entry: string;
  author: string;
  body: string;
  hoursAgo: number;
  replyTo?: string;
};

export const CAREER_COMMENTS: SeedCareerComment[] = [
  // Ravi (consulting, BFSI, wants product) asks Farah, who has his background. Answered.
  {
    key: "q-farah-internship",
    entry: "pb-farah-product",
    author: P.ravi,
    body: "Did you get the product internship through campus or off campus? I am from risk consulting too.",
    hoursAgo: 50,
  },
  {
    key: "a-farah-internship",
    entry: "pb-farah-product",
    author: P.farah,
    replyTo: "q-farah-internship",
    body: "Through campus, but I only applied to fintechs. Happy to look at your CV story if you post the question here.",
    hoursAgo: 30,
  },
  // Waiting for Arnav.
  {
    key: "q-arnav-side",
    entry: "pb-arnav-product",
    author: P.nisha,
    body: "How big was the side project? Did interviewers actually ask about it?",
    hoursAgo: 18,
  },
  // Meera (YL, engineering) asks Priya about the GM programme. Waiting.
  {
    key: "q-priya-yl",
    entry: "cn-abg",
    author: P.meera,
    body: "Do they take PGP YL candidates for the leadership programme, or only the one-year PGP?",
    hoursAgo: 10,
  },
  // Answered by an anonymous author (shows as "Author").
  {
    key: "q-kiran-notes",
    entry: "pb-kiran-finance",
    author: P.ravi,
    body: "Where did you publish the equity research notes? Did they need to be public?",
    hoursAgo: 26,
  },
  {
    key: "a-kiran-notes",
    entry: "pb-kiran-finance",
    author: P.kiran,
    replyTo: "q-kiran-notes",
    body: "Just a PDF I could share in interviews and on LinkedIn. What mattered was that I could defend the numbers.",
    hoursAgo: 20,
  },
];
