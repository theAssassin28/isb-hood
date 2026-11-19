import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createOffering, createUser, freshDatabase, insertReview } from "./harness";

// These tests are the guard for the two rules that end the project if broken:
// an anonymous author must never be identifiable, and nobody publishes around
// verification. See docs/BUILD_PLAN.md, sections 3 and 5.3.

let db: PGlite;
let offeringId: string;
let author: string; // ISB student who writes anonymously
let reader: string; // another ISB student
let alum: string; // contributor from an outreach link, not yet verified
let moderator: string;
let anonReviewId: string;

beforeAll(async () => {
  db = await freshDatabase();
  offeringId = await createOffering(db);
  author = await createUser(db, { email: "asha@isb.edu", name: "Asha Rao", cohort: "Co'27" });
  reader = await createUser(db, { email: "ravi@isb.edu", name: "Ravi Menon", cohort: "Co'27" });
  alum = await createUser(db, {
    email: "kiran@gmail.com",
    name: "Kiran Shah",
    cohort: "Co'26",
    accountType: "contributor",
  });
  moderator = await createUser(db, {
    email: "mod@isb.edu",
    name: "Mod One",
    cohort: "Co'27",
    role: "moderator",
  });
  const review = await asUser(db, author, () =>
    insertReview(db, { offeringId, authorId: author, visibility: "anonymous" }),
  );
  anonReviewId = review.id;
}, 60_000);

describe("migrations", () => {
  it("apply from zero and seed default settings", async () => {
    const { rows } = await db.query<{ n: number }>(
      "select count(*)::int as n from public.app_settings",
    );
    expect(rows[0].n).toBeGreaterThanOrEqual(10);
  });

  it("turn on row level security for every public table", async () => {
    const { rows } = await db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(rows.map((r) => r.relname)).toEqual([]);
  });
});

describe("anonymous authors", () => {
  it("are not identifiable through the public view", async () => {
    const rows = await asUser(db, reader, async () => {
      const res = await db.query<Record<string, unknown>>(
        "select * from public.course_reviews_public where id = $1",
        [anonReviewId],
      );
      return res.rows;
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].author_id).toBeNull();
    expect(rows[0].author_display).toBe("Verified Co'27 student");
    expect(rows[0].is_mine).toBe(false);
    const serialised = JSON.stringify(rows[0]);
    expect(serialised).not.toContain(author);
    expect(serialised).not.toContain("Asha");
    expect(serialised).not.toContain("asha@isb.edu");
  });

  it("cannot be found by reading the base tables directly", async () => {
    const result = await asUser(db, reader, async () => {
      const reviews = await db.query("select * from public.course_reviews");
      const profiles = await db.query("select * from public.profiles");
      return { reviews: reviews.rows.length, profiles: profiles.rows.length };
    });
    expect(result.reviews).toBe(0);
    expect(result.profiles).toBe(1); // only the reader's own
  });

  it("reply as 'Author', while the person asking is shown by name", async () => {
    const question = await asUser(db, reader, async () => {
      const res = await db.query<{ id: string }>(
        `insert into public.comments (entry_type, entry_id, author_id, body)
         values ('course_review', $1, $2, 'How heavy is the final?') returning id`,
        [anonReviewId, reader],
      );
      return res.rows[0].id;
    });
    await asUser(db, author, () =>
      db.query(
        `insert into public.comments (entry_type, entry_id, parent_id, author_id, body)
         values ('course_review', $1, $2, $3, 'About 30 percent, open book.')`,
        [anonReviewId, question, author],
      ),
    );

    const thread = await asUser(db, reader, async () => {
      const res = await db.query<Record<string, unknown>>(
        "select * from public.comments_public where entry_id = $1 order by parent_id nulls first",
        [anonReviewId],
      );
      return res.rows;
    });
    expect(thread).toHaveLength(2);
    expect(thread[0].author_display).toBe("Ravi Menon, Co'27");
    expect(thread[0].first_reply_at).not.toBeNull();
    expect(thread[1].author_display).toBe("Author");
    expect(thread[1].author_id).toBeNull();
    expect(JSON.stringify(thread[1])).not.toContain(author);
  });

  it("see their own entry marked as theirs", async () => {
    const rows = await asUser(db, author, async () => {
      const res = await db.query<{ is_mine: boolean }>(
        "select is_mine from public.course_reviews_public where id = $1",
        [anonReviewId],
      );
      return res.rows;
    });
    expect(rows[0].is_mine).toBe(true);
  });
});

