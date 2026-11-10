import { BarChart3, Film, Presentation, School, Video, BookOpen, Bot, Calculator, ClipboardCheck, ClipboardList, Cloud, GraduationCap, LayoutDashboard, LineChart, PlayCircle, Radio, Table2, Zap } from "lucide-react";
import type { ComponentType } from "react";
import type { Role, View } from "./types";

export interface NavItem {
  id: View;
  label: string;
  short: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}

const STUDENT: NavItem[] = [
  { id: "dashboard", label: "My Learning", short: "Home", hint: "Goals, rings and flashcards", icon: LayoutDashboard },
  { id: "tutor", label: "AI Tutor", short: "AI", hint: "Explain, quiz, mark, plan", icon: Bot },
  { id: "live", label: "Live Class", short: "Live", hint: "Join your teacher's lesson", icon: Video },
  { id: "library", label: "Recorded Classes", short: "Replays", hint: "Watch lessons any time", icon: Film },
  { id: "assessments", label: "Assessments", short: "Tests", hint: "Take tests and see feedback", icon: ClipboardCheck },
  { id: "vault", label: "Textbook Vault", short: "Books", hint: "NaCCA-aligned study manuals", icon: BookOpen },
  { id: "pasco", label: "Pasco Lab", short: "Pasco", hint: "Past questions and placement", icon: Calculator },
  { id: "growth", label: "My Growth", short: "Growth", hint: "Mastery and recommendations", icon: LineChart },
  { id: "player", label: "Video Lessons", short: "Videos", hint: "Interactive checkpoints", icon: PlayCircle },
  { id: "classes", label: "My Classes", short: "Classes", hint: "Join a class with a code", icon: School },
  { id: "classroom", label: "Google Classroom", short: "Class", hint: "Sync with Google Classroom", icon: Cloud },
  { id: "data", label: "Data Saver", short: "Data", hint: "Low-bandwidth and offline mode", icon: Zap },
];

const TEACHER: NavItem[] = [
  { id: "t-home", label: "Class Overview", short: "Home", hint: "Analytics and recommendations", icon: BarChart3 },
  { id: "classes", label: "Classes", short: "Classes", hint: "Create classes and share codes", icon: School },
  { id: "live", label: "Live Class", short: "Live", hint: "Teach live, share your screen, record", icon: Video },
  { id: "slides", label: "AI Slides", short: "Slides", hint: "Lengthy decks for any topic", icon: Presentation },
  { id: "library", label: "Recorded Classes", short: "Replays", hint: "Your saved lessons", icon: Film },
  { id: "t-build", label: "Assessment Builder", short: "Build", hint: "Create and publish tests", icon: ClipboardList },
  { id: "t-grades", label: "Gradebook", short: "Grades", hint: "Mark, confirm and export", icon: Table2 },
  { id: "tutor", label: "AI Assistant", short: "AI", hint: "Lesson plans, questions, feedback", icon: Bot },
  { id: "studio", label: "Live Studio", short: "Studio", hint: "Chalkboard, record and broadcast", icon: Radio },
  { id: "vault", label: "Curriculum Vault", short: "Books", hint: "Syllabus, examples, pitfalls", icon: BookOpen },
  { id: "pasco", label: "Question Bank", short: "Pasco", hint: "Past questions and mark schemes", icon: Calculator },
  { id: "classroom", label: "Google Classroom", short: "Class", hint: "Sync with Google Classroom", icon: Cloud },
  { id: "data", label: "Data Saver", short: "Data", hint: "Low-bandwidth and offline mode", icon: Zap },
];

export const navFor = (role: Role): NavItem[] => (role === "teacher" ? TEACHER : STUDENT);
export const homeFor = (role: Role): View => (role === "teacher" ? "t-home" : "dashboard");
export const ROLE_ICON = { student: GraduationCap, teacher: ClipboardCheck } as const;
