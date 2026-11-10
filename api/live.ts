/**
 * Live class token service (Vercel serverless, Web Standard handler).
 * Verifies the caller's Supabase session and class membership, then mints a LiveKit room token.
 *
 * Env: LIVEKIT_URL (wss://…), LIVEKIT_API_KEY, LIVEKIT_API_SECRET
 *      optional SUPABASE_URL / SUPABASE_ANON_KEY (defaults to the project baked into the app)
 */
import { AccessToken } from "livekit-server-sdk";

export const config = { maxDuration: 15 };

const SUPABASE_URL = process.env.SUPABASE_URL || "https://kjnqkhpnxojitvovmidr.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_GuXjosPJFO1-55842FDdxQ_4OsKfwfM";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const configured = () => Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);

export async function GET() {
  return json({ configured: configured() });
}

export async function POST(request: Request) {
  if (!configured()) return json({ error: "not_configured", detail: "LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET are not set on the server." }, 503);

  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  let body: { sessionId?: string };
  try { body = (await request.json()) as { sessionId?: string }; } catch { return json({ error: "bad_request" }, 400); }
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return json({ error: "bad_request" }, 400);

  const headers = { apikey: SUPABASE_KEY, Authorization: auth };
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers });
  if (!userRes.ok) return json({ error: "unauthorized" }, 401);
  const user = (await userRes.json()) as { id: string };

  // Row-level security makes this return nothing unless the caller belongs to the class.
  const sessRes = await fetch(`${SUPABASE_URL}/rest/v1/live_sessions?id=eq.${sessionId}&select=id,room,status,created_by,title`, { headers });
  const rows = (await sessRes.json()) as { id: string; room: string; status: string; created_by: string; title: string }[];
  const session = Array.isArray(rows) ? rows[0] : undefined;
  if (!session) return json({ error: "forbidden" }, 403);
  if (session.status === "ended") return json({ error: "ended" }, 410);

  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=name,role`, { headers });
  const prof = ((await profRes.json()) as { name: string; role: string }[])[0];
  const isTeacher = session.created_by === user.id;

  const at = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, {
    identity: user.id, name: prof?.name || "Learner", ttl: "4h",
    metadata: JSON.stringify({ role: isTeacher ? "teacher" : "student" }),
  });
  at.addGrant({
    room: session.room, roomJoin: true, canSubscribe: true, canPublishData: true,
    canPublish: isTeacher, roomAdmin: isTeacher,
  });
  return json({ token: await at.toJwt(), url: process.env.LIVEKIT_URL, room: session.room, teacher: isTeacher });
}
