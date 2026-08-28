import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { iniciarSessaoExclusiva } from "@/lib/auth";
import { BrandLogo } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/login/admin")({
  head: () => ({
    meta: [
      { title: "Acesso administrativo — PowerPsi Portal" },
      { name: "description", content: "Painel administrativo do portal PowerPsi: aulas, clientes e relatórios." },
      { property: "og:title", content: "Acesso administrativo — PowerPsi Portal" },
      { property: "og:description", content: "Gestão de videoaulas, CNPJs de clientes e relatórios de acesso." },
    ],
  }),
  component: LoginAdmin,
});

function LoginAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", senha: "" });

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.senha,
    });
    if (error || !data.user) {
      setLoading(false);
      toast.error("E-mail ou senha inválidos.");
      return;
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    if (!(roles ?? []).some((r) => r.role === "admin")) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Esta conta não possui acesso administrativo.");
      return;
    }
    await iniciarSessaoExclusiva(data.user.id);
    toast.success("Acesso administrativo liberado.");
    navigate({ to: "/admin" });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-hero px-6 py-14">
      <div className="absolute inset-0 grid-lines opacity-25" aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-panel p-8 shadow-elevated">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <BrandLogo subtitle="Painel administrativo" />
        <h1 className="mt-8 flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="size-5 text-primary" /> Administrador
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Área restrita da equipe PowerPsi. Não há cadastro público neste acesso.
        </p>
        <form onSubmit={entrar} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="a-email">E-mail</Label>
            <Input
              id="a-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-senha">Senha</Label>
            <Input
              id="a-senha"
              type="password"
              required
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />} Entrar no painel
          </Button>
        </form>
      </div>
    </div>
  );
}
