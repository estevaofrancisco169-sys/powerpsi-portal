import { useEffect } from "react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login/admin", replace: true });
  }, [loading, user, navigate]);

  if (loading || !user || (user && role === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">Esta área é exclusiva do administrador do portal.</p>
        <Button asChild>
          <Link to="/portal">Ir para a área do aluno</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/admin">
            <BrandLogo subtitle="Painel administrativo" />
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await signOut();
              navigate({ to: "/", replace: true });
            }}
          >
            <LogOut /> Sair
          </Button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
