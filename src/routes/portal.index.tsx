import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { signedUrlMap } from "@/lib/portal";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { StatusChip } from "@/components/StatusChip";
import { percentual, statusPorPercentual } from "@/lib/progresso";
import { CheckCircle2, Clock, PlayCircle, Search } from "lucide-react";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [
      { title: "Minhas aulas — PowerPsi Portal" },
      { name: "description", content: "Catálogo de videoaulas por área de estudo no portal PowerPsi." },
      { property: "og:title", content: "Minhas aulas — PowerPsi Portal" },
      { property: "og:description", content: "Trilhas de estudo em atendimento clínico para psicólogos parceiros." },
    ],
  }),
  component: Catalogo,
});

function Catalogo() {
  const { user, profile } = useAuth();
  const [busca, setBusca] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["catalogo", user?.id],
    queryFn: async () => {
      const [{ data: cats }, { data: videos }, { data: views }] = await Promise.all([
        supabase.from("categories").select("*").order("ordem"),
        supabase
          .from("videos")
          .select("*")
          .eq("publicado", true)
          .order("ordem", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase.from("video_views").select("*").eq("user_id", user!.id),
      ]);
      const capas = await signedUrlMap("capas", (videos ?? []).map((v) => v.capa_path));
      return { cats: cats ?? [], videos: videos ?? [], views: views ?? [], capas };
    },
    enabled: !!user,
  });

  const progressoDe = (v: { id: string; duracao_seg?: number | null; duracao_min: number | null }) => {
    const view = data?.views.find((x) => x.video_id === v.id);
    const totalSeg = v.duracao_seg ?? (v.duracao_min ? v.duracao_min * 60 : null);
    const assistido = view ? Math.max(view.max_progresso_seg ?? 0, view.progresso_seg ?? 0) : 0;
    const pct = view?.concluido ? 100 : percentual(assistido, totalSeg);
    return { view, pct, status: statusPorPercentual(pct) };
  };

  const assistidas = data?.views.length ?? 0;
  const concluidas = data?.views.filter((v) => v.concluido).length ?? 0;
  const total = data?.videos.length ?? 0;
  const mediaGeral = total
    ? Math.round((data?.videos ?? []).reduce((s, v) => s + progressoDe(v).pct, 0) / total)
    : 0;

  const grupos = useMemo(() => {
    if (!data) return [];
    const termo = busca.trim().toLowerCase();
    const filtro = (v: (typeof data.videos)[number]) =>
      !termo ||
      v.titulo.toLowerCase().includes(termo) ||
      (v.tema ?? "").toLowerCase().includes(termo) ||
      (v.descricao ?? "").toLowerCase().includes(termo);
    const grupos = data.cats.map((c) => ({
      cat: c,
      itens: data.videos.filter((v) => v.categoria_id === c.id && filtro(v)),
    }));
    const semCat = data.videos.filter((v) => !v.categoria_id && filtro(v));
    if (semCat.length)
      grupos.push({
        cat: { id: "none", nome: "Outros conteúdos", descricao: null, ordem: 99, created_at: "" },
        itens: semCat,
      });
    return grupos;
  }, [data, busca]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <section className="rounded-2xl border border-border bg-panel p-8 shadow-elevated">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Bem-vindo(a)</p>
        <h1 className="mt-2 text-3xl font-bold">{profile?.nome?.split(" ")[0] ?? "Aluno"}, continue seus estudos</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Aulas disponíveis", valor: total, icon: PlayCircle },
            { label: "Aulas iniciadas", valor: assistidas, icon: Clock },
            { label: "Aulas concluídas", valor: concluidas, icon: CheckCircle2 },
          ].map(({ label, valor, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-border/70 bg-background/40 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4 text-primary" />
                <span className="text-xs uppercase tracking-wide">{label}</span>
              </div>
              <p className="mt-2 font-display text-3xl font-bold">{valor}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Progress value={mediaGeral} />
          <p className="mt-2 text-xs text-muted-foreground">
            {mediaGeral}% da grade assistida — uma aula só conta como concluída quando você assiste 100% do vídeo.
          </p>
        </div>
      </section>

      <div className="relative mt-10 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar aula ou tema..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {isLoading && <p className="mt-10 text-sm text-muted-foreground">Carregando conteúdos...</p>}

      {!isLoading &&
        grupos.map(({ cat, itens }) => (
          <section key={cat.id} className="mt-12">
            <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-xl font-bold">{cat.nome}</h2>
                {cat.descricao && <p className="mt-1 text-sm text-muted-foreground">{cat.descricao}</p>}
              </div>
              <span className="text-xs text-muted-foreground">{itens.length} aula(s)</span>
            </div>
            {itens.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nenhuma aula publicada nesta área ainda.</p>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {itens.map((v) => {
                  const { view, pct, status } = progressoDe(v);
                  const capa = v.capa_path ? data?.capas[v.capa_path] : null;
                  return (
                    <Link
                      key={v.id}
                      to="/portal/aula/$id"
                      params={{ id: v.id }}
                      className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-elevated"
                    >
                      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-panel">
                        {capa ? (
                          <img src={capa} alt={`Capa da aula ${v.titulo}`} className="size-full object-cover" loading="lazy" />
                        ) : (
                          <PlayCircle className="size-10 text-primary/70" />
                        )}
                        <span className="absolute right-2 top-2">
                          <StatusChip status={status} pct={pct} />
                        </span>
                      </div>
                      <div className="p-4">
                        {v.tema && <p className="text-[11px] uppercase tracking-wide text-primary">{v.tema}</p>}
                        <h3 className="mt-1 font-display text-sm font-semibold leading-snug">{v.titulo}</h3>
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{v.descricao}</p>
                        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                          {v.duracao_min ? <span>{v.duracao_min} min</span> : null}
                          {view ? <span>Retomar</span> : <span>Novo</span>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ))}
    </main>
  );
}
