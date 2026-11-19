import "server-only";

/** CSV text from an uploaded file, or from the paste box if no file was chosen. */
export async function csvFromForm(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) return file.text();
  const pasted = formData.get("pasted");
  return typeof pasted === "string" ? pasted : "";
}
