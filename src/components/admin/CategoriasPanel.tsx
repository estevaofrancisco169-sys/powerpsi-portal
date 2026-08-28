import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";

type Cat = { id: string; nome: string; descricao: string | null; ordem: number };

export function CategoriasPanel() {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ id?: string; nome: string; descricao: string; ordem: number }>({
    nome: "",
    descricao: "",
    ordem: 0,
  });

  const { data: cats } = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => (await supabase.from("categories").select("*").order("ordem")).data ?? [],
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome da área");
      const payload = { nome: form.nome.trim(), descricao: form.descricao.trim() || null, ordem: Number(form.ordem) };
      const { error } = form.id
        ? await supabase.from("categories").update(payload).eq("id", form.id)
        : await supabase.from("categories").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Área de estudo salva.");
      setForm({ nome: "", descricao: "", ordem: 0 });
      qc.invalidateQueries({ queryKey: ["admin-cats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Área removida.");
      qc.invalidateQueries({ queryKey: ["admin-cats"] });
    },
    onError: () => toast.error("Não foi possível remover."),
  });

  /** Troca automaticamente a posição de duas áreas (inverte os valores de ordem). */
  const mover = useMutation({
    mutationFn: async ({ id, direcao }: { id: string; direcao: -1 | 1 }) => {
      const lista = [...((cats ?? []) as Cat[])].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
      const i = lista.findIndex((c) => c.id === id);
      const j = i + direcao;
      if (i < 0 || j < 0 || j >= lista.length) return;

      const atual = lista[i];
      const vizinho = lista[j];
      if (!atual || !vizinho) return;

      // Se as ordens estiverem empatadas/bagunçadas, normaliza pela posição atual.
      const ordemAtual = atual.ordem === vizinho.ordem ? i + 1 : atual.ordem;
      const ordemVizinho = atual.ordem === vizinho.ordem ? j + 1 : vizinho.ordem;

      const r1 = await supabase.from("categories").update({ ordem: ordemVizinho }).eq("id", atual.id);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from("categories").update({ ordem: ordemAtual }).eq("id", vizinho.id);
      if (r2.error) throw r2.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-cats"] }),
    onError: () => toast.error("Não foi possível reordenar as áreas."),
  });

  const ordenadas = [...((cats ?? []) as Cat[])].sort(
    (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome),
  );


  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate();
        }}
        className="h-fit space-y-4 rounded-xl border border-border bg-panel p-5"
      >
        <h2 className="font-display text-sm font-semibold">{form.id ? "Editar área" : "Nova área de estudo"}</h2>
        <div className="space-y-2">
          <Label htmlFor="cat-nome">Nome</Label>
          <Input id="cat-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat-desc">Descrição</Label>
          <Textarea
            id="cat-desc"
            rows={3}
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat-ordem">Ordem</Label>
          <Input
            id="cat-ordem"
            type="number"
            value={form.ordem}
            onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={salvar.isPending}>
            <Plus /> Salvar
          </Button>
          {form.id && (
            <Button type="button" variant="ghost" onClick={() => setForm({ nome: "", descricao: "", ordem: 0 })}>
              <X /> Cancelar
            </Button>
          )}
        </div>
      </form>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Área</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-28">Ordem</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenadas.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="text-muted-foreground">{c.descricao}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      disabled={i === 0 || mover.isPending}
                      aria-label={`Mover ${c.nome} para cima`}
                      onClick={() => mover.mutate({ id: c.id, direcao: -1 })}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      disabled={i === ordenadas.length - 1 || mover.isPending}
                      aria-label={`Mover ${c.nome} para baixo`}
                      onClick={() => mover.mutate({ id: c.id, direcao: 1 })}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <span className="ml-1 text-xs text-muted-foreground">{c.ordem}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setForm({ id: c.id, nome: c.nome, descricao: c.descricao ?? "", ordem: c.ordem })}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => excluir.mutate(c.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}

          </TableBody>
        </Table>
      </div>
    </div>
  );
}
