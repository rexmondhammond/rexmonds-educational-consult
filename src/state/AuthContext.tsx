import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { backendEnabled, supabase } from "../lib/supabase";
import type { Level, Role } from "../types";

export interface Profile {
  id: string;
  role: Role;
  name: string;
  level: Level;
}

type Mode = "loading" | "signed-out" | "cloud" | "demo";

interface AuthState {
  mode: Mode;
  session: Session | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (input: { email: string; password: string; name: string; role: Role; level: Level }) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
  leaveDemo: () => void;
  reloadProfile: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

const DEMO_KEY = "rex.demo.v1";
const readDemo = (): boolean => {
  try { return window.localStorage.getItem(DEMO_KEY) === "1"; } catch { return false; }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(!backendEnabled);
  const [demo, setDemo] = useState<boolean>(() => readDemo() || !backendEnabled);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from("profiles").select("id, role, name, level").eq("id", userId).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    if (!backendEnabled) return;
    let alive = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      if (alive) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) window.setTimeout(() => void loadProfile(next.user.id), 0);
      else setProfile(null);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? error.message : null;
  }, []);

  const signUp = useCallback<AuthState["signUp"]>(async ({ email, password, name, role, level }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim(), role, level }, emailRedirectTo: window.location.origin },
    });
    if (error) return { error: error.message, needsConfirm: false };
    return { error: null, needsConfirm: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const enterDemo = useCallback(() => {
    try { window.localStorage.setItem(DEMO_KEY, "1"); } catch { /* storage unavailable */ }
    setDemo(true);
  }, []);
  const leaveDemo = useCallback(() => {
    try { window.localStorage.removeItem(DEMO_KEY); } catch { /* storage unavailable */ }
    setDemo(false);
  }, []);

  const reloadProfile = useCallback(async () => { if (session) await loadProfile(session.user.id); }, [session, loadProfile]);

  const mode: Mode = !ready ? "loading" : session && profile ? "cloud" : demo ? "demo" : "signed-out";

  const value = useMemo<AuthState>(
    () => ({ mode, session, profile, signIn, signUp, signOut, enterDemo, leaveDemo, reloadProfile }),
    [mode, session, profile, signIn, signUp, signOut, enterDemo, leaveDemo, reloadProfile],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
