import { useEffect } from "react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";

export const Route = createFileRoute("/portal")({
  ssr: false,
  component: PortalLayout,
});

function PortalLayout() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login/aluno", replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/portal">
            <BrandLogo subtitle="Área do aluno" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{profile?.nome}</p>
              <p className="text-xs text-muted-foreground">{profile?.empresa}</p>
            </div>
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
        </div>
      </header>
      <Outlet />
    </div>
  );
}
