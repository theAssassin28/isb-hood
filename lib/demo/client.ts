import "server-only";
import {
  canComment,
  db,
  entryStatusTrigger,
  iso,
  newId,
  rlsVisible,
  rpc,
  stampFirstReply,
  surveyInsertCheck,
  uniqueViolation,
  VIEWS,
  type DbError,
  type Row,
  type TableName,
} from "./db";

// A stand-in for the Supabase client in demo mode. It answers the subset of the
// supabase-js query API this app uses (select with embedded tables, filters,
// order, limit, single, insert, update, upsert, delete, rpc, auth) against the
// in-memory database in ./db, so the rest of the app runs unchanged.

export const DEMO_COOKIE = "ih_demo_person";

type CookieStore = { delete(name: string): void };
type Ctx = { uid: string | null; admin: boolean; cookies?: CookieStore };
type Result = { data: unknown; error: DbError | null; count?: number | null; status?: number };

// Relationships used by embedded selects, e.g. "offering:offerings!inner(...)".
const RELATIONS: Record<
  string,
  Record<string, { kind: "one"; local: string } | { kind: "many"; foreign: string }>
> = {
  course_reviews: {
    offerings: { kind: "one", local: "offering_id" },
    profiles: { kind: "one", local: "author_id" },
  },
  offerings: { courses: { kind: "one", local: "course_id" } },
  courses: { offerings: { kind: "many", foreign: "course_id" } },
  comments: { profiles: { kind: "one", local: "author_id" } },
  career_entries: { profiles: { kind: "one", local: "author_id" } },
};

type Field =
  | { kind: "col"; name: string }
  | { kind: "embed"; alias: string; table: string; inner: boolean; fields: Field[] };

