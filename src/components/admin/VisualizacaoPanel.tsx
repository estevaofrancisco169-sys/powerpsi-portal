import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/portal";
import { STATUS_INFO, STATUS_ORDEM, percentual, statusPorPercentual, tempo } from "@/lib/progresso";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

export function VisualizacaoPanel() {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-visualizacao"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }, { data: videos }, { data: views }] = await Promise.all([
        supabase.from("profiles").select("*").order("nome"),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("videos").select("id,titulo,duracao_seg,duracao_min,publicado").order("titulo"),
        supabase.from("video_views").select("*"),
      ]);
      return { profiles: profiles ?? [], roles: roles ?? [], videos: videos ?? [], views: views ?? [] };
    },
  });

  const alunos = useMemo(() => {
    if (!data) return [];
    const adminIds = new Set(data.roles.filter((r) => r.role === "admin").map((r) => r.user_id));
    const videos = data.videos.filter((v) => v.publicado);

    return data.profiles
      .filter((p) => !adminIds.has(p.id))
      .map((p) => {
        const detalhes = videos.map((v) => {
          const view = data.views.find((x) => x.user_id === p.id && x.video_id === v.id);
          const totalSeg = v.duracao_seg ?? (v.duracao_min ? v.duracao_min * 60 : null);
          const assistido = view ? Math.max(view.max_progresso_seg, view.progresso_seg) : 0;
          const pct = view?.concluido ? 100 : percentual(assistido, totalSeg);
          return {
            id: v.id,
            titulo: v.titulo,
            totalSeg,
            assistido: Math.min(assistido, totalSeg ?? assistido),
            pct,
            status: statusPorPercentual(pct),
            ultima: view?.ultima_vez ?? null,
          };
        });
        const media = detalhes.length
          ? Math.round(detalhes.reduce((s, d) => s + d.pct, 0) / detalhes.length)
          : 0;
        return { perfil: p, detalhes, media };
      })
      .sort((a, b) => b.media - a.media);
  }, [data]);

  const termo = busca.trim().toLowerCase();
  const lista = alunos.filter((a) =>
    !termo
      ? true
      : [a.perfil.nome, a.perfil.email, a.perfil.empresa ?? "", a.perfil.documento ?? ""].some((s) =>
          s.toLowerCase().includes(termo),
        ),
  );

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-panel p-5">
        <h2 className="font-display text-sm font-semibold">Progresso por aluno</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Resumo do progresso de cada aluno: a porcentagem é a média das aulas assistidas sobre o total de 100%.
          Use “mais detalhes” para ver, aula por aula, a minutagem assistida, a porcentagem e o status de cada vídeo.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Filtrar aluno por nome, e-mail, empresa ou documento"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando progresso...</p>}

      <div className="space-y-3">
        {lista.map(({ perfil, detalhes, media }) => {
          const contagem = STATUS_ORDEM.map((chave) => ({
            info: STATUS_INFO[chave],
            total: detalhes.filter((d) => d.status.chave === chave).length,
          }));
          const expandido = aberto === perfil.id;
          return (
            <div key={perfil.id} className="rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-56">
                  <p className="font-medium">{perfil.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {perfil.email} · {perfil.empresa ?? perfil.documento ?? "sem empresa"}
                  </p>
                </div>
                <div className="w-full max-w-xs">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progresso geral</span>
                    <span className="font-semibold text-foreground">{media}%</span>
                  </div>
                  <Progress value={media} className="mt-2" />
                </div>
                <Button variant="outline" size="sm" onClick={() => setAberto(expandido ? null : perfil.id)}>
                  {expandido ? <ChevronUp /> : <ChevronDown />} {expandido ? "Ocultar" : "Mais detalhes"}
                </Button>
              </div>

              {expandido && (
                <div className="border-t border-border/60 p-5">
                  <div className="flex flex-wrap gap-2">
                    {contagem.map(({ info, total }) => (
                      <span key={info.chave} className={`status-chip ${info.classe}`}>
                        {info.rotulo}: {total}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 overflow-hidden rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Aula</TableHead>
                          <TableHead>Duração</TableHead>
                          <TableHead>Assistido</TableHead>
                          <TableHead>%</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Última atividade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detalhes.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium">{d.titulo}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {d.totalSeg ? tempo(d.totalSeg) : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{tempo(d.assistido)}</TableCell>
                            <TableCell>{d.pct}%</TableCell>
                            <TableCell>
                              <StatusChip status={d.status} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {d.ultima ? formatDate(d.ultima) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {detalhes.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                              Nenhuma aula publicada no sistema.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!isLoading && lista.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Nenhum aluno encontrado.
          </p>
        )}
      </div>
    </div>
  );
}
