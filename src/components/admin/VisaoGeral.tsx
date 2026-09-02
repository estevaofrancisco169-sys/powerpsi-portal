import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/portal";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, PlayCircle, Users, Eye } from "lucide-react";

export function VisaoGeral() {
  const { data } = useQuery({
    queryKey: ["admin-geral"],
    queryFn: async () => {
      const [{ data: videos }, { data: views }, { data: profiles }, { data: companies }, { data: logs }] =
        await Promise.all([
          supabase.from("videos").select("id,titulo"),
          supabase.from("video_views").select("video_id,concluido,ultima_vez"),
          supabase.from("profiles").select("id,nome,empresa,created_at"),
          supabase.from("companies").select("id"),
          supabase.from("access_logs").select("id,ocorrido_em,user_id").order("ocorrido_em", { ascending: false }).limit(6),
        ]);
      return {
        videos: videos ?? [],
        views: views ?? [],
        profiles: profiles ?? [],
        companies: companies ?? [],
        logs: logs ?? [],
      };
    },
  });

  const chart = (data?.videos ?? [])
    .map((v) => ({
      nome: v.titulo.length > 18 ? v.titulo.slice(0, 18) + "…" : v.titulo,
      visualizacoes: (data?.views ?? []).filter((x) => x.video_id === v.id).length,
    }))
    .sort((a, b) => b.visualizacoes - a.visualizacoes)
    .slice(0, 8);

  const cards = [
    { label: "Aulas publicadas", valor: data?.videos.length ?? 0, icon: PlayCircle },
    { label: "Usuários cadastrados", valor: data?.profiles.length ?? 0, icon: Users },
    { label: "Clientes (CNPJ)", valor: data?.companies.length ?? 0, icon: Building2 },
    { label: "Visualizações", valor: data?.views.length ?? 0, icon: Eye },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, valor, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-panel p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="size-4 text-primary" />
              <span className="text-xs uppercase tracking-wide">{label}</span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold">{valor}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold">Aulas mais assistidas</h2>
          <div className="mt-6 h-72">
            {chart.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval={0} angle={-15} height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Bar dataKey="visualizacoes" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold">Últimos acessos</h2>
          <ul className="mt-4 space-y-3">
            {(data?.logs ?? []).map((l) => {
              const p = data?.profiles.find((x) => x.id === l.user_id);
              return (
                <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{p?.nome ?? "Administrador"}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(l.ocorrido_em)}</span>
                </li>
              );
            })}
            {(data?.logs ?? []).length === 0 && <li className="text-sm text-muted-foreground">Nenhum acesso ainda.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
