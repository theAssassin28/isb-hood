"use client";

import { useFormStatus } from "react-dom";
import { primaryButton } from "./styles";

/** Submit button that disables itself and changes its label while the form is sending. */
export function SubmitButton({
  children,
  pendingLabel,
  className = primaryButton,
  ...props
}: React.ComponentProps<"button"> & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending} {...props}>
      {pending ? pendingLabel : children}
    </button>
  );
}
