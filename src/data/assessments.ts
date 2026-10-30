import type { AQuestion, Assessment } from "../types";
import { CLASS_NAME } from "./cohort";

const mcq = (id: string, topic: string, prompt: string, options: string[], correct: number, explanation: string, marks = 2): AQuestion => ({
  id, type: "mcq", topic, prompt, options, correct, explanation, marks,
});

const short = (id: string, topic: string, prompt: string, keyPoints: string[], explanation: string, marks = 4): AQuestion => ({
  id, type: "short", topic, prompt, keyPoints, explanation, marks,
});

const base = { level: "SHS" as const, className: CLASS_NAME, status: "published" as const, source: "seed" as const };
const DAY = 86_400_000;

/** Seeded tests that the whole class has been assigned. Teachers can add more in the builder. */
export const SEED_ASSESSMENTS: Assessment[] = [
  {
    ...base, id: "a-maths-1", title: "Core Maths Checkpoint 1", subject: "Core Mathematics", durationMin: 20, createdAt: Date.UTC(2026, 8, 8),
    questions: [
      mcq("m1", "Algebra", "Solve for x: 3x - 7 = 11", ["x = 4", "x = 6", "x = 18", "x = 3"], 1, "Add 7 to both sides to get 3x = 18, then divide by 3 so x = 6."),
      mcq("m2", "Algebra", "Factorise x^2 + 5x + 6", ["(x+1)(x+6)", "(x+2)(x+3)", "(x-2)(x-3)", "(x+5)(x+1)"], 1, "Find two numbers that multiply to 6 and add to 5: 2 and 3."),
      mcq("m3", "Geometry", "The sum of the interior angles of a hexagon is", ["540 degrees", "720 degrees", "900 degrees", "360 degrees"], 1, "(n - 2) x 180 = 4 x 180 = 720 degrees."),
      mcq("m4", "Geometry", "A right-angled triangle has sides 6 cm and 8 cm. Its hypotenuse is", ["10 cm", "12 cm", "14 cm", "9 cm"], 0, "Pythagoras: sqrt(36 + 64) = sqrt(100) = 10 cm."),
      mcq("m5", "Statistics", "The median of 3, 9, 4, 7, 10 is", ["4", "7", "6.6", "9"], 1, "Order the data: 3, 4, 7, 9, 10. The middle value is 7."),
      short("m6", "Algebra", "A trader buys a bag of rice for GH¢ 120 and sells it at a 25% profit. Find the selling price, showing your working.",
        ["profit = 25% of 120", "30", "selling price = 120 + 30", "150"],
        "Profit = 25/100 x 120 = GH¢ 30, so the selling price is 120 + 30 = GH¢ 150."),
    ],
  },
  {
    ...base, id: "a-science-1", title: "Integrated Science Test: Forces and Circuits", subject: "Integrated Science", durationMin: 25, createdAt: Date.UTC(2026, 8, 22),
    questions: [
      mcq("s1", "Mechanics", "The SI unit of force is the", ["joule", "newton", "watt", "pascal"], 1, "Force is measured in newtons (N)."),
      mcq("s2", "Mechanics", "A 5 kg mass accelerates at 3 m/s^2. The resultant force is", ["1.7 N", "8 N", "15 N", "2 N"], 2, "F = ma = 5 x 3 = 15 N."),
      mcq("s3", "Electricity", "Which law relates voltage, current and resistance?", ["Boyle's law", "Ohm's law", "Newton's law", "Hooke's law"], 1, "Ohm's law: V = IR."),
      mcq("s4", "Electricity", "A 12 V battery drives a current of 2 A through a resistor. Its resistance is", ["24 ohm", "6 ohm", "10 ohm", "0.17 ohm"], 1, "R = V / I = 12 / 2 = 6 ohm."),
      mcq("s5", "Chemical bonding", "Sodium chloride is formed by what type of bonding?", ["Covalent", "Metallic", "Ionic", "Hydrogen"], 2, "Sodium transfers an electron to chlorine, forming ions held by ionic bonds."),
      mcq("s6", "Cell biology", "Which organelle releases energy in a cell?", ["Nucleus", "Ribosome", "Mitochondrion", "Vacuole"], 2, "Mitochondria carry out aerobic respiration."),
      short("s7", "Electricity", "Explain why the brightness of lamps in a series circuit decreases as more lamps are added.",
        ["total resistance increases", "current decreases", "same voltage shared", "lamps become dimmer"],
        "Adding lamps in series raises total resistance, so the current falls and each lamp gets less of the battery voltage, so they glow dimmer.", 4),
    ],
  },
  {
    ...base, id: "a-econ-1", title: "Economics Quick Quiz: Demand and Supply", subject: "Economics", durationMin: 15, createdAt: Date.now() - 2 * DAY,
    questions: [
      mcq("e1", "Economics", "When the price of a normal good rises, other things equal, quantity demanded", ["rises", "falls", "stays the same", "doubles"], 1, "The law of demand: price and quantity demanded move in opposite directions."),
      mcq("e2", "Economics", "A shift of the supply curve to the right is caused by", ["higher input costs", "improved technology", "a tax on producers", "fewer sellers"], 1, "Better technology lowers costs, so firms supply more at every price."),
      mcq("e3", "Economics", "Opportunity cost is best described as", ["the money price paid", "the next best alternative given up", "total production cost", "a government fee"], 1, "It is the value of the next best alternative that you sacrifice."),
      mcq("e4", "Statistics", "In the data set 2, 3, 3, 5, 7 the mode is", ["3", "5", "4", "2"], 0, "The mode is the value that appears most often: 3."),
      short("e5", "Economics", "State two causes of an increase in the demand for cocoa products, with brief reasons.",
        ["rise in income", "change in taste", "price of substitutes", "population increase"],
        "Examples: higher consumer incomes raise purchasing power; a change in taste or a rise in the price of substitutes shifts demand to the right.", 4),
    ],
  },
];
