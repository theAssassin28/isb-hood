// Form controls shared by the entry forms. Plain native inputs styled as large
// tap targets, so they work with a phone keyboard, a screen reader and no JS quirks.

import { fieldInput } from "./styles";

type Option = { value: string; label: string };

const chip =
  "inline-flex min-h-11 cursor-pointer items-center rounded-full border border-input bg-card px-4 text-base select-none has-checked:border-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-foreground";

export function Question({
  id,
  legend,
  hint,
  error,
  children,
}: {
  id: string;
  legend: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      id={id}
      aria-describedby={
        [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") ||
        undefined
      }
      aria-invalid={error ? true : undefined}
      className="min-w-0"
    >
      <legend className="text-base font-semibold text-foreground">{legend}</legend>
      {hint ? (
        <p id={`${id}-hint`} className="mt-0.5 text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function ChoiceChips({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly Option[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label key={option.value} className={chip}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

export function MultiChips({
  name,
  options,
  value,
  onChange,
  max,
}: {
  name: string;
  options: readonly Option[];
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const checked = value.includes(option.value);
        const full = max !== undefined && value.length >= max && !checked;
        return (
          <label key={option.value} className={`${chip} ${full ? "opacity-50" : ""}`}>
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={checked}
              disabled={full}
              onChange={() =>
                onChange(
                  checked ? value.filter((v) => v !== option.value) : [...value, option.value],
                )
              }
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

export function TextArea({
  id,
  value,
  onChange,
  minChars,
  rows = 4,
  placeholder,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  minChars?: number;
  rows?: number;
  placeholder?: string;
  invalid?: boolean;
}) {
  const length = value.trim().length;
  const short = minChars !== undefined && length < minChars;
  return (
    <>
      <textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={invalid ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldInput} py-2.5 leading-relaxed`}
      />
      {minChars !== undefined ? (
        <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
          {short ? `${minChars - length} more characters needed` : "Long enough. Thank you."}
        </p>
      ) : null}
    </>
  );
}

export function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-input p-3"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-foreground"
      />
      <span>
        <span className="block text-base font-medium text-foreground">{label}</span>
        {description ? (
          <span className="block text-sm text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
