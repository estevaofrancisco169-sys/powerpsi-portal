import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, ShieldCheck, PlayCircle, Layers, LockKeyhole, BarChart3 } from "lucide-react";
import { BrandLogo } from "@/components/Brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PowerPsi Portal — Videoaulas para psicólogos clientes" },
      {
        name: "description",
        content:
          "Ambiente de estudos da PowerPsi: videoaulas sobre atendimento clínico organizadas por área, com acesso exclusivo para psicólogos clientes.",
      },
      { property: "og:title", content: "PowerPsi Portal — Videoaulas para psicólogos" },
      {
        property: "og:description",
        content: "Trilhas de estudo em atendimento clínico, gestão de consultório e ética profissional.",
      },
    ],
  }),
  component: Home,
});

const areas = [
  { nome: "Fundamentos do Atendimento", desc: "Escuta clínica, vínculo e primeiro contato." },
  { nome: "Técnicas Clínicas", desc: "Abordagens e intervenções aplicadas à prática." },
  { nome: "Gestão do Consultório", desc: "Agenda, prontuário, finanças e processos." },
  { nome: "Ética e Legislação", desc: "Código de ética e responsabilidade profissional." },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <BrandLogo />
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login/admin">Administrador</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/login/aluno">Área do aluno</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/60 bg-hero">
          <div className="absolute inset-0 grid-lines opacity-[0.35]" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-6 py-20">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-surface/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
              Educação continuada
            </p>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              O ambiente de estudos dos psicólogos parceiros PowerPsi
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              Videoaulas sobre atendimento organizadas em áreas de estudo, com acompanhamento de acessos e de
              conteúdos assistidos por cada profissional.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/login/aluno">
                  <GraduationCap /> Entrar como aluno
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login/admin">
                  <ShieldCheck /> Acesso administrativo
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold">Áreas de estudo</h2>
          <p className="mt-2 text-muted-foreground">Conteúdos agrupados por tema, como em uma grade curricular.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {areas.map((a, i) => (
              <article
                key={a.nome}
                className="rounded-xl border border-border bg-panel p-5 transition-colors hover:border-primary/50"
              >
                <span className="font-display text-xs text-muted-foreground">
                  Módulo {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-display text-base font-semibold">{a.nome}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{a.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border/60 bg-surface/40">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
            {[
              { icon: PlayCircle, t: "Aulas em vídeo", d: "Upload direto pelo administrador, sem serviços externos." },
              { icon: LockKeyhole, t: "Sessão única", d: "O mesmo login não abre em dois dispositivos ao mesmo tempo." },
              { icon: BarChart3, t: "Relatórios", d: "Quem acessou, quando e quais aulas assistiu." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex gap-4">
                <Icon className="mt-1 size-5 shrink-0 text-primary" />
                <div>
                  <h3 className="font-display text-sm font-semibold">{t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Layers className="size-4" /> PowerPsi · Portal do Conhecimento
          </span>
          <span>Acesso restrito a clientes cadastrados.</span>
        </div>
      </footer>
    </div>
  );
}
