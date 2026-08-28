import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-panel font-display text-sm font-bold text-primary",
        className,
      )}
      aria-hidden
    >
      Ψ
    </span>
  );
}

export function BrandLogo({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark />
      <div className="leading-tight">
        <p className="font-display text-base font-bold tracking-tight">PowerPsi</p>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {subtitle ?? "Portal do Conhecimento"}
        </p>
      </div>
    </div>
  );
}
