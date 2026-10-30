import type { Student } from "../types";

export const CLASS_NAME = "SHS 2 Science A";

/** Topics tracked on the class heatmap. Assessments tag each question with one of these. */
export const TOPICS = ["Algebra", "Geometry", "Statistics", "Mechanics", "Electricity", "Chemical bonding", "Cell biology", "Economics"] as const;
export type Topic = (typeof TOPICS)[number];

/** Small deterministic PRNG so the simulated class is identical on every load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hashString = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

const NAMES = [
  "Kwame Mensah", "Ama Serwaa", "Kofi Boateng", "Akosua Owusu", "Yaw Asante", "Abena Frimpong",
  "Kojo Antwi", "Efua Quaye", "Nana Yaa Adjei", "Kwesi Appiah", "Adwoa Darko", "Fiifi Ankrah",
  "Esi Ampofo", "Selorm Agbeko", "Mawuli Tetteh", "Dzifa Kpodo", "Ibrahim Mahama", "Fatima Alhassan",
  "Samuel Ofori", "Gifty Nkansah", "Prince Addo", "Mercy Armah", "Richmond Sarpong", "Josephine Lamptey",
];

/** 24 simulated learners; each has a strength profile so the analytics tell a believable story. */
export const STUDENTS: Student[] = NAMES.map((name, i) => {
  const rnd = mulberry32(1000 + i * 77);
  const ability = 38 + rnd() * 52; // overall ability 38-90
  const mastery = {} as Record<string, number>;
  TOPICS.forEach((t) => {
    // Class-level difficulty: Geometry and Electricity are weaker topics for this cohort.
    const topicShift = t === "Geometry" ? -14 : t === "Electricity" ? -11 : t === "Statistics" ? 6 : 0;
    mastery[t] = Math.max(8, Math.min(98, Math.round(ability + topicShift + (rnd() - 0.5) * 26)));
  });
  return {
    id: `s${i + 1}`,
    name,
    mastery,
    attendance: Math.round(72 + rnd() * 27),
    streak: Math.round(rnd() * 21),
  };
});

export const ME_ID = "me";
