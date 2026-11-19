// Shared by server and client code, so no server-only imports here.

export function offeringLabel(o: { professor: string; term_label: string; cohort_year: string }) {
  return `${o.professor} · ${o.term_label}, ${o.cohort_year}`;
}
