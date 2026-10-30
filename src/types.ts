export type Level = "JHS" | "SHS";
export type Track = "Core" | "Elective" | "National";

export interface WorkedExample {
  title: string;
  problem: string;
  steps: string[];
  answer: string;
}

export interface Chapter {
  code: string;
  title: string;
  outcomes: string[];
  keyIdeas: string[];
  example: WorkedExample;
  pitfall: string;
}

export interface Subject {
  id: string;
  name: string;
  level: Level;
  track: Track;
  syllabusCode: string;
  accent: "amber" | "cyan" | "emerald" | "violet" | "rose" | "sky";
  summary: string;
  chapters: Chapter[];
}

export interface PascoQuestion {
  id: string;
  exam: "BECE" | "WASSCE";
  subject: string;
  year: number;
  number: string;
  question: string;
  options?: string[];
  marks: { M: number; A: number; B: number };
  scheme: { label: string; mark: "M" | "A" | "B"; text: string }[];
  solution: string;
  examinerComment: string;
}

export interface School {
  name: string;
  category: "A" | "B" | "C";
  region: string;
  maxAggregate: number;
}

export interface University {
  name: string;
  programme: string;
  maxAggregate: number;
}

export interface Checkpoint {
  at: number;
  question: string;
  options: string[];
  correct: number;
  hint: string;
  rationale: string;
}

export interface TranscriptLine {
  at: number;
  text: string;
}

export interface VideoLesson {
  id: string;
  title: string;
  subject: string;
  level: string;
  duration: number;
  source: "demo" | "recorded";
  blobKey?: string;
  checkpoints: Checkpoint[];
  transcript: TranscriptLine[];
}

export interface ClassroomCourse {
  id: string;
  name: string;
  section: string;
  teacher: string;
}

export interface ClassroomItem {
  id: string;
  courseId: string;
  kind: "assignment" | "announcement" | "material";
  title: string;
  body: string;
  due?: string;
  sizeKB: number;
}

export interface Progress {
  completedChapters: string[];
  quizMastery: Record<string, number>;
  flashcards: Record<string, { box: number; due: number }>;
  badges: string[];
  goals: { id: string; text: string; done: boolean }[];
  library: string[];
}

export interface Settings {
  dataSaver: boolean;
  audioOnly: boolean;
  compressImages: boolean;
  carrier: "MTN" | "Telecel" | "AirtelTigo";
  cachedTextbooks: string[];
  cachedPasco: string[];
  name?: string;
  level?: Level;
  onboarded?: boolean;
}

export type View =
  | "dashboard"
  | "vault"
  | "studio"
  | "pasco"
  | "player"
  | "classroom"
  | "data"
  | "tutor";
