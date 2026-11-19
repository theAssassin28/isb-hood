import { z } from "zod";
import {
  COHORTS,
  FUNCTIONS,
  HEARD_FROM,
  INDUSTRIES,
  PROGRAMMES,
  TRACKS,
  YEARS_EXPERIENCE_BANDS,
} from "@/lib/constants/vocab";

const oneOf = <T extends string>(list: readonly { value: T }[], message: string) =>
  z.enum(list.map((o) => o.value) as [T, ...T[]], { error: message });

// Onboarding form (docs/BUILD_PLAN.md, 4.2). All fields required.
export const profileSchema = z.object({
  full_name: z
    .string({ error: "Enter your name" })
    .trim()
    .min(2, "Enter your name")
    .max(80, "Keep your name under 80 characters"),
  programme: oneOf(PROGRAMMES, "Choose your programme"),
  cohort: oneOf(COHORTS, "Choose your cohort"),
  background_function: oneOf(FUNCTIONS, "Choose your pre-MBA function"),
  background_industry: oneOf(INDUSTRIES, "Choose your pre-MBA industry"),
  years_experience_band: z.enum(YEARS_EXPERIENCE_BANDS, {
    error: "Choose your years of experience",
  }),
  target_track: oneOf(TRACKS, "Choose a track"),
  heard_from: oneOf(HEARD_FROM, "Tell us how you heard about ISB Hood"),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type ProfileField = keyof ProfileInput;
