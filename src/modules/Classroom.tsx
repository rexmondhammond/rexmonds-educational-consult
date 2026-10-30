import { useCallback, useEffect, useMemo, useState } from "react";
import { Cloud, CloudOff, Database, HardDrive, LogIn, RefreshCw, Trash2 } from "lucide-react";
import { SAMPLE_COURSES, SAMPLE_ITEMS } from "../data/classroom";
import { GOOGLE_CLIENT_ID, fetchClassroom, signIn } from "../lib/google";
import { deleteBlob, formatBytes, getBlob, putBlob, usePersistentState } from "../lib/storage";
import { Button, Glass, Pill, SectionTitle, cx } from "../components/ui";
import type { ClassroomCourse, ClassroomItem } from "../types";

interface Index { courses: ClassroomCourse[]; items: ClassroomItem[]; source: "sample" | "google"; syncedAt: number | null }

const EMPTY: Index = { courses: SAMPLE_COURSES, items: SAMPLE_ITEMS, source: "sample", syncedAt: null };
const cacheKey = (id: string) => `classroom:${id}`;

export default function Classroom() {
  const [index, setIndex] = usePersistentState<Index>("rex.classroom.index.v1", EMPTY);
  const [cached, setCached] = usePersistentState<string[]>("rex.classroom.cached.v1", []);
  const [courseId, setCourseId] = useState<string>(index.courses[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openBody, setOpenBody] = useState<string>("");

  const items = useMemo(() => index.items.filter((i) => i.courseId === courseId), [index.items, courseId]);
  const cachedBytes = useMemo(() => index.items.filter((i) => cached.includes(i.id)).reduce((n, i) => n + i.sizeKB * 1024, 0), [index.items, cached]);

  useEffect(() => {
    if (!index.courses.some((c) => c.id === courseId)) setCourseId(index.courses[0]?.id ?? "");
  }, [index.courses, courseId]);

  const cacheItem = useCallback(async (item: ClassroomItem) => {
    const payload = new Blob([JSON.stringify({ ...item, cachedAt: Date.now() })], { type: "application/json" });
    await putBlob(cacheKey(item.id), payload);
    setCached((c) => (c.includes(item.id) ? c : [...c, item.id]));
  }, [setCached]);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await signIn();
      const data = await fetchClassroom(token);
      setIndex({ courses: data.courses, items: data.items, source: "google", syncedAt: Date.now() });
      // Cache each item's text inside the platform's own storage. Nothing is written to Drive.
      for (const it of data.items) await cacheItem(it);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  };

  const useSample = async () => {
    setBusy(true);
    setIndex({ ...EMPTY, syncedAt: Date.now() });
    for (const it of SAMPLE_ITEMS) await cacheItem(it);
    setBusy(false);
  };

  const open = async (item: ClassroomItem) => {
    setOpenId(item.id);
    const blob = await getBlob(cacheKey(item.id));
    if (blob) {
      try { setOpenBody((JSON.parse(await blob.text()) as ClassroomItem).body); return; } catch { /* fall through */ }
    }
    setOpenBody(item.body);
  };

  const evict = async (id: string) => {
    await deleteBlob(cacheKey(id));
    setCached((c) => c.filter((x) => x !== id));
  };

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Zero-Drive architecture" title="Google Classroom Vault">
        <Pill tone={index.source === "google" ? "emerald" : "amber"}>{index.source === "google" ? "Live Google data" : "Sample data"}</Pill>
      </SectionTitle>

      <Glass className="grid gap-4 p-5 md:grid-cols-3">
        <Stat icon={<HardDrive className="h-5 w-5 text-emerald-300" />} label="Google Drive bytes used by this app" value="0 B" note="Read-only scopes. Nothing is ever uploaded to Drive." />
        <Stat icon={<Database className="h-5 w-5 text-cyan-300" />} label="Cached in this device's vault" value={formatBytes(cachedBytes)} note={`${cached.length} items stored in IndexedDB`} />
        <div className="flex flex-col justify-between gap-2">
          <p className="text-xs text-slate-400">{index.syncedAt ? `Last synced ${new Date(index.syncedAt).toLocaleString("en-GB")}` : "Not synced yet"}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="gold" onClick={() => void connect()} disabled={busy || !GOOGLE_CLIENT_ID}>
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Sync with Google
            </Button>
            <Button variant="ghost" onClick={() => void useSample()} disabled={busy}>Load sample classroom</Button>
          </div>
          {!GOOGLE_CLIENT_ID && <p className="text-xs text-amber-200">Live sync needs an OAuth client ID: add <code className="mono">VITE_GOOGLE_CLIENT_ID</code> to a <code className="mono">.env</code> file and rebuild.</p>}
        </div>
      </Glass>

      {error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Courses">
        {index.courses.map((c) => (
          <button key={c.id} role="tab" aria-selected={courseId === c.id} onClick={() => setCourseId(c.id)}
            className={cx("min-h-11 rounded-xl px-4 text-sm font-bold", courseId === c.id ? "bg-cyan-400 text-slate-950" : "glass text-slate-300")}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <ul className="space-y-3">
          {items.map((i) => {
            const isCached = cached.includes(i.id);
            return (
              <li key={i.id}>
                <Glass className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <button onClick={() => void open(i)} className="min-h-11 min-w-0 flex-1 text-left">
                    <div className="mb-1 flex flex-wrap gap-2">
                      <Pill tone={i.kind === "assignment" ? "amber" : i.kind === "material" ? "cyan" : "slate"}>{i.kind}</Pill>
                      {i.due && <Pill tone="red">Due {i.due}</Pill>}
                    </div>
                    <p className="truncate font-bold text-white">{i.title}</p>
                    <p className="mono text-xs text-slate-500">{i.sizeKB} KB</p>
                  </button>
                  {isCached ? (
                    <Button variant="ghost" onClick={() => void evict(i.id)} aria-label={`Remove ${i.title} from vault`}><CloudOff className="h-4 w-4" /><Trash2 className="h-4 w-4" /></Button>
                  ) : (
                    <Button variant="teal" onClick={() => void cacheItem(i)} aria-label={`Cache ${i.title}`}><Cloud className="h-4 w-4" /> Cache</Button>
                  )}
                </Glass>
              </li>
            );
          })}
          {items.length === 0 && <p className="text-slate-400">No items in this course.</p>}
        </ul>

        <Glass className="h-fit p-4" as="aside">
          <h2 className="mb-2 text-lg font-bold text-white">Reader</h2>
          {openId ? (
            <>
              <p className="font-bold text-amber-300">{index.items.find((x) => x.id === openId)?.title}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{openBody || "No text content."}</p>
              <p className="mt-3 text-xs text-slate-500">{cached.includes(openId) ? "Served from the local vault, so it works offline." : "Not cached yet."}</p>
            </>
          ) : <p className="text-sm text-slate-500">Select an item to read it.</p>}
        </Glass>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-slate-400">{icon}{label}</div>
      <p className="mono mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500">{note}</p>
    </div>
  );
}
