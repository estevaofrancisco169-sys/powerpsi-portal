import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { percentual, statusPorPercentual } from "@/lib/progresso";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ListVideo, Search, X } from "lucide-react";

/** Atalho lateral com todas as aulas e o progresso de cada uma. */
export function AulasSidebar({ aulaAtualId }: { aulaAtualId: string }) {
  const { user } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");

  const { data } = useQuery({
    queryKey: ["sidebar-aulas", user?.id],
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
      return { cats: cats ?? [], videos: videos ?? [], views: views ?? [] };
    },
    enabled: !!user && aberto,
  });

  const progressoDe = (v: { id: string; duracao_seg?: number | null; duracao_min: number | null }) => {
    const view = data?.views.find((x) => x.video_id === v.id);
    const totalSeg = v.duracao_seg ?? (v.duracao_min ? v.duracao_min * 60 : null);
    const assistido = view ? Math.max(view.max_progresso_seg ?? 0, view.progresso_seg ?? 0) : 0;
    const pct = view?.concluido ? 100 : percentual(assistido, totalSeg);
    return { pct, status: statusPorPercentual(pct) };
  };

  const termo = busca.trim().toLowerCase();
  const filtrados = (data?.videos ?? []).filter(
    (v) => !termo || v.titulo.toLowerCase().includes(termo) || (v.tema ?? "").toLowerCase().includes(termo),
  );
  const grupos = [
    ...(data?.cats ?? []).map((c) => ({
      id: c.id,
      nome: c.nome,
      itens: filtrados.filter((v) => v.categoria_id === c.id),
    })),
    { id: "none", nome: "Outros conteúdos", itens: filtrados.filter((v) => !v.categoria_id) },
  ].filter((g) => g.itens.length > 0);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAberto(true)} className="gap-2">
        <ListVideo className="size-4" /> Todas as aulas
      </Button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setAberto(false)}
            aria-hidden
          />
          <aside className="relative flex h-full w-[min(22rem,88vw)] flex-col border-r border-border bg-panel shadow-elevated">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4">
              <h2 className="font-display text-sm font-semibold">Todas as aulas</h2>
              <Button variant="ghost" size="icon" onClick={() => setAberto(false)} aria-label="Fechar lista de aulas">
                <X className="size-4" />
              </Button>
            </div>

            <div className="relative px-4 py-3">
              <Search className="absolute left-7 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar aula..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {!data && <p className="text-sm text-muted-foreground">Carregando aulas...</p>}
              {data && grupos.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma aula encontrada.</p>}
              {grupos.map((g) => (
                <section key={g.id} className="mt-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-primary">{g.nome}</p>
                  <ul className="mt-2 space-y-2">
                    {g.itens.map((v) => {
                      const { pct, status } = progressoDe(v);
                      const atual = v.id === aulaAtualId;
                      return (
                        <li key={v.id}>
                          <Link
                            to="/portal/aula/$id"
                            params={{ id: v.id }}
                            onClick={() => setAberto(false)}
                            className={`block rounded-lg border p-3 transition-colors ${
                              atual
                                ? "border-primary/70 bg-primary/10"
                                : "border-border/70 bg-background/40 hover:border-primary/50"
                            }`}
                          >
                            <p className="text-sm font-medium leading-snug">{v.titulo}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <StatusChip status={status} pct={pct} />
                              {atual && <span className="text-[10px] uppercase text-primary">assistindo</span>}
                            </div>
                            <Progress value={pct} className="mt-2 h-1" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
