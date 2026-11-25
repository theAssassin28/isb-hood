// Readable URLs. A course page lives at its course code, e.g. /courses/MKT-501
// (codes are unique, see supabase/migrations/0001_schema.sql).

export const courseHref = (code: string) => `/courses/${encodeURIComponent(code)}`;
