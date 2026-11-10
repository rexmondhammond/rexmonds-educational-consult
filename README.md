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

## Teaching features (v3)

| Feature | Where | Needs |
|---|---|---|
| Real classes (create, join by code, roster, announcements) | My Classes | Supabase (built in) |
| AI slides (12 to 24 slides, worked examples, diagrams, notes), presenter mode, PDF and PowerPoint export | AI Slides | `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` |
| Live class: video, mic, screen share, synced slides, chat, raise hand | Live Class | LiveKit env vars |
| Recording (tab or screen plus mic) saved in 4-minute segments, replay with resume | Live Class, Recorded Classes | Supabase storage (built in) |
| Publish announcements, assessments and recordings to Google Classroom; import coursework | Google Classroom | `VITE_GOOGLE_CLIENT_ID` |

### Live classes (LiveKit, free tier)
1. Create a project at https://cloud.livekit.io and copy the WebSocket URL, API key and secret.
2. In Vercel, Settings, Environment Variables, add `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, then redeploy.
3. Without these, teachers can still present slides and record lessons; students watch the recordings.

### Google Classroom
1. Google Cloud Console, create a project, enable the **Google Classroom API**.
2. APIs and Services, OAuth consent screen: External, add your Gmail as a test user, add the Classroom scopes.
3. Credentials, Create OAuth client ID, type **Web application**, authorised JavaScript origin = your Vercel URL (and http://localhost:5173).
4. Put the client ID in Vercel as `VITE_GOOGLE_CLIENT_ID` and redeploy.

### Supabase
Turn off Authentication, Providers, Email, **Confirm email** for instant sign-in, and set Authentication, URL Configuration, Site URL to your Vercel URL.
