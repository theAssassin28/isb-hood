// Controlled vocabularies (docs/BUILD_PLAN.md, section 5.5).
// [confirm] with the team by 17 Nov: changing values after entries exist is painful.
// Stored values are the `value` strings; labels can change freely.

type Option<V extends string = string> = { value: V; label: string };

const options = <const V extends string>(list: readonly Option<V>[]) => list;

export const PROGRAMMES = options([
  { value: "pgp", label: "PGP" },
  { value: "pgp_yl", label: "PGP YL" },
  { value: "alum", label: "Alum" },
]);

export const COHORTS = options([
  { value: "Co'25", label: "Co'25" },
  { value: "Co'26", label: "Co'26" },
  { value: "Co'27", label: "Co'27" },
  { value: "YL 2026-28", label: "PGP YL 2026-28" },
  { value: "other", label: "Other" },
]);

export const TRACKS = options([
  { value: "consulting", label: "Consulting" },
  { value: "product", label: "Product" },
  { value: "finance", label: "Finance" },
  { value: "general_management", label: "General management or strategy" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
]);

export const FUNCTIONS = options([
  { value: "consulting", label: "Consulting" },
  { value: "engineering", label: "Engineering / technology" },
  { value: "product", label: "Product" },
  { value: "finance", label: "Finance / accounting" },
  { value: "sales", label: "Sales / business development" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations / supply chain" },
  { value: "analytics", label: "Analytics / data" },
  { value: "hr", label: "HR" },
  { value: "entrepreneurship", label: "Entrepreneurship" },
  { value: "public_social", label: "Public sector / social" },
  { value: "other", label: "Other" },
]);

export const INDUSTRIES = options([
  { value: "it_software", label: "IT / software" },
  { value: "bfsi", label: "BFSI" },
  { value: "consulting", label: "Consulting" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "fmcg_retail", label: "FMCG / retail" },
  { value: "healthcare", label: "Healthcare / pharma" },
  { value: "energy_infra", label: "Energy / infrastructure" },
  { value: "ecommerce", label: "E-commerce / internet" },
  { value: "government_nonprofit", label: "Government / non-profit" },
  { value: "other", label: "Other" },
]);

export const COMPANY_TYPES = options([
  { value: "consulting", label: "MBB / consulting" },
  { value: "big_tech", label: "Big tech" },
  { value: "startup", label: "Startup / scale-up" },
  { value: "financial", label: "Bank / NBFC / fund" },
  { value: "conglomerate", label: "Conglomerate / GM programme" },
  { value: "fmcg", label: "FMCG" },
  { value: "other", label: "Other" },
]);

export const YEARS_EXPERIENCE_BANDS = ["0-2", "3-5", "6-8", "9+"] as const;

// Course review (requirements 5.1)
export const WHY_TAKEN = options([
  { value: "career_fit", label: "Career fit" },
  { value: "interest", label: "Interest" },
  { value: "professor", label: "Professor" },
  { value: "grades", label: "Grades" },
  { value: "workload", label: "Workload" },
  { value: "friends", label: "Friends" },
  { value: "concentration_credit", label: "Concentration credit" },
]);

export const WORKLOAD_BANDS = ["0-2", "2-4", "4-6", "6+"] as const;

export const TEACHING_STYLES = options([
  { value: "case_discussion", label: "Case discussion" },
  { value: "lecture", label: "Lecture" },
  { value: "workshop", label: "Workshop" },
  { value: "guest_heavy", label: "Guest-heavy" },
  { value: "project", label: "Project" },
]);

export const EVALUATION_COMPONENTS = options([
  { value: "eval_participation", label: "Class participation" },
  { value: "eval_quizzes", label: "Quizzes" },
  { value: "eval_individual", label: "Individual work" },
  { value: "eval_group", label: "Group work" },
  { value: "eval_midterm", label: "Mid-term" },
  { value: "eval_final", label: "Final" },
]);

// Track playbook (requirements 5.2)
export const WHAT_MATTERED = options([
  { value: "cv_story", label: "CV story" },
  { value: "gpa", label: "GPA" },
  { value: "case_or_interview_prep", label: "Case or interview prep" },
  { value: "networking", label: "Networking" },
  { value: "competitions", label: "Competitions" },
  { value: "pors", label: "PORs" },
  { value: "prior_domain", label: "Prior domain" },
  { value: "courses", label: "Courses" },
]);

export const NUMBER_BANDS = ["0", "1-2", "3-5", "6-10", "11-20", "20+"] as const;

// [confirm] against the PGP calendar (open question 7).
export const TERM_BUCKETS = options([
  { value: "before_isb", label: "Before ISB" },
  { value: "early_terms", label: "Early terms (1 to 3)" },
  { value: "mid_terms", label: "Mid terms (4 to 5)" },
  { value: "late_terms", label: "Late terms (6 to 8)" },
  { value: "placement_weeks", label: "Placement weeks" },
]);

export const HEARD_FROM = options([
  { value: "whatsapp_group", label: "WhatsApp group" },
  { value: "friend", label: "A friend" },
  { value: "team_email", label: "Email from the team" },
  { value: "other", label: "Other" },
]);

export const APP_TIMEZONE = "Asia/Kolkata";
