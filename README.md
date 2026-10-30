# Rexmond's Educational Consult

Ghana's JHS/SHS learning platform: NaCCA/GES textbook vault, Pasco lab with stanine and placement tools, live chalkboard studio with recording, interactive video lessons, Google Classroom vault, data-saver/offline mode, and an **AI tutor** (explain, quiz, WAEC-style marking, study plans).

## Two experiences in one app
- **Student:** My Learning (goals, rings, flashcards, today's focus), AI Tutor, Assessments (timed tests, instant marking, feedback), My Growth (topic mastery, trend, personalised recommendations), Textbook Vault, Pasco Lab, Video Lessons.
- **Teacher:** Class Overview (KPIs, score distribution, topic mastery, mastery heatmap, recommended actions), Assessment Builder (manual or AI-generated questions, publish to class), Gradebook (auto-marking, key-point suggestions, AI marking, confirm, item analysis, CSV export), AI Assistant (lesson plans, question sets, feedback), Live Studio.
- Switch roles with the Student/Teacher toggle. The class roster is simulated and deterministic so analytics are populated; assessments, submissions and grades persist in the browser (localStorage). A production deployment would add a database and sign-in.

## Stack
React 19 + TypeScript, Tailwind CSS v4, Vite, Lucide, canvas-confetti. AI runs through a Vercel serverless function (`api/tutor.ts`) so the API key never reaches the browser.

## Develop
```bash
npm install
npm run dev          # UI only; the AI tutor falls back to the offline curriculum vault
npx vercel dev       # UI + /api/tutor (needs .env.local, see .env.example)
npm run build        # tsc --noEmit && vite build
```

## Deploy to Vercel
1. Push to GitHub, then import the repo at vercel.com/new (Vite is auto-detected).
2. Add `GEMINI_API_KEY` (free, from aistudio.google.com/apikey) or `ANTHROPIC_API_KEY` under Settings > Environment Variables, then redeploy.
3. Open the site and try the **AI Tutor** tab. `GET /api/tutor` reports `{"configured":true}` when the key is set.

Syllabus codes and past-question content are indicative; verify against current NaCCA and WAEC documents before relying on them for exams.
