import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fonteVideo, type FonteVideo } from "@/lib/video-url";
import { signedUrl } from "@/lib/portal";

import { percentual, statusPorPercentual, tempo } from "@/lib/progresso";
import { StatusChip } from "@/components/StatusChip";
import { AulasSidebar } from "@/components/AulasSidebar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, Info, SkipBack, SkipForward, Sparkles } from "lucide-react";

export const Route = createFileRoute("/portal/aula/$id")({
  head: () => ({
    meta: [
      { title: "Assistir aula — PowerPsi Portal" },
      { name: "description", content: "Player da videoaula com tema, descrição, habilidades e progresso automático." },
      { property: "og:title", content: "Assistir aula — PowerPsi Portal" },
      { property: "og:description", content: "Videoaula do portal de estudos PowerPsi." },
    ],
  }),
  component: Aula,
});

function Aula() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const maxRef = useRef(0);
  const [assistido, setAssistido] = useState(0);
  // Controla se o vídeo está tocando: o progresso só avança durante a reprodução.
  const tocandoRef = useRef(true);

  const { data, isLoading } = useQuery({
    queryKey: ["aula", id],
    queryFn: async () => {
      const { data: aula } = await supabase
        .from("videos")
        .select("*, categories(nome)")
        .eq("id", id)
        .maybeSingle();
      const { data: view } = await supabase
        .from("video_views")
        .select("*")
        .eq("video_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return { aula, view };
    },
    enabled: !!user,
    // Não refaz a busca ao voltar à aba: evita recarregar o <video> do zero.
    refetchOnWindowFocus: false,
    // Sempre busca a versão atual da aula ao abrir a página: se o admin trocou
    // o vídeo, o aluno vê a troca já no primeiro acesso.
    staleTime: 0,
  });

  const totalSeg = data?.aula?.duracao_seg ?? (data?.aula?.duracao_min ? data.aula.duracao_min * 60 : null);

  useEffect(() => {
    const inicial = data?.view ? Math.max(data.view.max_progresso_seg ?? 0, data.view.progresso_seg ?? 0) : 0;
    maxRef.current = inicial;
    setAssistido(inicial);
  }, [data?.view?.video_id, data?.view?.max_progresso_seg, data?.view?.progresso_seg]);

  const salvar = async (segundos: number) => {
    if (!user) return;
    const seg = Math.floor(Math.max(0, segundos));
    maxRef.current = Math.max(maxRef.current, seg);
    setAssistido(maxRef.current);
    const concluido = !!totalSeg && maxRef.current >= totalSeg - 2;
    await supabase.from("video_views").upsert(
      {
        user_id: user.id,
        video_id: id,
        progresso_seg: seg,
        max_progresso_seg: maxRef.current,
        ultima_vez: new Date().toISOString(),
        concluido,
      },
      { onConflict: "user_id,video_id" },
    );
  };

  // Arquivo hospedado no portal: gera um link temporário e assinado.
  const videoPath = data?.aula?.video_path ?? null;
  const { data: arquivoUrl } = useQuery({
    queryKey: ["aula-arquivo", id, videoPath],
    queryFn: () => signedUrl("aulas", videoPath, 60 * 60 * 4),
    enabled: !!videoPath,
    // Um novo link assinado ao voltar à aba faria o <video> recarregar do zero.
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000,
  });

  const fonte: FonteVideo = videoPath
    ? arquivoUrl
      ? { tipo: "arquivo", src: arquivoUrl, provedor: "arquivo" }
      : null
    : fonteVideo(data?.aula?.video_url ?? null);


  // Vídeos por link/código de incorporação: conversamos com o player dentro do
  // iframe (YouTube, Vimeo, Panda e players que emitem eventos por postMessage)
  // para pausar e retomar a contagem de progresso junto com o vídeo.
  useEffect(() => {
    if (fonte?.tipo !== "embed") return;
    const janela = () => iframeRef.current?.contentWindow ?? null;

    const apresentar = () => {
      const alvo = janela();
      if (!alvo) return;
      try {
        // YouTube: pedido de eventos do player.
        alvo.postMessage(JSON.stringify({ event: "listening", id: 1 }), "*");
        // Vimeo: assinatura dos eventos de play/pause.
        alvo.postMessage(JSON.stringify({ method: "addEventListener", value: "play" }), "*");
        alvo.postMessage(JSON.stringify({ method: "addEventListener", value: "pause" }), "*");
        alvo.postMessage(JSON.stringify({ method: "addEventListener", value: "ended" }), "*");
      } catch {
        /* players que não aceitam postMessage seguem na contagem por tempo de página */
      }
    };

    // Só confiamos no "pausado" do player depois de receber um "tocando" dele.
    // Assim, players que não conversam com a página nunca travam o progresso.
    let confirmouPlay = false;

    const aoReceber = (e: MessageEvent) => {
      if (e.source !== janela()) return;
      
      const rawData = e.data;
      let texto = "";
      if (typeof rawData === "string") texto = rawData;
      else if (rawData && typeof rawData === "object") {
        try { texto = JSON.stringify(rawData); } catch { return; }
      }
      if (!texto) return;
      const t = texto.toLowerCase();

      const tocando = () => {
        confirmouPlay = true;
        tocandoRef.current = true;
      };
      const pausado = () => {
        if (confirmouPlay) tocandoRef.current = false;
      };

      // 1. YouTube playerstate (numérico)
      const estado = t.match(/"playerstate"\s*:\s*(-?\d)/)?.[1];
      if (estado) {
        if (estado === "1" || estado === "3") tocando();
        else if (estado === "2" || estado === "0") pausado();
        return;
      }

      // 2. Extração do nome do evento/mensagem
      const evento = t.match(/"(?:event|method|message|type|name)"\s*:\s*"([^"]*)"/)?.[1];
      if (!evento) return;

      // 3. Panda Video (eventos específicos - prioritários)
      if (evento.startsWith("panda_")) {
        if (evento === "panda_play") tocando();
        else if (evento === "panda_pause" || evento === "panda_ended") pausado();
        return;
      }

      // 4. Fallback genérico (Vimeo, Loom e outros)
      // Usamos regex com delimitadores para evitar falsos positivos como "onSetupComplete"
      const isPlay = /(^|_|on)play($|ed|ing)/.test(evento) && !/playlist|playback/.test(evento);
      const isPause = /(^|_|on)(pause|ended|finish|complete|stop)($|ed)/.test(evento);

      if (isPlay) tocando();
      else if (isPause) pausado();
    };

    tocandoRef.current = true;
    window.addEventListener("message", aoReceber);
    apresentar();
    const handshake = window.setInterval(apresentar, 2000);
    return () => {
      window.removeEventListener("message", aoReceber);
      window.clearInterval(handshake);
    };
  }, [fonte?.tipo, fonte?.src]);



  // Todos os vídeos (link incorporado ou arquivo enviado pelo computador) usam o
  // mesmo sistema: a minutagem assistida é contabilizada pelo tempo de permanência na aula.
  useEffect(() => {
    if (!data?.aula || !fonte) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      // Vídeo pausado: o progresso pausa junto (sem zerar) e retoma ao dar play.
      if (!tocandoRef.current) return;
      void salvar(maxRef.current + 15);
    }, 15000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.aula?.id, fonte?.tipo, totalSeg, user?.id]);

  // Sequência de aulas publicadas (mesma ordem da página do aluno) para o autoplay.
  const { data: sequencia } = useQuery({
    queryKey: ["sequencia-aulas"],
    queryFn: async () =>
      (
        await supabase
          .from("videos")
          .select("id, titulo")
          .eq("publicado", true)
          .order("ordem", { ascending: true })
          .order("created_at", { ascending: true })
      ).data ?? [],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

const indiceAtual = (sequencia ?? []).findIndex((v) => v.id === id);
const anterior = indiceAtual > 0 ? (sequencia ?? [])[indiceAtual - 1] : undefined;
const proxima = indiceAtual >= 0 ? (sequencia ?? [])[indiceAtual + 1] : undefined;



  if (isLoading) return <p className="mx-auto max-w-6xl px-6 py-12 text-sm text-muted-foreground">Carregando aula...</p>;
  if (!data?.aula)
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-muted-foreground">Aula não encontrada.</p>
        <Button asChild className="mt-4">
          <Link to="/portal">Voltar ao catálogo</Link>
        </Button>
      </div>
    );

  const aula = data.aula;
  const pct = percentual(assistido, totalSeg);
  const status = statusPorPercentual(pct);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/portal" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Voltar ao catálogo
          </Link>
          {anterior && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/portal/aula/$id" params={{ id: anterior.id }} className="gap-2">
                <SkipBack className="size-4" /> Aula anterior
              </Link>
            </Button>
          )}
          {proxima && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/portal/aula/$id" params={{ id: proxima.id }} className="gap-2">
                <SkipForward className="size-4" /> Aula posterior
              </Link>
            </Button>
          )}
        </div>
        <AulasSidebar aulaAtualId={id} />
      </div>


      <div className="mt-6 grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-xl border border-border bg-black">
            {fonte?.tipo === "arquivo" ? (
              // Mesmo tratamento do vídeo por link: player travado dentro do portal,
              // sem download, sem picture-in-picture e sem menu de contexto.
              <div className="relative aspect-video w-full">
                <video
                  ref={videoRef}
                  src={fonte.src}
                  controls
                  controlsList="nodownload noplaybackrate noremoteplayback"
                  disablePictureInPicture
                  disableRemotePlayback
                  playsInline
                  onPlay={() => { tocandoRef.current = true; }}
                  onPause={() => { tocandoRef.current = false; }}
                  onEnded={() => { tocandoRef.current = false; }}
                  onContextMenu={(e) => e.preventDefault()}
                  className="absolute inset-0 size-full bg-black"
                />
                {/* Camadas que impedem o aluno de sair do portal pelo player. */}
                <div className="absolute inset-x-0 top-0 h-14" onContextMenu={(e) => e.preventDefault()} />
                <div className="absolute bottom-0 right-0 h-12 w-28" onContextMenu={(e) => e.preventDefault()} />
              </div>
            ) : fonte ? (

              <div className="relative aspect-video w-full">
                <iframe
                  ref={iframeRef}
                  src={fonte.src}
                  title={aula.titulo}
                  className="absolute inset-0 size-full"
                  referrerPolicy="no-referrer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
                {/* Camada que impede o aluno de sair do portal pelo título/logo do provedor.
                    O canto inferior direito fica livre para o botão de tela cheia funcionar. */}
                <div className="absolute inset-x-0 top-0 h-14" onContextMenu={(e) => e.preventDefault()} />

              </div>
            ) : (

              <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">
                Vídeo ainda não disponível para esta aula.
              </div>
            )}
          </div>

          <div className="mt-6">
            {aula.tema && <p className="text-xs uppercase tracking-[0.2em] text-primary">{aula.tema}</p>}
            <h1 className="mt-2 text-2xl font-bold">{aula.titulo}</h1>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{aula.descricao}</p>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-border bg-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-sm font-semibold">Seu progresso</h2>
              <StatusChip status={status} pct={pct} />
            </div>
            <Progress value={pct} className="mt-4" />
            <p className="mt-3 text-xs text-muted-foreground">
              {tempo(assistido)} assistidos{totalSeg ? ` de ${tempo(totalSeg)}` : ""}.
            </p>
            <p className="mt-3 flex gap-2 rounded-lg border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              A aula só é considerada concluída quando você assiste 100% do vídeo. O tempo assistido é registrado
              automaticamente — não é preciso marcar nada.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-panel p-5">
            <h2 className="font-display text-sm font-semibold">Ficha da aula</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Área</dt>
                <dd className="text-right">{aula.categories?.nome ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Duração</dt>
                <dd>{totalSeg ? tempo(totalSeg) : "—"}</dd>
              </div>
            </dl>
          </div>

          {aula.habilidades?.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
                <Sparkles className="size-4 text-primary" /> Habilidades desenvolvidas
              </h2>
              <ul className="mt-4 space-y-2">
                {aula.habilidades.map((h: string) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Badge variant="outline" className="w-full justify-center py-2 text-xs">
            Seu acesso é registrado para acompanhamento pedagógico
          </Badge>
        </aside>
      </div>
    </main>
  );
}
