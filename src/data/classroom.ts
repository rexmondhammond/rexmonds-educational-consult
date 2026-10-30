import type { ClassroomCourse, ClassroomItem } from "../types";

/**
 * Sample Google Classroom index used when no OAuth client is configured.
 * When VITE_GOOGLE_CLIENT_ID is set, the Classroom module requests read-only
 * scopes and indexes real courses; file bodies are always cached in the
 * platform's own IndexedDB and never copied into the student's Drive.
 */
export const SAMPLE_COURSES: ClassroomCourse[] = [
  { id: "c1", name: "SHS 2 Elective Mathematics", section: "2 Science A", teacher: "Mr. Mensah" },
  { id: "c2", name: "SHS 2 Physics", section: "2 Science A", teacher: "Mrs. Owusu" },
  { id: "c3", name: "SHS 2 English Language", section: "2 Science A", teacher: "Ms. Adjei" },
];

export const SAMPLE_ITEMS: ClassroomItem[] = [
  { id: "i1", courseId: "c1", kind: "assignment", title: "Differentiation worksheet 3", body: "Complete questions 1 to 10 on stationary points. Show full working.", due: "2026-11-04", sizeKB: 420 },
  { id: "i2", courseId: "c1", kind: "material", title: "Matrices revision notes", body: "Determinants, inverses and solving simultaneous equations with matrices.", sizeKB: 880 },
  { id: "i3", courseId: "c2", kind: "assignment", title: "Lab report: Ohm's law", body: "Submit your readings table, graph of V against I and your conclusion.", due: "2026-11-06", sizeKB: 640 },
  { id: "i4", courseId: "c2", kind: "announcement", title: "Practical exam schedule", body: "Practicals begin the week of 16 November. Bring your lab notebook.", sizeKB: 4 },
  { id: "i5", courseId: "c3", kind: "assignment", title: "Argumentative essay draft", body: "Write 450 words on whether school uniforms should be compulsory.", due: "2026-11-09", sizeKB: 12 },
  { id: "i6", courseId: "c3", kind: "material", title: "Summary writing guide", body: "Step-by-step approach to selecting points and rewriting them in your own words.", sizeKB: 310 },
];
