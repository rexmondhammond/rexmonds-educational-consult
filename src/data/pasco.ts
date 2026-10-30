import type { PascoQuestion } from "../types";

/**
 * IMPORTANT: These are original exam-style practice items written in the
 * format and difficulty of BECE and WASSCE papers, tagged by year and topic
 * for the Pasco engine. They are NOT reproductions of copyrighted WAEC
 * papers. To serve genuine past papers, load licensed WAEC content into this
 * same shape (see PascoQuestion in types.ts).
 */
export const PASCO_NOTICE =
  "Exam-style practice items modelled on WAEC format. Swap in licensed past papers via the same data shape.";

export const PASCO: PascoQuestion[] = [
  {
    id: "bece-math-2025-1",
    exam: "BECE", subject: "Mathematics", year: 2025, number: "1",
    question: "Simplify 3/4 + 5/8 - 1/2.",
    marks: { M: 1, A: 1, B: 0 },
    scheme: [
      { label: "Common denominator", mark: "M", text: "Convert to eighths: 6/8 + 5/8 - 4/8" },
      { label: "Final value", mark: "A", text: "7/8" },
    ],
    solution: "6/8 + 5/8 - 4/8 = 7/8",
    examinerComment: "Many candidates added numerators and denominators separately (3+5+1)/(4+8+2).",
  },
  {
    id: "bece-math-2023-2",
    exam: "BECE", subject: "Mathematics", year: 2023, number: "2",
    question: "A shopkeeper buys a phone for GH₵ 800 and sells it at a 25% profit. Find the selling price.",
    marks: { M: 1, A: 1, B: 1 },
    scheme: [
      { label: "Concept", mark: "B", text: "Profit is calculated on the cost price" },
      { label: "Method", mark: "M", text: "25/100 x 800 = 200" },
      { label: "Accuracy", mark: "A", text: "800 + 200 = GH₵ 1,000" },
    ],
    solution: "Profit = 25% of 800 = 200. Selling price = 800 + 200 = GH₵ 1,000.",
    examinerComment: "Candidates stopped at the profit (GH₵ 200) and did not add it to the cost price.",
  },
  {
    id: "bece-sci-2022-3",
    exam: "BECE", subject: "Integrated Science", year: 2022, number: "3",
    question: "Which of the following is a chemical change? A. Melting of ice  B. Rusting of iron  C. Dissolving sugar  D. Boiling water",
    options: ["Melting of ice", "Rusting of iron", "Dissolving sugar", "Boiling water"],
    marks: { M: 0, A: 0, B: 1 },
    scheme: [{ label: "Concept", mark: "B", text: "A new substance (iron oxide) forms during rusting" }],
    solution: "B. Rusting forms iron oxide, a new substance.",
    examinerComment: "Weaker candidates treated any visible change as chemical.",
  },
  {
    id: "bece-eng-2021-4",
    exam: "BECE", subject: "English Language", year: 2021, number: "4",
    question: "Choose the correct option: Neither of the boys ___ present. A. were  B. are  C. was  D. have been",
    options: ["were", "are", "was", "have been"],
    marks: { M: 0, A: 0, B: 1 },
    scheme: [{ label: "Concept", mark: "B", text: "'Neither' is singular and takes a singular verb" }],
    solution: "C. was",
    examinerComment: "Candidates matched the verb to 'boys' instead of 'neither'.",
  },
  {
    id: "bece-social-2020-5",
    exam: "BECE", subject: "Social Studies", year: 2020, number: "5",
    question: "State two duties of a responsible Ghanaian citizen.",
    marks: { M: 0, A: 1, B: 1 },
    scheme: [
      { label: "Duty 1", mark: "B", text: "Pay taxes / obey the law" },
      { label: "Duty 2", mark: "A", text: "Protect public property / vote / respect others' rights" },
    ],
    solution: "Pay taxes and obey the laws of Ghana.",
    examinerComment: "Some candidates listed rights (such as free speech) instead of duties.",
  },
  {
    id: "wassce-cm-2025-1",
    exam: "WASSCE", subject: "Core Mathematics", year: 2025, number: "1",
    question: "Solve the equation x² - 7x + 10 = 0.",
    marks: { M: 2, A: 1, B: 0 },
    scheme: [
      { label: "Factor pair", mark: "M", text: "Numbers with product 10 and sum -7: -2, -5" },
      { label: "Factorised form", mark: "M", text: "(x - 2)(x - 5) = 0" },
      { label: "Both roots", mark: "A", text: "x = 2 or x = 5" },
    ],
    solution: "(x - 2)(x - 5) = 0, so x = 2 or x = 5.",
    examinerComment: "Candidates gave the factors' signs as the roots (x = -2, x = -5).",
  },
  {
    id: "wassce-cm-2024-2",
    exam: "WASSCE", subject: "Core Mathematics", year: 2024, number: "2",
    question: "Find the mean of the numbers 6, 8, 11, 13, 17.",
    marks: { M: 1, A: 1, B: 0 },
    scheme: [
      { label: "Sum", mark: "M", text: "6 + 8 + 11 + 13 + 17 = 55" },
      { label: "Mean", mark: "A", text: "55 / 5 = 11" },
    ],
    solution: "Sum = 55; mean = 55 / 5 = 11.",
    examinerComment: "Several candidates reported the median or divided by the wrong count.",
  },
  {
    id: "wassce-phy-2023-3",
    exam: "WASSCE", subject: "Physics", year: 2023, number: "3",
    question: "A body starts from rest and accelerates uniformly at 3 m/s² for 4 s. Calculate (a) the final velocity, (b) the distance covered.",
    marks: { M: 2, A: 2, B: 0 },
    scheme: [
      { label: "Velocity method", mark: "M", text: "v = u + at = 0 + 3 x 4" },
      { label: "Velocity answer", mark: "A", text: "12 m/s" },
      { label: "Distance method", mark: "M", text: "s = ut + ½at² = ½ x 3 x 16" },
      { label: "Distance answer", mark: "A", text: "24 m" },
    ],
    solution: "(a) v = 12 m/s. (b) s = 24 m.",
    examinerComment: "Units were frequently omitted, and some candidates used u = 3.",
  },
  {
    id: "wassce-chem-2022-4",
    exam: "WASSCE", subject: "Chemistry", year: 2022, number: "4",
    question: "Calculate the number of moles in 11 g of carbon dioxide. (C = 12, O = 16)",
    marks: { M: 2, A: 1, B: 0 },
    scheme: [
      { label: "Molar mass", mark: "M", text: "CO₂ = 12 + 32 = 44 g/mol" },
      { label: "Formula", mark: "M", text: "n = mass / molar mass = 11 / 44" },
      { label: "Answer", mark: "A", text: "0.25 mol" },
    ],
    solution: "n = 11 / 44 = 0.25 mol.",
    examinerComment: "Candidates used 28 or 12 as the molar mass of CO₂.",
  },
  {
    id: "wassce-bio-2021-5",
    exam: "WASSCE", subject: "Biology", year: 2021, number: "5",
    question: "Two heterozygous tall plants (Tt) are crossed. What fraction of the offspring is expected to be short?",
    marks: { M: 1, A: 1, B: 1 },
    scheme: [
      { label: "Gametes", mark: "B", text: "Each parent produces T and t gametes" },
      { label: "Cross", mark: "M", text: "TT, Tt, Tt, tt" },
      { label: "Fraction", mark: "A", text: "1/4" },
    ],
    solution: "Offspring TT : Tt : Tt : tt, so 1/4 are short (tt).",
    examinerComment: "Some candidates answered 3/4, the tall fraction.",
  },
  {
    id: "wassce-eco-2020-6",
    exam: "WASSCE", subject: "Economics", year: 2020, number: "6",
    question: "State two factors that can shift the demand curve of a normal good to the right.",
    marks: { M: 0, A: 1, B: 1 },
    scheme: [
      { label: "Factor 1", mark: "B", text: "Increase in consumers' income" },
      { label: "Factor 2", mark: "A", text: "Increase in the price of a substitute / favourable change in taste" },
    ],
    solution: "A rise in income and a rise in the price of a substitute.",
    examinerComment: "Candidates named a fall in the good's own price, which is a movement, not a shift.",
  },
  {
    id: "wassce-eng-2019-7",
    exam: "WASSCE", subject: "English Language", year: 2019, number: "7",
    question: "Choose the word nearest in meaning to 'candid'. A. secretive  B. frank  C. polite  D. cautious",
    options: ["secretive", "frank", "polite", "cautious"],
    marks: { M: 0, A: 0, B: 1 },
    scheme: [{ label: "Lexis", mark: "B", text: "'Candid' means open and honest" }],
    solution: "B. frank",
    examinerComment: "Candidates confused 'candid' with 'polite'.",
  },
];

export const PASCO_SUBJECTS = (exam: "BECE" | "WASSCE"): string[] =>
  Array.from(new Set(PASCO.filter((q) => q.exam === exam).map((q) => q.subject)));