describe("named authors", () => {
  it("are shown with name and cohort", async () => {
    const offering = await createOffering(db);
    const review = await asUser(db, reader, () =>
      insertReview(db, { offeringId: offering, authorId: reader }),
    );
    const rows = await asUser(db, author, async () => {
      const res = await db.query<{ author_display: string; author_id: string }>(
        "select author_display, author_id from public.course_reviews_public where id = $1",
        [review.id],
      );
      return res.rows;
    });
    expect(rows[0].author_display).toBe("Ravi Menon, Co'27");
    expect(rows[0].author_id).toBe(reader);
  });
});

describe("unverified contributors", () => {
  it("cannot read anyone else's content", async () => {
    const counts = await asUser(db, alum, async () => {
      const reviews = await db.query("select 1 from public.course_reviews_public");
      const comments = await db.query("select 1 from public.comments_public");
      return reviews.rows.length + comments.rows.length;
    });
    expect(counts).toBe(0);
  });

  it("cannot publish straight to live, and go live when a moderator verifies them", async () => {
    const pending = await asUser(db, alum, () =>
      insertReview(db, { offeringId, authorId: alum, status: "live" }),
    );
    expect(pending.status).toBe("pending_verification");

    const before = await asUser(db, reader, async () => {
      const res = await db.query("select 1 from public.course_reviews_public where id = $1", [
        pending.id,
      ]);
      return res.rows.length;
    });
    expect(before).toBe(0);

    await expect(
      asUser(db, reader, () => db.query("select public.verify_contributor($1)", [alum])),
    ).rejects.toThrow(/Only moderators/);

    await asUser(db, moderator, () => db.query("select public.verify_contributor($1)", [alum]));

    const after = await asUser(db, reader, async () => {
      const res = await db.query<{ author_display: string }>(
        "select author_display from public.course_reviews_public where id = $1",
        [pending.id],
      );
      return res.rows;
    });
    expect(after).toHaveLength(1);
    expect(after[0].author_display).toBe("Kiran Shah, Co'26");
  });

  it("cannot comment before verification", async () => {
    const stranger = await createUser(db, {
      email: "new@gmail.com",
      name: "New Person",
      cohort: "Co'25",
      accountType: "contributor",
    });
    await expect(
      asUser(db, stranger, () =>
        db.query(
          `insert into public.comments (entry_type, entry_id, author_id, body)
           values ('course_review', $1, $2, 'hello')`,
          [anonReviewId, stranger],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("privilege boundaries", () => {
  it("users cannot make themselves a moderator or verified", async () => {
    await expect(
      asUser(db, reader, () =>
        db.query("update public.profiles set role = 'moderator' where id = $1", [reader]),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(db, alum, () =>
        db.query("update public.profiles set verification_status = 'verified' where id = $1", [
          alum,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("users cannot write an entry under someone else's name", async () => {
    const offering = await createOffering(db);
    await expect(
      asUser(db, reader, () => insertReview(db, { offeringId: offering, authorId: author })),
    ).rejects.toThrow(/row-level security/);
  });

  it("users cannot read events, the outreach list, or flags raised by others", async () => {
    await db.query("insert into public.events (user_id, name) values ($1, 'course_page_viewed')", [
      author,
    ]);
    await db.query("insert into public.outreach_contacts (full_name) values ('Someone Alum')");
    const counts = await asUser(db, reader, async () => {
      const events = await db.query("select 1 from public.events");
      const outreach = await db.query("select 1 from public.outreach_contacts");
      return events.rows.length + outreach.rows.length;
    });
    expect(counts).toBe(0);
  });
});

describe("publish rules", () => {
  it("reject a rating without a reason", async () => {
    const offering = await createOffering(db);
    await expect(
      asUser(db, reader, () =>
        insertReview(
          db,
          { offeringId: offering, authorId: reader },
          { learning_value_reason: "ok" },
        ),
      ),
    ).rejects.toThrow(/course_review_complete/);
  });

  it("reject an evaluation mix that does not total 100", async () => {
    const offering = await createOffering(db);
    await expect(
      asUser(db, reader, () =>
        insertReview(db, { offeringId: offering, authorId: reader }, { eval_final: 40 }),
      ),
    ).rejects.toThrow(/course_review_complete/);
  });

  it("allow an incomplete draft, visible only to its author", async () => {
    const offering = await createOffering(db);
    const draft = await asUser(db, reader, async () => {
      const res = await db.query<{ id: string; status: string }>(
        `insert into public.course_reviews (offering_id, author_id, workload_band)
         values ($1, $2, '4-6') returning id, status`,
        [offering, reader],
      );
      return res.rows[0];
    });
    expect(draft.status).toBe("draft");
    const seen = await asUser(db, author, async () => {
      const res = await db.query("select 1 from public.course_reviews_public where id = $1", [
        draft.id,
      ]);
      return res.rows.length;
    });
    expect(seen).toBe(0);
  });

  it("allow only one current offering per course", async () => {
    const offering = await createOffering(db);
    await expect(
      db.query(
        `insert into public.offerings (course_id, professor, term_label, cohort_year, is_current)
         select course_id, 'Prof Other', 'Term 7', 'Co''27', true
         from public.offerings where id = $1`,
        [offering],
      ),
    ).rejects.toThrow(/offerings_one_current_per_course/);
  });
});

describe("verification (M1)", () => {
  it("links the contributor to the outreach contact a moderator picked", async () => {
    const person = await createUser(db, {
      email: "meera@gmail.com",
      name: "Meera Das",
      cohort: "Co'25",
      accountType: "contributor",
    });
    const { rows } = await db.query<{ id: string }>(
      "insert into public.outreach_contacts (full_name, cohort) values ('Meera Das', 'Co''25') returning id",
    );
    const contact = rows[0].id;

    await asUser(db, moderator, () =>
      db.query("select public.verify_contributor($1, true, $2)", [person, contact]),
    );

    const linked = await db.query<{ verification_status: string; outreach_contact_id: string }>(
      "select verification_status, outreach_contact_id from public.profiles where id = $1",
      [person],
    );
    expect(linked.rows[0]).toEqual({
      verification_status: "verified",
      outreach_contact_id: contact,
    });
    const claimed = await db.query<{ claimed_by: string }>(
      "select claimed_by from public.outreach_contacts where id = $1",
      [contact],
    );
    expect(claimed.rows[0].claimed_by).toBe(person);
  });

  it("rejecting keeps entries unpublished and the person unable to read", async () => {
    const person = await createUser(db, {
      email: "fake@gmail.com",
      name: "Not Alum",
      cohort: "Co'26",
      accountType: "contributor",
    });
    const review = await asUser(db, person, () =>
      insertReview(db, { offeringId, authorId: person }),
    );
    await asUser(db, moderator, () =>
      db.query("select public.verify_contributor($1, false)", [person]),
    );

    const status = await db.query<{ status: string }>(
      "select status from public.course_reviews where id = $1",
      [review.id],
    );
    expect(status.rows[0].status).toBe("pending_verification");
    const visible = await asUser(db, person, async () => {
      const res = await db.query("select 1 from public.course_reviews_public");
      return res.rows.length;
    });
    expect(visible).toBe(0);
  });

  it("locks name and cohort once a contributor is verified", async () => {
    // `alum` was verified in an earlier test.
    await expect(
      asUser(db, alum, () =>
        db.query("update public.profiles set cohort = 'Co''27' where id = $1", [alum]),
      ),
    ).rejects.toThrow(/locked after verification/);
    await expect(
      asUser(db, alum, () =>
        db.query("update public.profiles set full_name = 'Someone Else' where id = $1", [alum]),
      ),
    ).rejects.toThrow(/locked after verification/);
    // Other profile fields stay editable.
    await asUser(db, alum, () =>
      db.query("update public.profiles set target_track = 'product' where id = $1", [alum]),
    );
  });

  it("lets ISB students and unverified contributors still correct their name", async () => {
    await asUser(db, reader, () =>
      db.query("update public.profiles set full_name = 'Ravi K Menon' where id = $1", [reader]),
    );
    await asUser(db, reader, () =>
      db.query("update public.profiles set full_name = 'Ravi Menon' where id = $1", [reader]),
    );
  });

  it("lets a user record their own event, and nobody else's", async () => {
    await asUser(db, reader, () =>
      db.query("insert into public.events (user_id, name) values ($1, 'user_signed_up')", [reader]),
    );
    await expect(
      asUser(db, reader, () =>
        db.query("insert into public.events (user_id, name) values ($1, 'user_signed_up')", [
          author,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("courses and offerings (M2)", () => {
  const rows = [
    {
      code: "MKT-1",
      title: "Pricing",
      area: "Marketing",
      professor: "Prof A",
      term: "Term 7",
      cohort: "Co'26",
      current: false,
    },
    {
      code: "MKT-1",
      title: "Pricing",
      area: "Marketing",
      professor: "Prof B",
      term: "Term 7",
      cohort: "Co'27",
      current: true,
    },
    {
      code: "FIN-1",
      title: "Valuation",
      area: "",
      professor: "",
      term: "",
      cohort: "",
      current: false,
    },
  ];

  it("import is moderator-only and safe to run twice", async () => {
    await expect(
      asUser(db, reader, () =>
        db.query("select public.admin_import_courses($1::jsonb)", [JSON.stringify(rows)]),
      ),
    ).rejects.toThrow(/Only moderators/);

    const first = await asUser(db, moderator, async () => {
      const res = await db.query<{ r: { courses: number; offerings: number } }>(
        "select public.admin_import_courses($1::jsonb) as r",
        [JSON.stringify(rows)],
      );
      return res.rows[0].r;
    });
    expect(first).toEqual({ courses: 2, offerings: 2 });

    const second = await asUser(db, moderator, async () => {
      const res = await db.query<{ r: { courses: number; offerings: number } }>(
        "select public.admin_import_courses($1::jsonb) as r",
        [JSON.stringify(rows)],
      );
      return res.rows[0].r;
    });
    expect(second).toEqual({ courses: 0, offerings: 0 });

    const current = await db.query<{ professor: string }>(
      `select o.professor from public.offerings o join public.courses c on c.id = o.course_id
       where c.code = 'MKT-1' and o.is_current`,
    );
    expect(current.rows).toEqual([{ professor: "Prof B" }]);
  });

  it("moving the current offering leaves exactly one", async () => {
    const { rows: offerings } = await db.query<{ id: string }>(
      `select o.id from public.offerings o join public.courses c on c.id = o.course_id
       where c.code = 'MKT-1' and o.professor = 'Prof A'`,
    );
    await asUser(db, moderator, () =>
      db.query("select public.set_current_offering($1)", [offerings[0].id]),
    );
    const current = await db.query<{ professor: string }>(
      `select o.professor from public.offerings o join public.courses c on c.id = o.course_id
       where c.code = 'MKT-1' and o.is_current`,
    );
    expect(current.rows).toEqual([{ professor: "Prof A" }]);
  });

  it("a proposed offering hides its reviews from readers until approved", async () => {
    const { rows: course } = await db.query<{ id: string }>(
      "select id from public.courses where code = 'FIN-1'",
    );
    const proposed = await asUser(db, reader, async () => {
      const res = await db.query<{ id: string }>(
        `insert into public.offerings (course_id, professor, term_label, cohort_year, status, created_by)
         values ($1, 'Prof New', 'Term 6', 'Co''27', 'pending', $2) returning id`,
        [course[0].id, reader],
      );
      return res.rows[0].id;
    });
    // A user cannot approve their own proposal or mark it current.
    await expect(
      asUser(db, reader, () =>
        db.query(
          `insert into public.offerings (course_id, professor, term_label, cohort_year, status, created_by)
           values ($1, 'Prof Sneaky', 'Term 6', 'Co''27', 'approved', $2)`,
          [course[0].id, reader],
        ),
      ),
    ).rejects.toThrow(/row-level security/);

    const review = await asUser(db, reader, () =>
      insertReview(db, { offeringId: proposed, authorId: reader }),
    );
    expect(review.status).toBe("live");

    const seenBy = async (who: string) =>
      asUser(db, who, async () => {
        const res = await db.query("select 1 from public.course_reviews_public where id = $1", [
          review.id,
        ]);
        return res.rows.length;
      });
    expect(await seenBy(author)).toBe(0);

    await asUser(db, moderator, () =>
      db.query("update public.offerings set status = 'approved' where id = $1", [proposed]),
    );
    expect(await seenBy(author)).toBe(1);
  });

  it("one review per person per offering, but moderators may enter several on behalf of seniors", async () => {
    const offering = await createOffering(db);
    await asUser(db, reader, () => insertReview(db, { offeringId: offering, authorId: reader }));
    await expect(
      asUser(db, reader, () => insertReview(db, { offeringId: offering, authorId: reader })),
    ).rejects.toThrow(/course_reviews_one_per_author/);

    for (const name of ["Senior One", "Senior Two"]) {
      await asUser(db, moderator, () =>
        insertReview(
          db,
          { offeringId: offering, authorId: moderator },
          { on_behalf_of_name: name, on_behalf_of_cohort: "Co'26" },
        ),
      );
    }
    const shown = await asUser(db, reader, async () => {
      const res = await db.query<{ author_display: string; author_id: string | null }>(
        `select author_display, author_id from public.course_reviews_public
         where offering_id = $1 and entered_by_team order by author_display`,
        [offering],
      );
      return res.rows;
    });
    expect(shown.map((r) => r.author_display)).toEqual(["Senior One, Co'26", "Senior Two, Co'26"]);
    expect(shown.every((r) => r.author_id === null)).toBe(true);

    const another = await createOffering(db);
    await expect(
      asUser(db, reader, () =>
        insertReview(
          db,
          { offeringId: another, authorId: reader },
          { on_behalf_of_name: "Fake Senior" },
        ),
      ),
    ).rejects.toThrow(/Only moderators/);
  });

  it("outreach import merges the same person across courses", async () => {
    const list = [
      {
        name: "Tara Iyer",
        cohort: "Co'26",
        email: "Tara@Gmail.com",
        course_code: "MKT-1",
        campaign: "t7",
      },
      { name: "tara iyer", cohort: "Co'26", email: "", course_code: "FIN-1", campaign: "t7" },
      { name: "Dev Nair", cohort: "Co'25", email: "", course_code: "NOPE-9", campaign: "t7" },
    ];
    const result = await asUser(db, moderator, async () => {
      const res = await db.query<{ r: { contacts: number; unknown_courses: number } }>(
        "select public.admin_import_outreach($1::jsonb) as r",
        [JSON.stringify(list)],
      );
      return res.rows[0].r;
    });
    expect(result).toEqual({ contacts: 2, unknown_courses: 1 });
    const tara = await db.query<{ email: string; n: number }>(
      `select email, cardinality(asked_course_ids) as n from public.outreach_contacts
       where full_name = 'Tara Iyer'`,
    );
    expect(tara.rows).toEqual([{ email: "tara@gmail.com", n: 2 }]);
  });
});

describe("value_reached (M3)", () => {
  it("is recorded once per user per module", async () => {
    const insert = (module: string) =>
      asUser(db, reader, () =>
        db.query(
          `insert into public.events (user_id, name, props)
           values ($1, 'value_reached', jsonb_build_object('module', $2::text))`,
          [reader, module],
        ),
      );
    await insert("courses");
    await expect(insert("courses")).rejects.toThrow(/events_value_reached_once/);
    await insert("career");
    // Other events repeat freely.
    for (let i = 0; i < 2; i += 1) {
      await asUser(db, reader, () =>
        db.query(
          `insert into public.events (user_id, name, props)
           values ($1, 'course_page_viewed', '{"module": "courses"}')`,
          [reader],
        ),
      );
    }
  });
});

describe("comments, flags and account deletion (M4)", () => {
  const ask = (who: string, entryId: string, body: string, parentId: string | null = null) =>
    asUser(db, who, async () => {
      const res = await db.query<{ id: string }>(
        `insert into public.comments (entry_type, entry_id, parent_id, author_id, body)
         values ('course_review', $1, $2, $3, $4) returning id`,
        [entryId, parentId, who, body],
      );
      return res.rows[0].id;
    });

  async function freshReview(over: Record<string, unknown> = {}) {
    const offering = await createOffering(db);
    const writer = await createUser(db, {
      email: `w${Math.random()}@isb.edu`,
      name: "Writer Person",
      cohort: "Co'26",
    });
    const review = await asUser(db, writer, () =>
      insertReview(db, { offeringId: offering, authorId: writer }, over),
    );
    return { writer, reviewId: review.id };
  }

  it("refuses a question on a review that is not open to questions", async () => {
    const { reviewId } = await freshReview({ open_to_questions: false });
    await expect(ask(reader, reviewId, "Is it worth it?")).rejects.toThrow(/row-level security/);
  });

  it("refuses a question on a draft", async () => {
    const offering = await createOffering(db);
    const draft = await asUser(db, author, async () => {
      const res = await db.query<{ id: string }>(
        `insert into public.course_reviews (offering_id, author_id) values ($1, $2) returning id`,
        [offering, author],
      );
      return res.rows[0].id;
    });
    await expect(ask(reader, draft, "Hello?")).rejects.toThrow(/row-level security/);
  });

  it("allows two levels only, and only within the same review", async () => {
    const { writer, reviewId } = await freshReview();
    const other = await freshReview();
    const question = await ask(reader, reviewId, "How hard is the final?");
    const reply = await ask(writer, reviewId, "Moderate.", question);
    await expect(ask(reader, reviewId, "Thanks!", reply)).rejects.toThrow(/row-level security/);
    await expect(ask(reader, other.reviewId, "Wrong thread", question)).rejects.toThrow(
      /row-level security/,
    );
  });

  it("refuses an over-long comment", async () => {
    const { reviewId } = await freshReview();
    await expect(ask(reader, reviewId, "x".repeat(2001))).rejects.toThrow(/comments_body_length/);
  });

  it("keeps a deleted question's row when it has replies, and removes it otherwise", async () => {
    const { writer, reviewId } = await freshReview();
    const answered = await ask(reader, reviewId, "Answered question");
    await ask(writer, reviewId, "An answer", answered);
    const lonely = await ask(reader, reviewId, "Unanswered question");

    await expect(
      asUser(db, writer, () => db.query("select public.delete_my_comment($1)", [answered])),
    ).rejects.toThrow(/Comment not found/);
    await expect(
      asUser(db, reader, () => db.query(`delete from public.comments where id = $1`, [lonely])),
    ).rejects.toThrow(/permission denied/);

    await asUser(db, reader, () => db.query("select public.delete_my_comment($1)", [answered]));
    await asUser(db, reader, () => db.query("select public.delete_my_comment($1)", [lonely]));

    const thread = await asUser(db, writer, async () => {
      const res = await db.query<{ id: string; body: string }>(
        "select id, body from public.comments_public where entry_id = $1 order by parent_id nulls first",
        [reviewId],
      );
      return res.rows;
    });
    expect(thread).toHaveLength(2);
    expect(thread[0]).toEqual({ id: answered, body: "This comment was deleted by its author." });
  });

  it("keeps a flagged review visible until a moderator removes it", async () => {
    const { reviewId } = await freshReview();
    const flag = () =>
      asUser(db, reader, () =>
        db.query(
          `insert into public.flags (target_type, target_id, reporter_id, reason)
           values ('course_review', $1, $2, 'Personal remark about the professor')`,
          [reviewId, reader],
        ),
      );
    await flag();
    await expect(flag()).rejects.toThrow(/flags_one_open_per_reporter/);

    const visible = async () =>
      asUser(db, author, async () => {
        const res = await db.query("select 1 from public.course_reviews_public where id = $1", [
          reviewId,
        ]);
        return res.rows.length;
      });
    expect(await visible()).toBe(1);

    await expect(
      asUser(db, reader, () =>
        db.query("select public.resolve_flags('course_review', $1, 'removed')", [reviewId]),
      ),
    ).rejects.toThrow(/Only moderators/);

    await asUser(db, moderator, () =>
      db.query("select public.resolve_flags('course_review', $1, 'removed')", [reviewId]),
    );
    expect(await visible()).toBe(0);
    const open = await db.query(
      "select 1 from public.flags where target_id = $1 and resolved_at is null",
      [reviewId],
    );
    expect(open.rows).toHaveLength(0);

    // Once resolved, the same person may flag it again if it comes back.
    await flag();
  });

  it("deletes an account: entries gone, comments blanked as 'Former member', profile scrubbed", async () => {
    const leaver = await createUser(db, {
      email: "leaver@gmail.com",
      name: "Leaving Alum",
      cohort: "Co'25",
      accountType: "contributor",
      verification: "verified",
    });
    const offering = await createOffering(db);
    const review = await asUser(db, leaver, () =>
      insertReview(db, { offeringId: offering, authorId: leaver }),
    );
    const { reviewId } = await freshReview();
    const question = await ask(leaver, reviewId, "My question from before");

    await asUser(db, leaver, () => db.query("select public.delete_my_account()"));

    const gone = await db.query("select 1 from public.course_reviews where id = $1", [review.id]);
    expect(gone.rows).toHaveLength(0);
    const profile = await db.query<{ email: string; full_name: string | null; deleted_at: string }>(
      "select email, full_name, deleted_at from public.profiles where id = $1",
      [leaver],
    );
    expect(profile.rows[0].full_name).toBeNull();
    expect(profile.rows[0].email).not.toContain("leaver");
    expect(profile.rows[0].deleted_at).not.toBeNull();

    const shown = await asUser(db, reader, async () => {
      const res = await db.query<{
        body: string;
        author_display: string;
        author_id: string | null;
      }>("select body, author_display, author_id from public.comments_public where id = $1", [
        question,
      ]);
      return res.rows[0];
    });
    expect(shown).toEqual({
      body: "This comment was deleted by its author.",
      author_display: "Former member",
      author_id: null,
    });
  });
});

describe("surveys (M5)", () => {
  const ist = "public.ist_date(now())";
  const setWindow = (startOffset: number, endOffset: number) =>
    db.query(
      `update public.app_settings set value = jsonb_build_object(
         'start', (${ist} + $1::int)::text, 'end', (${ist} + $2::int)::text)
       where key = 'post_bid_survey_window'`,
      [startOffset, endOffset],
    );
  const status = (who: string) =>
    asUser(db, who, async () => {
      const res = await db.query<{ s: { post_bid: boolean; career_followup: boolean } }>(
        "select public.my_survey_status() as s",
      );
      return res.rows[0].s;
    });
  const view = (who: string, term: string) =>
    db.query(
      `insert into public.events (user_id, name, props)
       values ($1, 'course_page_viewed', jsonb_build_object('current_term', $2::text))`,
      [who, term],
    );

  it("post-bid: due only in the window, for the cohort, after viewing a bid-term course", async () => {
    const eligible = await createUser(db, {
      email: "s1@isb.edu",
      name: "Survey One",
      cohort: "Co'27",
    });
    const wrongTerm = await createUser(db, {
      email: "s2@isb.edu",
      name: "Survey Two",
      cohort: "Co'27",
    });
    const wrongCohort = await createUser(db, {
      email: "s3@isb.edu",
      name: "Survey Three",
      cohort: "Co'26",
    });
    await view(eligible, "Term 7");
    await view(wrongTerm, "Term 5");
    await view(wrongCohort, "Term 7");

    await setWindow(1, 7); // starts tomorrow
    expect((await status(eligible)).post_bid).toBe(false);

    await setWindow(0, 6); // starts today: the M5 "done when" check
    expect((await status(eligible)).post_bid).toBe(true);
    expect((await status(wrongTerm)).post_bid).toBe(false);
    expect((await status(wrongCohort)).post_bid).toBe(false);

    await setWindow(-7, -1); // ended yesterday
    expect((await status(eligible)).post_bid).toBe(false);
  });

  it("post-bid: answered once, complete, and only while due", async () => {
    const person = await createUser(db, {
      email: "s4@isb.edu",
      name: "Survey Four",
      cohort: "Co'27",
    });
    const outsider = await createUser(db, {
      email: "s5@isb.edu",
      name: "Survey Five",
      cohort: "Co'27",
    });
    await view(person, "Term 7");
    await setWindow(0, 6);
    const answer = (who: string, effect: string, courses: string | null) =>
      asUser(db, who, () =>
        db.query(
          `insert into public.survey_responses (user_id, survey, bid_effect, changed_course_ids, seniors_asked_band)
           values ($1, 'post_bid', $2, $3::uuid[], '1-2')`,
          [who, effect, courses],
        ),
      );

    await expect(answer(person, "changed", null)).rejects.toThrow(/survey_complete/);
    await expect(answer(outsider, "no_effect", null)).rejects.toThrow(/row-level security/);
    await answer(person, "no_effect", null);
    await expect(answer(person, "confirmed", null)).rejects.toThrow(/row-level security/);
    expect((await status(person)).post_bid).toBe(false);

    // survey_due itself is not callable by users.
    await expect(
      asUser(db, person, () =>
        db.query("select public.survey_due($1, 'post_bid', current_date)", [outsider]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("career follow-up: due 14 days after the first career view, or the day before the deadline", async () => {
    const early = await createUser(db, {
      email: "c1@isb.edu",
      name: "Career Early",
      cohort: "Co'27",
    });
    const late = await createUser(db, {
      email: "c2@isb.edu",
      name: "Career Late",
      cohort: "Co'27",
    });
    const fresh = await createUser(db, {
      email: "c3@isb.edu",
      name: "Career Fresh",
      cohort: "Co'27",
    });
    const firstView = (who: string, daysAgo: number) =>
      db.query(
        `insert into public.events (user_id, name, created_at)
         values ($1, 'career_entry_viewed', now() - make_interval(days => $2::int))`,
        [who, daysAgo],
      );
    await firstView(early, 15);
    await firstView(late, 3);
    await firstView(fresh, 3);

    // Deadline far away: only the 15-day-old view is due.
    await db.query(
      `update public.app_settings set value = to_jsonb((${ist} + 30)::text)
       where key = 'career_followup_deadline'`,
    );
    expect((await status(early)).career_followup).toBe(true);
    expect((await status(late)).career_followup).toBe(false);

    // Deadline tomorrow: late starters are brought forward to today.
    await db.query(
      `update public.app_settings set value = to_jsonb((${ist} + 1)::text)
       where key = 'career_followup_deadline'`,
    );
    expect((await status(late)).career_followup).toBe(true);

    await asUser(db, late, () =>
      db.query(
        `insert into public.survey_responses (user_id, survey, career_action, action_text, days_since_first_view)
         values ($1, 'career_followup', 'changed_prep', 'Started case prep a term earlier', 999)`,
        [late],
      ),
    );
    const saved = await db.query<{ days_since_first_view: number }>(
      "select days_since_first_view from public.survey_responses where user_id = $1",
      [late],
    );
    // Recorded by the database, not taken from the request.
    expect(saved.rows[0].days_since_first_view).toBe(3);

    await expect(
      asUser(db, fresh, () =>
        db.query(
          `insert into public.survey_responses (user_id, survey, career_action)
           values ($1, 'career_followup', 'applied_firm')`,
          [fresh],
        ),
      ),
    ).rejects.toThrow(/survey_complete/);
  });

  it("return visits are recorded once per day", async () => {
    const insert = (day: string) =>
      asUser(db, reader, () =>
        db.query(
          `insert into public.events (user_id, name, props)
           values ($1, 'return_visit', jsonb_build_object('day', $2::text))`,
          [reader, day],
        ),
      );
    await insert("2026-12-10");
    await expect(insert("2026-12-10")).rejects.toThrow(/events_return_visit_once_a_day/);
    await insert("2026-12-11");
  });
});
