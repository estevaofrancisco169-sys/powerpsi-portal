import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { criarUsuario, redefinirSenha, removerUsuario } from "@/lib/admin-users.functions";
import { formatCpfCnpj } from "@/lib/progresso";
import { formatDate } from "@/lib/portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { KeyRound, Loader2, Search, Trash2, UserPlus } from "lucide-react";

type Tipo = "cpf" | "cnpj";

const vazio = {
  nome: "",
  email: "",
  senha: "",
  documento: "",
  documento_tipo: "cnpj" as Tipo,
  role: "aluno" as "aluno" | "admin",
};

export function UsuariosPanel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState(vazio);
  const [busca, setBusca] = useState("");
  const [razao, setRazao] = useState<string | null>(null);
  const [alvoSenha, setAlvoSenha] = useState<{ id: string; nome: string } | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [senhaErro, setSenhaErro] = useState<string | null>(null);
  const [alvoRemocao, setAlvoRemocao] = useState<{ id: string; nome: string } | null>(null);

  const criar = useServerFn(criarUsuario);
  const remover = useServerFn(removerUsuario);
  const trocarSenha = useServerFn(redefinirSenha);

  const { data: empresas } = useQuery({
    queryKey: ["admin-empresas-lookup"],
    queryFn: async () =>
      (await supabase.from("companies").select("cnpj,razao_social,ativo").order("razao_social")).data ?? [],
  });

  const digitosDoc = form.documento.replace(/\D/g, "");
  const sugestoes =
    form.documento_tipo === "cnpj" && digitosDoc.length >= 2 && digitosDoc.length < 14
      ? (empresas ?? []).filter((c) => c.ativo && c.cnpj.replace(/\D/g, "").startsWith(digitosDoc)).slice(0, 6)
      : [];

  const { data } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("nome"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      return { profiles: profiles ?? [], roles: roles ?? [] };
    },
  });

  const salvar = useMutation({
  mutationFn: async () => {
    if (form.role === "aluno") {
      return criar({ data: form });
    }

    return criar({
      data: {
        ...form,
        documento: "00000000000",
        documento_tipo: "cpf",
      },
    });
  },
    onSuccess: (r) => {
      toast.success(
        `Usuário criado.${r?.empresa ? ` Empresa associada: ${r.empresa}.` : ""} Envie o e-mail e a senha ao cliente.`,
      );
      setForm(vazio);
      setRazao(null);
      qc.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível criar o usuário."),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => remover({ data: { id } }),
    onSuccess: () => {
      toast.success("Usuário removido.");
      qc.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível remover."),
  });

  const alterarSenha = useMutation({
    mutationFn: async ({ id, senha }: { id: string; senha: string }) => trocarSenha({ data: { id, senha } }),
    onSuccess: (resultado) => {
      if (!resultado.ok) {
        setSenhaErro(resultado.mensagem);
        toast.error(resultado.mensagem);
        return;
      }
      toast.success("Senha atualizada. Envie a nova senha ao cliente.");
      setAlvoSenha(null);
      setNovaSenha("");
      setSenhaErro(null);
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível atualizar a senha."),
  });


  async function checarCnpj(valor: string) {
    if (form.documento_tipo !== "cnpj" || valor.replace(/\D/g, "").length !== 14) {
      setRazao(null);
      return;
    }
    const { data: empresas } = await supabase.rpc("validar_cnpj_cliente", { _cnpj: valor });
    const nome = empresas?.[0]?.razao_social ?? null;
    setRazao(nome);
    if (nome) toast.success(`Empresa identificada: ${nome}`);
    else toast.error("CNPJ não encontrado na base de empresas clientes.");
  }

  const termo = busca.trim().toLowerCase();
  const papel = (id: string) =>
    (data?.roles ?? []).some((r) => r.user_id === id && r.role === "admin") ? "admin" : "aluno";
  const lista = (data?.profiles ?? []).filter((p) =>
    !termo
      ? true
      : [p.nome, p.email, p.empresa ?? "", p.documento ?? ""].some((s) => s.toLowerCase().includes(termo)),
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(340px,1fr)_1.4fr]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate();
        }}
        className="h-fit space-y-4 rounded-xl border border-border bg-panel p-5"
      >
        <div>
          <h2 className="font-display text-sm font-semibold">Cadastrar acesso</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            O acesso é criado apenas por aqui. Depois envie o e-mail e a senha ao cliente pelo WhatsApp.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Tipo de acesso</Label>
          <Select
            value={form.role}
            onValueChange={(v: "aluno" | "admin") => setForm({ ...form, role: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aluno">Aluno</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="u-nome">Nome completo</Label>
          <Input id="u-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="u-email">E-mail</Label>
          <Input
            id="u-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="u-senha">Senha</Label>
          <Input
            id="u-senha"
            value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })}
            placeholder="Mínimo de 8 caracteres"
          />
        </div>

        {form.role === "aluno" && (
          <>
            <div className="space-y-2">
              <Label>Documento</Label>
              <Select
                value={form.documento_tipo}
                onValueChange={(v: Tipo) => {
                  setForm({ ...form, documento_tipo: v, documento: "" });
                  setRazao(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="cpf">CPF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-doc">{form.documento_tipo === "cpf" ? "CPF do aluno" : "CNPJ do aluno"}</Label>
              <div className="relative">
                <Input
                  id="u-doc"
                  autoComplete="off"
                  value={form.documento}
                  onChange={(e) => {
                    const valor = formatCpfCnpj(e.target.value, form.documento_tipo);
                    setForm({ ...form, documento: valor });
                    if (form.documento_tipo === "cnpj") {
                      const d = valor.replace(/\D/g, "");
                      const achado = (empresas ?? []).find(
                        (c) => c.ativo && c.cnpj.replace(/\D/g, "") === d,
                      );
                      setRazao(d.length === 14 ? (achado?.razao_social ?? null) : null);
                    }
                  }}
                  onBlur={(e) => void checarCnpj(e.target.value)}
                  placeholder={form.documento_tipo === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                />
                {sugestoes.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                    {sugestoes.map((c) => (
                      <li key={c.cnpj}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-accent"
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            setForm({ ...form, documento: formatCpfCnpj(c.cnpj, "cnpj") });
                            setRazao(c.razao_social);
                          }}
                        >
                          <span className="text-sm font-medium">{c.razao_social}</span>
                          <span className="font-mono text-xs text-muted-foreground">{c.cnpj}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {form.documento_tipo === "cnpj" && (
                <p className="text-xs text-muted-foreground">
                  {razao ? `Razão social associada: ${razao}` : "Digite o CNPJ e escolha o cliente na lista."}
                </p>
              )}
            </div>
          </>
        )}

        <Button type="submit" className="w-full" disabled={salvar.isPending}>
          {salvar.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />} Criar acesso
        </Button>
      </form>

      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, e-mail, empresa ou documento"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Documento / empresa</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <p className="font-mono text-xs">{p.documento ?? "—"}</p>
                    <p className="text-xs">{p.empresa ?? "—"}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={papel(p.id) === "admin" ? "default" : "secondary"}>
                      {papel(p.id) === "admin" ? "Administrador" : "Aluno"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Redefinir senha"
                      onClick={() => {
                        setNovaSenha("");
                         setSenhaErro(null);
                        setAlvoSenha({ id: p.id, nome: p.nome });
                      }}
                    >
                      <KeyRound className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Remover usuário"
                      disabled={p.id === user?.id}
                      onClick={() => setAlvoRemocao({ id: p.id, nome: p.nome })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {lista.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Nenhum usuário cadastrado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={!!alvoSenha}
        onOpenChange={(o) => {
          if (!o) {
            setAlvoSenha(null);
            setSenhaErro(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {alvoSenha?.nome} e envie ao cliente pelo WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <Input
              id="nova-senha"
              type="password"
              value={novaSenha}
              onChange={(e) => {
                setNovaSenha(e.target.value);
                setSenhaErro(null);
              }}
              placeholder="Mínimo de 8 caracteres"
              aria-invalid={!!senhaErro}
              aria-describedby={senhaErro ? "nova-senha-erro" : undefined}
            />
            {senhaErro && (
              <p id="nova-senha-erro" role="alert" className="text-sm text-destructive">
                {senhaErro}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlvoSenha(null)}>
              Cancelar
            </Button>
            <Button
              disabled={novaSenha.length < 8 || alterarSenha.isPending}
              onClick={() => alvoSenha && alterarSenha.mutate({ id: alvoSenha.id, senha: novaSenha })}
            >
              {alterarSenha.isPending && <Loader2 className="animate-spin" />} Salvar senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!alvoRemocao} onOpenChange={(o) => !o && setAlvoRemocao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover acesso</AlertDialogTitle>
            <AlertDialogDescription>
              O acesso de {alvoRemocao?.nome} e todo o histórico de progresso serão apagados. Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (alvoRemocao) excluir.mutate(alvoRemocao.id);
                setAlvoRemocao(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
