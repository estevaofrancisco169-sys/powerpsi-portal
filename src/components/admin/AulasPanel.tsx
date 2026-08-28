import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { extrairSrcDeEmbed } from "@/lib/video-url";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Link2, Loader2, Pencil, Trash2, X } from "lucide-react";

type Video = {
  id: string;
  titulo: string;
  tema: string | null;
  descricao: string | null;
  habilidades: string[];
  duracao_min: number | null;
  categoria_id: string | null;
  publicado: boolean;
  video_url: string | null;
  video_path: string | null;
  capa_path: string | null;
  ordem: number;
  created_at: string;
};

const vazio = {
  id: undefined as string | undefined,
  titulo: "",
  tema: "",
  descricao: "",
  habilidades: "",
  duracao_min: "",
  video_url: "",
  categoria_id: "",
  publicado: true,
  fonte: "link" as "link" | "arquivo" | "embed",
  embed_code: "",
  video_path: "" as string,
};

export function AulasPanel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState(vazio);
  const [capaFile, setCapaFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const { data: cats } = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => (await supabase.from("categories").select("*").order("ordem")).data ?? [],
  });
  const { data: videos } = useQuery({
    queryKey: ["admin-videos"],
    queryFn: async () =>
      ((
        await supabase
          .from("videos")
          .select("*")
          .order("ordem", { ascending: true })
          .order("created_at", { ascending: true })
      ).data ?? []) as Video[],
  });

  const upload = async (bucket: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${user?.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw new Error(`Falha no upload: ${error.message}`);
    return path;
  };

  const salvar = useMutation({
    mutationFn: async () => {
      if (!form.titulo.trim()) throw new Error("Informe o título da aula");
      let link = form.video_url.trim();
      const porArquivo = form.fonte === "arquivo";
      const porEmbed = form.fonte === "embed";

      if (porArquivo) {
        if (!videoFile && !form.video_path) throw new Error("Selecione o arquivo de vídeo");
      } else if (porEmbed) {
        const codigo = form.embed_code.trim();
        if (!codigo) throw new Error("Cole o código de incorporação do vídeo");
        const src = extrairSrcDeEmbed(codigo);
        if (!src) throw new Error("Não encontrei o endereço do player nesse código de incorporação");
        link = src;
      } else {
        if (!link) throw new Error("Informe o link do vídeo");
        // Se o admin colar o código de incorporação aqui, aproveitamos o src do player.
        link = extrairSrcDeEmbed(link) ?? link;
        if (!/^https?:\/\//i.test(link)) throw new Error("O link deve começar com http:// ou https://");
      }

      setEnviando(true);
      // Envia capa e vídeo ao mesmo tempo: salva bem mais rápido.
      const [capa_path, video_path] = await Promise.all([
        capaFile ? upload("capas", capaFile) : Promise.resolve(undefined),
        porArquivo
          ? videoFile
            ? upload("aulas", videoFile)
            : Promise.resolve(form.video_path || null)
          : Promise.resolve(null),
      ]);

      const payload = {
        titulo: form.titulo.trim(),
        tema: form.tema.trim() || null,
        descricao: form.descricao.trim() || null,
        habilidades: form.habilidades
          .split("\n")
          .map((h) => h.trim())
          .filter(Boolean),
        duracao_min: form.duracao_min ? Number(form.duracao_min) : null,
        duracao_seg: form.duracao_min ? Math.round(Number(form.duracao_min) * 60) : null,
        video_url: porArquivo ? null : link,
        video_path,
        categoria_id: form.categoria_id || null,
        publicado: form.publicado,
        ...(capa_path ? { capa_path } : {}),
      };
      // Guarda o arquivo antigo para remover depois da troca (arquivo -> link,
      // arquivo -> outro arquivo). O progresso dos alunos é zerado pelo banco
      // em qualquer troca de fonte (link->arquivo, arquivo->link, link->link, arquivo->arquivo).
      let antigoVideoPath: string | null = null;
      if (form.id) {
        const { data: atual } = await supabase
          .from("videos")
          .select("video_path")
          .eq("id", form.id)
          .maybeSingle();
        antigoVideoPath = atual?.video_path ?? null;
      }

      const { error } = form.id
        ? await supabase.from("videos").update(payload).eq("id", form.id)
        : await supabase.from("videos").insert({ ...payload, created_by: user?.id ?? null });
      if (error) throw new Error(error.message);

      if (antigoVideoPath && antigoVideoPath !== video_path) {
        await supabase.storage.from("aulas").remove([antigoVideoPath]);
      }
    },

    onSettled: () => setEnviando(false),
    onSuccess: async () => {
      toast.success("Aula salva. Se o vídeo foi trocado, o progresso dos alunos nessa aula foi zerado.");
      setForm(vazio);
      setCapaFile(null);
      setVideoFile(null);
      // Limpa todo o cache de leitura para a troca aparecer de primeira,
      // tanto no painel quanto no player do aluno.
      qc.removeQueries({ queryKey: ["aula"] });
      qc.removeQueries({ queryKey: ["aula-arquivo"] });
      await qc.refetchQueries({ queryKey: ["admin-videos"] });
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (v: Video) => {
      const { error } = await supabase.from("videos").delete().eq("id", v.id);
      if (error) throw error;
      if (v.capa_path) await supabase.storage.from("capas").remove([v.capa_path]);
      if (v.video_path) await supabase.storage.from("aulas").remove([v.video_path]);
    },

    onSuccess: () => {
      toast.success("Aula removida.");
      qc.invalidateQueries({ queryKey: ["admin-videos"] });
    },
    onError: () => toast.error("Não foi possível remover a aula."),
  });

  const lista = [...((videos ?? []) as Video[])].sort(
    (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.created_at.localeCompare(b.created_at),
  );

  /** Troca a posição de duas aulas na lista do aluno. */
  const mover = useMutation({
    mutationFn: async ({ id, direcao }: { id: string; direcao: -1 | 1 }) => {
      const i = lista.findIndex((v) => v.id === id);
      const j = i + direcao;
      if (i < 0 || j < 0 || j >= lista.length) return;
      const atual = lista[i];
      const vizinho = lista[j];
      if (!atual || !vizinho) return;

      // Se as ordens estiverem empatadas, normaliza pela posição atual.
      const ordemAtual = atual.ordem === vizinho.ordem ? i + 1 : atual.ordem;
      const ordemVizinho = atual.ordem === vizinho.ordem ? j + 1 : vizinho.ordem;

      const r1 = await supabase.from("videos").update({ ordem: ordemVizinho }).eq("id", atual.id);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from("videos").update({ ordem: ordemAtual }).eq("id", vizinho.id);
      if (r2.error) throw r2.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-videos"] });
      qc.invalidateQueries({ queryKey: ["catalogo"] });
      qc.invalidateQueries({ queryKey: ["sidebar-aulas"] });
    },
    onError: () => toast.error("Não foi possível reordenar as aulas."),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,1fr)_1.4fr]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate();
        }}
        className="h-fit space-y-4 rounded-xl border border-border bg-panel p-5"
      >
        <h2 className="font-display text-sm font-semibold">{form.id ? "Editar aula" : "Publicar nova aula"}</h2>

        <div className="space-y-2">
          <Label htmlFor="v-titulo">Título</Label>
          <Input id="v-titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-tema">Tema</Label>
          <Input id="v-tema" value={form.tema} onChange={(e) => setForm({ ...form, tema: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Área de estudo</Label>
          <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a área" />
            </SelectTrigger>
            <SelectContent>
              {(cats ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-desc">Descrição</Label>
          <Textarea id="v-desc" rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-hab">Habilidades adquiridas (uma por linha)</Label>
          <Textarea id="v-hab" rows={3} value={form.habilidades} onChange={(e) => setForm({ ...form, habilidades: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-dur">Duração total (min)</Label>
          <Input id="v-dur" type="number" min="0" step="1" value={form.duracao_min} onChange={(e) => setForm({ ...form, duracao_min: e.target.value })} />
          <p className="text-xs text-muted-foreground">
            Usada para calcular a porcentagem assistida por cada aluno.
          </p>
        </div>
        <div className="space-y-3 rounded-lg border border-border/70 p-3">
          <Label>Fonte do vídeo</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={form.fonte === "link" ? "default" : "outline"}
              onClick={() => {
                setVideoFile(null);
                setForm({ ...form, fonte: "link", video_path: "" });
              }}
            >
              Link
            </Button>
            <Button
              type="button"
              size="sm"
              variant={form.fonte === "arquivo" ? "default" : "outline"}
              onClick={() => setForm({ ...form, fonte: "arquivo" })}
            >
              Arquivo do computador
            </Button>
            <Button
              type="button"
              size="sm"
              variant={form.fonte === "embed" ? "default" : "outline"}
              onClick={() => {
                setVideoFile(null);
                setForm({ ...form, fonte: "embed", video_path: "" });
              }}
            >
              Código de incorporação
            </Button>
          </div>

          {form.fonte === "link" ? (
            <div className="space-y-2">
              <Label htmlFor="v-url">Link do vídeo</Label>
              <Input
                id="v-url"
                type="url"
                placeholder="https://..."
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Aceita Vimeo, Loom, Google Drive, Streamable, Dailymotion e Wistia. O vídeo sempre é exibido dentro do
                portal.
              </p>
            </div>
          ) : form.fonte === "embed" ? (
            <div className="space-y-2">
              <Label htmlFor="v-embed">Código de incorporação</Label>
              <Textarea
                id="v-embed"
                rows={4}
                placeholder={'<iframe src="https://player-vz-....tv.pandavideo.com.br/embed/?v=..." ...></iframe>'}
                value={form.embed_code}
                onChange={(e) => setForm({ ...form, embed_code: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {extrairSrcDeEmbed(form.embed_code)
                  ? `Player detectado: ${extrairSrcDeEmbed(form.embed_code)}`
                  : "Cole o código <iframe> do Panda Video, Vturb, Bunny, YouTube ou qualquer outro player."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="v-file">Arquivo de vídeo</Label>
              <Input
                id="v-file"
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                {form.video_path && !videoFile
                  ? "Já existe um arquivo enviado para esta aula. Selecione outro apenas se quiser substituí-lo."
                  : "O arquivo fica hospedado no portal, com download bloqueado para o aluno."}
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Atenção: ao trocar o link ou o arquivo desta aula, o progresso de todos os alunos nela é zerado
            automaticamente.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="v-capa">Imagem de capa</Label>
          <Input id="v-capa" type="file" accept="image/*" onChange={(e) => setCapaFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
          <Label htmlFor="v-pub" className="text-sm font-normal">
            Publicar para os alunos
          </Label>
          <Switch id="v-pub" checked={form.publicado} onCheckedChange={(v) => setForm({ ...form, publicado: v })} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={enviando}>
            {enviando ? <Loader2 className="animate-spin" /> : <Link2 />}
            {enviando ? "Salvando..." : "Salvar aula"}
          </Button>
          {form.id && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setForm(vazio);
                setCapaFile(null);
              }}
            >
              <X /> Cancelar
            </Button>
          )}
        </div>
      </form>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aula</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="w-28">Ordem</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((v, i) => (
              <TableRow key={v.id}>
                <TableCell>
                  <p className="font-medium">{v.titulo}</p>
                  <p className="text-xs text-muted-foreground">{v.tema}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {(cats ?? []).find((c) => c.id === v.categoria_id)?.nome ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={v.publicado ? "default" : "secondary"}>{v.publicado ? "Publicada" : "Rascunho"}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(v.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      disabled={i === 0 || mover.isPending}
                      aria-label={`Mover ${v.titulo} para cima`}
                      onClick={() => mover.mutate({ id: v.id, direcao: -1 })}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      disabled={i === lista.length - 1 || mover.isPending}
                      aria-label={`Mover ${v.titulo} para baixo`}
                      onClick={() => mover.mutate({ id: v.id, direcao: 1 })}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <span className="ml-1 text-xs text-muted-foreground">{v.ordem}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setForm({
                        id: v.id,
                        titulo: v.titulo,
                        tema: v.tema ?? "",
                        descricao: v.descricao ?? "",
                        habilidades: (v.habilidades ?? []).join("\n"),
                        duracao_min: v.duracao_min ? String(v.duracao_min) : "",
                        video_url: v.video_url ?? "",
                        categoria_id: v.categoria_id ?? "",
                        publicado: v.publicado,
                        fonte: v.video_path ? "arquivo" : "link",
                        embed_code: "",
                        video_path: v.video_path ?? "",
                      })

                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => excluir.mutate(v)}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {lista.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Nenhuma aula publicada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
