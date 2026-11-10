import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { usePersistentState } from "./storage";
import type { Deck, Slide } from "./deck";
import type { Level } from "../types";
import { useAuth } from "../state/AuthContext";
import { useClass } from "../state/ClassContext";

interface DeckRow { id: string; topic: string; subject: string; level: Level; slides: Slide[]; created_at: string }
const fromRow = (r: DeckRow): Deck => ({ id: r.id, topic: r.topic, subject: r.subject, level: r.level, slides: r.slides ?? [], createdAt: Date.parse(r.created_at), source: "ai" });

/** Saved slide decks: Supabase for signed-in teachers, localStorage in the demo. */
export function useDecks() {
  const { mode, session } = useAuth();
  const { activeClass } = useClass();
  const cloud = mode === "cloud";
  const [local, setLocal] = usePersistentState<{ items: Deck[] }>("rex.decks.v1", { items: [] });
  const [remote, setRemote] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(false);
  const classId = activeClass?.id ?? null;
  const userId = session?.user.id ?? "";

  const refresh = useCallback(async () => {
    if (!cloud || !userId) return;
    setLoading(true);
    const { data } = await supabase.from("decks").select("id, topic, subject, level, slides, created_at").order("created_at", { ascending: false }).limit(60);
    setRemote(((data ?? []) as DeckRow[]).map(fromRow));
    setLoading(false);
  }, [cloud, userId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const save = useCallback(async (deck: Deck): Promise<string | null> => {
    if (!cloud) {
      setLocal((p) => ({ items: [deck, ...p.items.filter((d) => d.id !== deck.id)].slice(0, 30) }));
      return null;
    }
    const { error } = await supabase.from("decks").upsert({ id: deck.id, owner_id: userId, class_id: classId, topic: deck.topic, subject: deck.subject, level: deck.level, slides: deck.slides });
    if (!error) await refresh();
    return error?.message ?? null;
  }, [cloud, userId, classId, refresh, setLocal]);

  const remove = useCallback(async (id: string) => {
    if (!cloud) { setLocal((p) => ({ items: p.items.filter((d) => d.id !== id) })); return; }
    await supabase.from("decks").delete().eq("id", id);
    await refresh();
  }, [cloud, refresh, setLocal]);

  return { decks: cloud ? remote : local.items, loading, save, remove };
}
