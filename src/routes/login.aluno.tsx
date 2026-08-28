import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { iniciarSessaoExclusiva, useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login/aluno")({
  head: () => ({
    meta: [
      { title: "Área do aluno — PowerPsi Portal" },
      { name: "description", content: "Entre com o acesso enviado pela PowerPsi para assistir às videoaulas." },
      { property: "og:title", content: "Área do aluno — PowerPsi Portal" },
      { property: "og:description", content: "Acesso dos psicólogos clientes às videoaulas de atendimento." },
    ],
  }),
  component: LoginAluno,
});

function LoginAluno() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState({ email: "", senha: "" });

  if (user) navigate({ to: "/portal", replace: true });

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: login.email.trim(),
      password: login.senha,
    });
    if (error || !data.user) {
      setLoading(false);
      toast.error("E-mail ou senha inválidos.");
      return;
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    if ((roles ?? []).some((r) => r.role === "admin")) {
      setLoading(false);
      toast.error("Esta conta é administrativa. Use o acesso do administrador.");
      await supabase.auth.signOut();
      return;
    }
    await iniciarSessaoExclusiva(data.user.id);
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/portal" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-border/60 bg-hero lg:block">
        <div className="absolute inset-0 grid-lines opacity-30" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-12">
          <BrandLogo />
          <div>
            <h2 className="max-w-sm text-3xl font-bold leading-tight">Sua trilha de estudos em atendimento clínico</h2>
            <p className="mt-4 max-w-sm text-muted-foreground">
              Acesso exclusivo para psicólogos vinculados a empresas clientes da PowerPsi.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Sessão única por login · Registro de acessos</p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Voltar ao início
          </Link>
          <h1 className="text-2xl font-bold">Acesso do aluno</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre com o e-mail e a senha enviados pela equipe PowerPsi.</p>

          <form onSubmit={entrar} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="l-email">E-mail</Label>
              <Input
                id="l-email"
                type="email"
                required
                value={login.email}
                onChange={(e) => setLogin({ ...login, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="l-senha">Senha</Label>
              <Input
                id="l-senha"
                type="password"
                required
                value={login.senha}
                onChange={(e) => setLogin({ ...login, senha: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />} Entrar no portal
            </Button>
            <p className="rounded-lg border border-border/70 bg-panel p-3 text-xs text-muted-foreground">
              O cadastro é feito exclusivamente pela equipe PowerPsi. Se ainda não recebeu seu e-mail e senha de
              acesso, fale com o seu contato na PowerPsi.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
