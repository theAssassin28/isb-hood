import "server-only";
import { createClient } from "@/lib/supabase/server";

// Reads for the course catalogue. Row level security decides what comes back:
// everyone signed in sees courses and approved offerings; a person also sees
// offerings they proposed; moderators see everything.

export type Offering = {
  id: string;
  course_id: string;
  professor: string;
  term_label: string;
  cohort_year: string;
  is_current: boolean;
  status: "approved" | "pending";
};

export type Course = {
  id: string;
  code: string;
  title: string;
  area: string | null;
  open_to_readers: boolean;
};

export type CourseWithOfferings = Course & { offerings: Offering[] };

const OFFERING_COLUMNS = "id, course_id, professor, term_label, cohort_year, is_current, status";
const COURSE_COLUMNS = "id, code, title, area, open_to_readers";

function sortOfferings(offerings: Offering[]): Offering[] {
  return [...offerings].sort(
    (a, b) =>
      Number(b.is_current) - Number(a.is_current) ||
      b.cohort_year.localeCompare(a.cohort_year) ||
      a.professor.localeCompare(b.professor),
  );
}

export async function listCoursesWithOfferings(): Promise<CourseWithOfferings[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(`${COURSE_COLUMNS}, offerings(${OFFERING_COLUMNS})`)
    .order("title")
    .returns<CourseWithOfferings[]>();
  if (error) return null;
  return data.map((course) => ({ ...course, offerings: sortOfferings(course.offerings) }));
}

export async function getCourseWithOfferings(
  courseId: string,
): Promise<CourseWithOfferings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(`${COURSE_COLUMNS}, offerings(${OFFERING_COLUMNS})`)
    .eq("id", courseId)
    .maybeSingle<CourseWithOfferings>();
  if (error || !data) return null;
  return { ...data, offerings: sortOfferings(data.offerings) };
}
