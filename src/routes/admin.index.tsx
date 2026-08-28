import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VisaoGeral } from "@/components/admin/VisaoGeral";
import { AulasPanel } from "@/components/admin/AulasPanel";
import { CategoriasPanel } from "@/components/admin/CategoriasPanel";
import { EmpresasPanel } from "@/components/admin/EmpresasPanel";
import { UsuariosPanel } from "@/components/admin/UsuariosPanel";
import { VisualizacaoPanel } from "@/components/admin/VisualizacaoPanel";
import { AcessosPanel } from "@/components/admin/AcessosPanel";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Painel administrativo — PowerPsi Portal" },
      { name: "description", content: "Cadastre acessos, gerencie videoaulas e acompanhe o progresso de cada aluno." },
      { property: "og:title", content: "Painel administrativo — PowerPsi Portal" },
      { property: "og:description", content: "Cadastro de acessos, aulas por link e relatórios de progresso." },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold">Painel de controle</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Publique aulas, cadastre os acessos dos clientes e acompanhe o progresso de cada aluno.
      </p>

      <Tabs defaultValue="geral" className="mt-8">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="geral">Visão geral</TabsTrigger>
          <TabsTrigger value="aulas">Aulas</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="visualizacao">Visualização</TabsTrigger>
          <TabsTrigger value="acessos">Acessos</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="pt-6">
          <VisaoGeral />
        </TabsContent>
        <TabsContent value="aulas" className="pt-6">
          <AulasPanel />
        </TabsContent>
        <TabsContent value="categorias" className="pt-6">
          <CategoriasPanel />
        </TabsContent>
        <TabsContent value="usuarios" className="space-y-10 pt-6">
          <UsuariosPanel />
          <section>
            <h2 className="font-display text-lg font-semibold">Empresas clientes</h2>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              Base usada para associar automaticamente a razão social quando o aluno é cadastrado com CNPJ.
            </p>
            <EmpresasPanel />
          </section>
        </TabsContent>
        <TabsContent value="visualizacao" className="pt-6">
          <VisualizacaoPanel />
        </TabsContent>
        <TabsContent value="acessos" className="pt-6">
          <AcessosPanel />
        </TabsContent>
      </Tabs>
    </main>
  );
}
