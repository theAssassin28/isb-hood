"use client";

import { useActionState } from "react";
import { fieldInput, fieldLabel, notice } from "./styles";
import { SubmitButton } from "./submit-button";

export type ImportState = { errors: string[]; done: string | null };

const initial: ImportState = { errors: [], done: null };

/** Upload a CSV file or paste its rows. Used by both admin imports. */
export function CsvImportForm({
  action,
  columns,
  example,
}: {
  action: (previous: ImportState, formData: FormData) => Promise<ImportState>;
  columns: string;
  example: string;
}) {
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        First row must be the header: <code className="font-mono text-foreground">{columns}</code>
      </p>

      <div>
        <label htmlFor="csv-file" className={fieldLabel}>
          CSV file
        </label>
        <input
          id="csv-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          className="mt-1.5 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-full file:border file:border-input file:bg-background file:px-3 file:text-sm file:font-medium file:text-brand"
        />
      </div>

      <div>
        <label htmlFor="csv-pasted" className={fieldLabel}>
          Or paste the rows
        </label>
        <textarea
          id="csv-pasted"
          name="pasted"
          rows={5}
          placeholder={example}
          className={`${fieldInput} mt-1.5 py-2.5 font-mono text-sm`}
        />
      </div>

      {state.errors.length > 0 ? (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">Nothing was imported. Fix these and try again:</p>
          <ul className="mt-1 list-disc pl-5">
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {state.done ? (
        <p role="status" className={notice}>
          {state.done}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Importing…">Import</SubmitButton>
    </form>
  );
}
