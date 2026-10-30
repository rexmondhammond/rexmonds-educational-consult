import type { VideoLesson } from "../types";

/**
 * Built-in lessons are "board lessons": the player animates a chalkboard on a
 * virtual clock (no third-party video files), while recorded lessons published
 * from the Live Studio play back as real video blobs from IndexedDB.
 */
export const DEMO_LESSONS: VideoLesson[] = [
  {
    id: "demo-quadratics",
    title: "Solving Quadratic Equations by Factorisation",
    subject: "Core Mathematics",
    level: "SHS 1",
    duration: 90,
    source: "demo",
    checkpoints: [
      {
        at: 30,
        question: "Which pair of numbers has product 6 and sum 5?",
        options: ["1 and 6", "2 and 3", "-2 and -3", "3 and 4"],
        correct: 1,
        hint: "List the factor pairs of 6 first, then check their sums.",
        rationale: "2 x 3 = 6 and 2 + 3 = 5. WAEC awards the method mark for finding the correct factor pair.",
      },
      {
        at: 70,
        question: "If (x - 2)(x - 3) = 0, what are the values of x?",
        options: ["x = -2 or x = -3", "x = 2 or x = 3", "x = 5", "x = 6"],
        correct: 1,
        hint: "A product is zero when one of the factors is zero.",
        rationale: "Setting each bracket to zero gives x = 2 or x = 3. Giving both roots earns the accuracy mark.",
      },
    ],
    transcript: [
      { at: 0, text: "Today we solve x² + ... = 0 by factorising into two brackets." },
      { at: 15, text: "Write the equation x² - 5x + 6 = 0 and find two numbers with product 6 and sum -5." },
      { at: 35, text: "The numbers are -2 and -3, so the factorised form is (x - 2)(x - 3) = 0." },
      { at: 55, text: "Use the zero product rule: either bracket can equal zero." },
      { at: 75, text: "So x = 2 or x = 3. Always check both roots in the original equation." },
    ],
  },
  {
    id: "demo-ohm",
    title: "Ohm's Law and Series Circuits",
    subject: "Physics",
    level: "SHS 2",
    duration: 80,
    source: "demo",
    checkpoints: [
      {
        at: 35,
        question: "Resistors of 4 Ω and 6 Ω are in series. What is the total resistance?",
        options: ["2.4 Ω", "10 Ω", "24 Ω", "5 Ω"],
        correct: 1,
        hint: "In series, resistances simply add.",
        rationale: "R = 4 + 6 = 10 Ω. The parallel formula (2.4 Ω) is a classic examiner-reported mistake.",
      },
      {
        at: 65,
        question: "With 20 V across a 10 Ω total resistance, what is the current?",
        options: ["0.5 A", "2 A", "200 A", "30 A"],
        correct: 1,
        hint: "Rearrange V = IR to make I the subject.",
        rationale: "I = V / R = 20 / 10 = 2 A.",
      },
    ],
    transcript: [
      { at: 0, text: "Ohm's law links voltage, current and resistance: V = IR." },
      { at: 20, text: "In a series circuit the same current flows through every component." },
      { at: 30, text: "Total resistance in series is the sum of the individual resistances." },
      { at: 55, text: "Use I = V / R to find the current once you know the total resistance." },
    ],
  },
  {
    id: "demo-mole",
    title: "The Mole Concept Made Simple",
    subject: "Chemistry",
    level: "SHS 1",
    duration: 75,
    source: "demo",
    checkpoints: [
      {
        at: 40,
        question: "How many moles are in 36 g of water? (H = 1, O = 16)",
        options: ["1 mol", "2 mol", "18 mol", "0.5 mol"],
        correct: 1,
        hint: "Find the molar mass of H₂O first.",
        rationale: "Molar mass = 18 g/mol, so n = 36 / 18 = 2 mol.",
      },
    ],
    transcript: [
      { at: 0, text: "The mole is a counting unit for very small particles." },
      { at: 20, text: "One mole contains 6.02 x 10²³ particles." },
      { at: 35, text: "Moles equal mass divided by molar mass." },
    ],
  },
];
