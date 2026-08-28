import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/portal";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";

export function AcessosPanel() {
  const [busca, setBusca] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-acessos"],
    queryFn: async () => {
      const [{ data: logs }, { data: profiles }] = await Promise.all([
        supabase.from("access_logs").select("*").order("ocorrido_em", { ascending: false }).limit(300),
        supabase.from("profiles").select("id,nome,email,empresa"),
      ]);
      return { logs: logs ?? [], profiles: profiles ?? [] };
    },
  });

  const linhas = (data?.logs ?? []).map((l) => {
    const p = data?.profiles.find((x) => x.id === l.user_id);
    return { ...l, nome: p?.nome ?? "Administrador", email: p?.email ?? "—", empresa: p?.empresa ?? "—" };
  });
  const termo = busca.trim().toLowerCase();
  const filtradas = termo
    ? linhas.filter((l) => l.nome.toLowerCase().includes(termo) || l.email.toLowerCase().includes(termo))
    : linhas;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Filtrar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Data e hora do acesso</TableHead>
              <TableHead>Dispositivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.nome}</TableCell>
                <TableCell className="text-muted-foreground">{l.email}</TableCell>
                <TableCell className="text-muted-foreground">{l.empresa}</TableCell>
                <TableCell>{formatDate(l.ocorrido_em)}</TableCell>
                <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">{l.user_agent}</TableCell>
              </TableRow>
            ))}
            {filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Nenhum acesso registrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
