import type { StatusInfo } from "@/lib/progresso";

export function StatusChip({ status, pct }: { status: StatusInfo; pct?: number }) {
  return (
    <span className={`status-chip ${status.classe}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status.rotulo}
      {pct !== undefined && <span className="opacity-80">· {pct}%</span>}
    </span>
  );
}
