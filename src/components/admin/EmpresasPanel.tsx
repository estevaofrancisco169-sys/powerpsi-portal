import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCnpj, formatDate } from "@/lib/portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Building2, Pencil, Trash2, X } from "lucide-react";

type Empresa = { id: string; cnpj: string; razao_social: string; ativo: boolean; created_at: string };

export function EmpresasPanel() {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ id?: string; cnpj: string; razao_social: string; ativo: boolean }>({
    cnpj: "",
    razao_social: "",
    ativo: true,
  });

  const { data: empresas } = useQuery({
    queryKey: ["admin-empresas"],
    queryFn: async () => (await supabase.from("companies").select("*").order("razao_social")).data ?? [],
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (form.cnpj.replace(/\D/g, "").length !== 14) throw new Error("CNPJ inválido");
      if (form.razao_social.trim().length < 2) throw new Error("Informe a razão social");
      const payload = { cnpj: formatCnpj(form.cnpj), razao_social: form.razao_social.trim(), ativo: form.ativo };
      const { error } = form.id
        ? await supabase.from("companies").update(payload).eq("id", form.id)
        : await supabase.from("companies").insert(payload);
      if (error) throw new Error(error.message.includes("duplicate") ? "Este CNPJ já está cadastrado." : "Erro ao salvar.");
    },
    onSuccess: () => {
      toast.success("Cliente salvo.");
      setForm({ cnpj: "", razao_social: "", ativo: true });
      qc.invalidateQueries({ queryKey: ["admin-empresas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente removido.");
      qc.invalidateQueries({ queryKey: ["admin-empresas"] });
    },
    onError: () => toast.error("Não foi possível remover."),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate();
        }}
        className="h-fit space-y-4 rounded-xl border border-border bg-panel p-5"
      >
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
          <Building2 className="size-4 text-primary" /> {form.id ? "Editar cliente" : "Cadastrar cliente"}
        </h2>
        <div className="space-y-2">
          <Label htmlFor="e-cnpj">CNPJ</Label>
          <Input
            id="e-cnpj"
            placeholder="00.000.000/0000-00"
            value={form.cnpj}
            onChange={(e) => setForm({ ...form, cnpj: formatCnpj(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-razao">Razão social</Label>
          <Input
            id="e-razao"
            value={form.razao_social}
            onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
          <Label htmlFor="e-ativo" className="text-sm font-normal">
            Cliente ativo (permite cadastro de alunos)
          </Label>
          <Switch id="e-ativo" checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={salvar.isPending}>
            Salvar cliente
          </Button>
          {form.id && (
            <Button type="button" variant="ghost" onClick={() => setForm({ cnpj: "", razao_social: "", ativo: true })}>
              <X /> Cancelar
            </Button>
          )}
        </div>
      </form>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Razão social</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(empresas as Empresa[] | undefined)?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.razao_social}</TableCell>
                <TableCell className="font-mono text-xs">{c.cnpj}</TableCell>
                <TableCell>
                  <Badge variant={c.ativo ? "default" : "secondary"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setForm({ id: c.id, cnpj: c.cnpj, razao_social: c.razao_social, ativo: c.ativo })}
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