function splitTop(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function parseSelect(s: string): Field[] {
  return splitTop(s.replace(/\s+/g, " ")).map((part): Field => {
    const open = part.indexOf("(");
    if (open === -1) return { kind: "col", name: part };
    const head = part.slice(0, open).trim();
    const inside = part.slice(open + 1, part.lastIndexOf(")"));
    const [aliasOrTable, maybeTable] = head.split(":").map((x) => x.trim());
    const target = maybeTable ?? aliasOrTable;
    const [table, hint] = target.split("!");
    return {
      kind: "embed",
      alias: maybeTable ? aliasOrTable : table,
      table,
      inner: hint === "inner",
      fields: parseSelect(inside),
    };
  });
}

function likeToRegex(pattern: string): RegExp {
  let out = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === "\\" && i + 1 < pattern.length) {
      out += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    } else if (ch === "%") out += ".*";
    else if (ch === "_") out += ".";
    else out += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`, "i");
}

type Filter = (row: Row) => boolean;

const DEFAULTS: Partial<Record<TableName, () => Row>> = {
  course_reviews: () => ({
    visibility: "named",
    open_to_questions: true,
    status: "draft",
    on_behalf_of_name: null,
    on_behalf_of_cohort: null,
    published_at: null,
  }),
  comments: () => ({ status: "live", parent_id: null, first_reply_at: null }),
  flags: () => ({ auto: false, resolved_at: null, resolved_by: null, resolution: null }),
  offerings: () => ({ is_current: false, status: "approved" }),
  courses: () => ({ open_to_readers: true }),
  events: () => ({ props: {}, session_id: null }),
};

class Query implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private cols = "*";
  private returning: string | null = null;
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private max: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  private values: Row | Row[] | null = null;
  private countWanted = false;
  private head = false;
  private onConflict = "id";
  private ignoreDuplicates = false;

  constructor(
    private ctx: Ctx,
    private table: string,
  ) {}

  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    if (this.op === "select") {
      this.cols = cols;
      this.countWanted = !!opts?.count;
      this.head = !!opts?.head;
    } else this.returning = cols;
    return this;
  }
  insert(values: Row | Row[]) {
    this.op = "insert";
    this.values = values;
    return this;
  }
  update(values: Row) {
    this.op = "update";
    this.values = values;
    return this;
  }
  upsert(values: Row | Row[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = "upsert";
    this.values = values;
    this.onConflict = opts?.onConflict ?? "id";
    this.ignoreDuplicates = !!opts?.ignoreDuplicates;
    return this;
  }
  delete(opts?: { count?: string }) {
    this.op = "delete";
    this.countWanted = !!opts?.count;
    return this;
  }
  eq(col: string, v: unknown) {
    this.filters.push((r) => r[col] === v);
    return this;
  }
  neq(col: string, v: unknown) {
    this.filters.push((r) => r[col] !== v);
    return this;
  }
  in(col: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(r[col]));
    return this;
  }
  is(col: string, v: unknown) {
    this.filters.push((r) => (v === null ? r[col] === null || r[col] === undefined : r[col] === v));
    return this;
  }
  not(col: string, op: string, v: unknown) {
    if (op === "is")
      this.filters.push(
        (r) => !(v === null ? r[col] === null || r[col] === undefined : r[col] === v),
      );
    else this.filters.push((r) => r[col] !== v);
    return this;
  }
  gte(col: string, v: string | number) {
    this.filters.push((r) => (r[col] as string | number) >= v);
    return this;
  }
  lte(col: string, v: string | number) {
    this.filters.push((r) => (r[col] as string | number) <= v);
    return this;
  }
  ilike(col: string, pattern: string) {
    const re = likeToRegex(pattern);
    this.filters.push((r) => re.test(String(r[col] ?? "")));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }
  returns() {
    return this;
  }

  then<A = Result, B = never>(
    onOk?: ((v: Result) => A | PromiseLike<A>) | null,
    onErr?: ((e: unknown) => B | PromiseLike<B>) | null,
  ) {
    return Promise.resolve()
      .then(() => this.run())
      .then(onOk, onErr);
  }

  // ----------------------------------------------------------- execution
  private get d() {
    return db();
  }

  private visible(table: string, row: Row): boolean {
    return this.ctx.admin || rlsVisible(this.d, table as TableName, row, this.ctx.uid);
  }

  private source(): Row[] {
    const view = VIEWS[this.table];
    if (view) return view(this.d, this.ctx.admin ? null : this.ctx.uid);
    return (this.d[this.table as TableName] ?? []).filter((r) => this.visible(this.table, r));
  }

  private project(table: string, row: Row, fields: Field[]): Row | null {
    const out: Row = {};
    for (const f of fields) {
      if (f.kind === "col") {
        if (f.name === "*") Object.assign(out, row);
        else out[f.name] = row[f.name] ?? null;
        continue;
      }
      const rel = RELATIONS[table]?.[f.table];
      const targets = (this.d[f.table as TableName] ?? []).filter((t) => this.visible(f.table, t));
      if (rel?.kind === "one") {
        const t = targets.find((x) => x.id === row[rel.local]);
        const value = t ? this.project(f.table, t, f.fields) : null;
        if (f.inner && !value) return null;
        out[f.alias] = value;
      } else if (rel?.kind === "many") {
        const list = targets
          .filter((x) => x[rel.foreign] === row.id)
          .map((x) => this.project(f.table, x, f.fields))
          .filter(Boolean);
        if (f.inner && list.length === 0) return null;
        out[f.alias] = list;
      } else {
        out[f.alias] = null;
      }
    }
    return out;
  }

  private shape(rows: Row[], cols: string): Result {
    const table = VIEWS[this.table] ? "" : this.table;
    const fields = parseSelect(cols);
    let out = rows.map((r) => this.project(table, r, fields)).filter((r): r is Row => r !== null);
    for (const o of [...this.orders].reverse()) {
      out = [...out].sort((a, b) => {
        const x = a[o.col] as string | number | null;
        const y = b[o.col] as string | number | null;
        if (x === y) return 0;
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        return (x < y ? -1 : 1) * (o.asc ? 1 : -1);
      });
    }
    const count = out.length;
    if (this.max !== null) out = out.slice(0, this.max);
    if (this.head) return { data: null, error: null, count };
    if (this.mode === "single") {
      return out.length === 1
        ? { data: out[0], error: null, count }
        : {
            data: null,
            error: {
              message: "JSON object requested, multiple (or no) rows returned",
              code: "PGRST116",
            },
          };
    }
    if (this.mode === "maybe") return { data: out[0] ?? null, error: null, count };
    return { data: out, error: null, count: this.countWanted ? count : null };
  }

  private match(rows: Row[]): Row[] {
    return rows.filter((r) => this.filters.every((f) => f(r)));
  }

  private run(): Result {
    const d = this.d;
    const table = this.table as TableName;

    if (this.op === "select") return this.shape(this.match(this.source()), this.cols);

    if (this.op === "delete") {
      const doomed = this.match(this.source());
      d[table] = d[table].filter((r) => !doomed.includes(r));
      return { data: null, error: null, count: doomed.length };
    }

    if (this.op === "update") {
      const targets = this.match(this.source());
      for (const row of targets) {
        const next: Row = { ...row, ...(this.values as Row) };
        if (table === "course_reviews" || table === "career_entries") {
          const e = entryStatusTrigger(d, this.ctx.uid, this.ctx.admin, next, row);
          if (e) return { data: null, error: e };
          const u = uniqueViolation(d, table, next);
          if (u) return { data: null, error: u };
        }
        Object.assign(row, next);
      }
      return this.returning !== null
        ? this.shape(targets, this.returning)
        : { data: null, error: null };
    }

    // insert or upsert
    const list = Array.isArray(this.values) ? this.values : [this.values ?? {}];
    const written: Row[] = [];
    for (const v of list) {
      if (this.op === "upsert") {
        const existing = d[table].find((r) => r[this.onConflict] === v[this.onConflict]);
        if (existing) {
          if (!this.ignoreDuplicates) Object.assign(existing, v);
          written.push(existing);
          continue;
        }
      }
      const row: Row = {
        ...(DEFAULTS[table]?.() ?? {}),
        id:
          table === "events" || table === "email_log"
            ? d[table].length + 1
            : newId(
                d,
                table === "comments"
                  ? "f"
                  : table === "flags"
                    ? "d"
                    : table === "offerings"
                      ? "b"
                      : "e",
              ),
        created_at: iso(new Date()),
        ...v,
      };
      if (table === "app_settings") delete row.id;
      if (table === "course_reviews" || table === "career_entries") {
        const e = entryStatusTrigger(d, this.ctx.uid, this.ctx.admin, row, null);
        if (e) return { data: null, error: e };
      }
      if (table === "comments" && !this.ctx.admin && !canComment(d, this.ctx.uid, row)) {
        return {
          data: null,
          error: {
            message: 'new row violates row-level security policy for table "comments"',
            code: "42501",
          },
        };
      }
      if (table === "survey_responses") {
        const e = surveyInsertCheck(d, this.ctx.uid, this.ctx.admin, row);
        if (e) return { data: null, error: e };
      }
      const u = uniqueViolation(d, table, row);
      if (u) return { data: null, error: u };
      d[table].push(row);
      if (table === "comments") stampFirstReply(d, row);
      written.push(row);
    }
    return this.returning !== null
      ? this.shape(written, this.returning)
      : { data: null, error: null };
  }
}

export function createDemoClient(ctx: Ctx) {
  return {
    from: (table: string) => new Query(ctx, table),
    rpc: async (name: string, args: Row = {}) => rpc(db(), ctx.uid, ctx.admin, name, args),
    auth: {
      getClaims: async () => ({ data: ctx.uid ? { claims: { sub: ctx.uid } } : null, error: null }),
      getUser: async () => ({ data: { user: ctx.uid ? { id: ctx.uid } : null }, error: null }),
      signOut: async () => {
        try {
          ctx.cookies?.delete(DEMO_COOKIE);
        } catch {
          // Read-only cookies while rendering; sign-out happens in actions.
        }
        return { error: null };
      },
      signInWithOtp: async () => ({
        data: null,
        error: { message: "Sign-in codes are off in the demo", status: 400 },
      }),
      verifyOtp: async () => ({
        data: { user: null, session: null },
        error: { message: "Sign-in codes are off in the demo", status: 400 },
      }),
      admin: { deleteUser: async () => ({ data: null, error: null }) },
    },
  };
}
