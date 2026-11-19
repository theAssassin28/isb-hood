import { describe, expect, it } from "vitest";
import { parseCourseCsv, parseCsv, parseOutreachCsv } from "@/lib/domain/csv";

describe("parseCsv", () => {
  it("handles quotes, embedded commas, escaped quotes and Windows line endings", () => {
    expect(parseCsv('a,b\r\n"Smith, J","say ""hi"""\r\n')).toEqual([
      ["a", "b"],
      ["Smith, J", 'say "hi"'],
    ]);
  });

  it("ignores blank lines and an Excel byte-order mark", () => {
    expect(parseCsv("﻿a,b\n\n1,2\n\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps a line break inside a quoted cell", () => {
    expect(parseCsv('a\n"one\ntwo"')).toEqual([["a"], ["one\ntwo"]]);
  });
});

describe("parseCourseCsv", () => {
  const header = "code,title,area,professor,term,cohort,current";

  it("reads offerings and accepts yes/true/1 for current", () => {
    const { rows, errors } = parseCourseCsv(
      `${header}\nMKT-1,Pricing,Marketing,Prof A,Term 7,Co'26,no\nMKT-1,Pricing,Marketing,"Rao, S",Term 7,Co'27,YES`,
    );
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ professor: "Rao, S", current: true });
    expect(rows[0].current).toBe(false);
  });

  it("matches headers whatever their case or order, and allows a course with no offering", () => {
    const { rows, errors } = parseCourseCsv("Title, CODE\nValuation,FIN-1");
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ code: "FIN-1", title: "Valuation", professor: "" });
  });

  it("names the missing columns", () => {
    const { errors } = parseCourseCsv("name,prof\nx,y");
    expect(errors[0]).toMatch(/Missing: code, title/);
  });

  it("points at the row and the problem", () => {
    const { rows, errors } = parseCourseCsv(
      `${header}\nMKT-1,,Marketing,Prof A,T7,,no\nMKT-2,Brand,,,,,yes`,
    );
    expect(rows).toEqual([]);
    expect(errors).toEqual([
      "Row 2: title is empty.",
      'Row 2: term must look like "Term 7" (got "T7").',
      "Row 2: cohort is empty (for example Co'27).",
      "Row 3: a row marked current needs a professor.",
    ]);
  });

  it("refuses two current offerings for one course", () => {
    const { errors } = parseCourseCsv(
      `${header}\nMKT-1,Pricing,,Prof A,Term 7,Co'26,yes\nmkt-1,Pricing,,Prof B,Term 7,Co'27,yes`,
    );
    expect(errors[0]).toMatch(/already marked current on row 2/);
  });

  it("explains an empty file and a header-only file", () => {
    expect(parseCourseCsv("").errors).toEqual(["The file is empty."]);
    expect(parseCourseCsv(header).errors).toEqual(["The file has a header but no rows."]);
  });
});

describe("parseOutreachCsv", () => {
  it("reads people with only a name", () => {
    const { rows, errors } = parseOutreachCsv("name\nKiran Shah");
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ name: "Kiran Shah", email: "", course_code: "" });
  });

  it("rejects bad emails and anything that looks like a phone number", () => {
    const { rows, errors } = parseOutreachCsv(
      "name,cohort,email,course_code,campaign\nA B,Co'26,not-an-email,,\nC D,+91 98765 43210,,,",
    );
    expect(rows).toEqual([]);
    expect(errors[0]).toMatch(/Row 2: "not-an-email"/);
    expect(errors[1]).toMatch(/Row 3: looks like it contains a phone number/);
  });
});
