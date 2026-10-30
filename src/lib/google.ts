import type { ClassroomCourse, ClassroomItem } from "../types";

export const GOOGLE_CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";
export const CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
].join(" ");

interface TokenResponse { access_token?: string; error?: string }
interface TokenClient { requestAccessToken: () => void }
interface GisWindow {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: (cfg: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: unknown) => void }) => TokenClient;
      };
    };
  };
}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as GisWindow).google?.accounts) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Google sign-in (offline or blocked)."));
    document.head.appendChild(s);
  });
}

export async function signIn(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) throw new Error("No Google client ID configured. Set VITE_GOOGLE_CLIENT_ID to enable live sync.");
  await loadGis();
  const g = (window as unknown as GisWindow).google;
  if (!g) throw new Error("Google sign-in failed to initialise.");
  return new Promise<string>((resolve, reject) => {
    const client = g.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: CLASSROOM_SCOPES,
      callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new Error(r.error ?? "Sign-in was cancelled."))),
      error_callback: () => reject(new Error("Sign-in was cancelled or blocked (pop-ups may be disabled).")),
    });
    client.requestAccessToken();
  });
}

async function api<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`https://classroom.googleapis.com/v1/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Classroom API ${res.status}: ${res.statusText}`);
  return (await res.json()) as T;
}

interface ApiCourse { id: string; name: string; section?: string; ownerId?: string }
interface ApiWork { id: string; title: string; description?: string; dueDate?: { year: number; month: number; day: number } }
interface ApiAnnouncement { id: string; text?: string }

/** Read-only index. Nothing is written to Google Drive or Classroom. */
export async function fetchClassroom(token: string): Promise<{ courses: ClassroomCourse[]; items: ClassroomItem[] }> {
  const { courses = [] } = await api<{ courses?: ApiCourse[] }>(token, "courses?courseStates=ACTIVE&pageSize=20");
  const items: ClassroomItem[] = [];
  await Promise.all(
    courses.map(async (c) => {
      const [work, ann] = await Promise.all([
        api<{ courseWork?: ApiWork[] }>(token, `courses/${c.id}/courseWork?pageSize=30`).catch(() => ({ courseWork: [] as ApiWork[] })),
        api<{ announcements?: ApiAnnouncement[] }>(token, `courses/${c.id}/announcements?pageSize=30`).catch(() => ({ announcements: [] as ApiAnnouncement[] })),
      ]);
      for (const w of work.courseWork ?? []) {
        const due = w.dueDate ? `${w.dueDate.year}-${String(w.dueDate.month).padStart(2, "0")}-${String(w.dueDate.day).padStart(2, "0")}` : undefined;
        items.push({ id: `w-${w.id}`, courseId: c.id, kind: "assignment", title: w.title, body: w.description ?? "", due, sizeKB: Math.ceil((w.description?.length ?? 0) / 1024) || 1 });
      }
      for (const a of ann.announcements ?? []) {
        const text = a.text ?? "";
        items.push({ id: `a-${a.id}`, courseId: c.id, kind: "announcement", title: text.slice(0, 60) || "Announcement", body: text, sizeKB: Math.ceil(text.length / 1024) || 1 });
      }
    }),
  );
  return { courses: courses.map((c) => ({ id: c.id, name: c.name, section: c.section ?? "", teacher: "" })), items };
}
