// CSV reading for the two admin imports (docs/BUILD_PLAN.md 4.10).
// Small on purpose: quoted fields, escaped quotes, CRLF, and a BOM from Excel.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

type Parsed<T> = { rows: T[]; errors: string[] };

/** Header names are matched ignoring case, spaces and underscores. */
function table(
  text: string,
  required: string[],
  optional: string[],
): { records: Record<string, string>[]; errors: string[] } {
  const grid = parseCsv(text);
  if (grid.length === 0) return { records: [], errors: ["The file is empty."] };

  const key = (h: string) =>
    h
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "");
  const header = grid[0].map(key);
  const missing = required.filter((name) => !header.includes(key(name)));
  if (missing.length > 0) {
    return {
      records: [],
      errors: [
        `The first row must be a header with these columns: ${[...required, ...optional].join(", ")}. Missing: ${missing.join(", ")}.`,
      ],
    };
  }
  if (grid.length === 1) return { records: [], errors: ["The file has a header but no rows."] };

  const records = grid.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    for (const name of [...required, ...optional]) {
      const index = header.indexOf(key(name));
      record[name] = index >= 0 ? (cells[index] ?? "").trim() : "";
    }
    return record;
  });
  return { records, errors: [] };
}

const MAX_ROWS = 2000;

export type CourseImportRow = {
  code: string;
  title: string;
  area: string;
  professor: string;
  term: string;
  cohort: string;
  current: boolean;
};

const TRUE_VALUES = new Set(["true", "yes", "y", "1", "current"]);

/**
 * One row per offering: code, title, area, professor, term, cohort, current.
 * A row with no professor adds the course alone.
 */
export function parseCourseCsv(text: string): Parsed<CourseImportRow> {
  const { records, errors } = table(
    text,
    ["code", "title"],
    ["area", "professor", "term", "cohort", "current"],
  );
  if (errors.length > 0) return { rows: [], errors };
  if (records.length > MAX_ROWS) {
    return { rows: [], errors: [`Too many rows (${records.length}). The limit is ${MAX_ROWS}.`] };
  }

  const rows: CourseImportRow[] = [];
  const currentSeen = new Map<string, number>();
  records.forEach((r, i) => {
    const line = i + 2;
    if (!r.code) errors.push(`Row ${line}: code is empty.`);
    if (!r.title) errors.push(`Row ${line}: title is empty.`);
    const current = TRUE_VALUES.has(r.current.toLowerCase());
    if (r.professor) {
      if (!/^Term [1-8]$/.test(r.term)) {
        errors.push(`Row ${line}: term must look like "Term 7" (got "${r.term}").`);
      }
      if (!r.cohort) errors.push(`Row ${line}: cohort is empty (for example Co'27).`);
    } else if (current) {
      errors.push(`Row ${line}: a row marked current needs a professor.`);
    }
    if (current && r.code) {
      const earlier = currentSeen.get(r.code.toLowerCase());
      if (earlier) {
        errors.push(
          `Row ${line}: ${r.code} is already marked current on row ${earlier}. Only one offering per course can be current.`,
        );
      } else {
        currentSeen.set(r.code.toLowerCase(), line);
      }
    }
    rows.push({ ...r, current } as CourseImportRow);
  });
  return errors.length > 0 ? { rows: [], errors: errors.slice(0, 20) } : { rows, errors: [] };
}

export type OutreachImportRow = {
  name: string;
  cohort: string;
  email: string;
  course_code: string;
  campaign: string;
};

/** One row per person asked: name, cohort, email, course_code, campaign. */
export function parseOutreachCsv(text: string): Parsed<OutreachImportRow> {
  const { records, errors } = table(text, ["name"], ["cohort", "email", "course_code", "campaign"]);
  if (errors.length > 0) return { rows: [], errors };
  if (records.length > MAX_ROWS) {
    return { rows: [], errors: [`Too many rows (${records.length}). The limit is ${MAX_ROWS}.`] };
  }

  records.forEach((r, i) => {
    const line = i + 2;
    if (!r.name) errors.push(`Row ${line}: name is empty.`);
    if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
      errors.push(`Row ${line}: "${r.email}" does not look like an email address.`);
    }
    // Phone numbers are never stored (docs/BUILD_PLAN.md 5.4).
    if (Object.values(r).some((v) => /(?:\+?\d[\s-]?){10,}/.test(v))) {
      errors.push(
        `Row ${line}: looks like it contains a phone number. Remove it; we do not store them.`,
      );
    }
  });
  return errors.length > 0
    ? { rows: [], errors: errors.slice(0, 20) }
    : { rows: records as OutreachImportRow[], errors: [] };
}
