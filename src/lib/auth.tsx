import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Role = "admin" | "aluno" | null;

export type Profile = {
  id: string;
  nome: string;
  email: string;
  cnpj: string | null;
  empresa: string | null;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);
const SESSION_KEY = "powerpsi_session_id";

/** Registra a sessão exclusiva do usuário (impede acessos simultâneos) e o log de acesso. */
export async function iniciarSessaoExclusiva(userId: string) {
  const sessionId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random();
  localStorage.setItem(SESSION_KEY, sessionId);
  await supabase
    .from("active_sessions")
    .upsert(
      { user_id: userId, session_id: sessionId, iniciada_em: new Date().toISOString(), ultimo_ping: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  await supabase.from("access_logs").insert({ user_id: userId, user_agent: navigator.userAgent });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setProfile(null);
        setRole(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id,nome,email,cnpj,empresa").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (!alive) return;
      setProfile((p as Profile) ?? null);
      const roles = (r ?? []).map((x) => x.role as string);
      setRole(roles.includes("admin") ? "admin" : roles.includes("aluno") ? "aluno" : null);
    })();
    return () => {
      alive = false;
    };
  }, [userId, tick]);

  const signOut = useCallback(async () => {
    const id = session?.user.id;
    if (id) await supabase.from("active_sessions").delete().eq("user_id", id);
    localStorage.removeItem(SESSION_KEY);
    await supabase.auth.signOut();
  }, [session]);

  // Verificação periódica de sessão única
  useEffect(() => {
    if (!userId) return;
    const check = async () => {
      const local = localStorage.getItem(SESSION_KEY);
      const { data } = await supabase
        .from("active_sessions")
        .select("session_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (data && local && data.session_id !== local) {
        toast.error("Sessão encerrada: este login foi aberto em outro dispositivo.");
        localStorage.removeItem(SESSION_KEY);
        await supabase.auth.signOut();
      } else if (data && local) {
        await supabase.from("active_sessions").update({ ultimo_ping: new Date().toISOString() }).eq("user_id", userId);
      }
    };
    const t = setInterval(check, 20000);
    return () => clearInterval(t);
  }, [userId]);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        role,
        loading,
        signOut,
        refresh: () => setTick((t) => t + 1),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
