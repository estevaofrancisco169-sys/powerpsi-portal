export type StatusChave = "concluida" | "quase" | "metade" | "pouco" | "nao_iniciada";

export type StatusInfo = {
  chave: StatusChave;
  rotulo: string;
  classe: string;
};

export const STATUS_ORDEM: StatusChave[] = ["concluida", "quase", "metade", "pouco", "nao_iniciada"];

export const STATUS_INFO: Record<StatusChave, StatusInfo> = {
  concluida: { chave: "concluida", rotulo: "Concluída", classe: "status-concluida" },
  quase: { chave: "quase", rotulo: "Quase concluída", classe: "status-quase" },
  metade: { chave: "metade", rotulo: "Parcialmente assistida", classe: "status-metade" },
  pouco: { chave: "pouco", rotulo: "Pouco assistida", classe: "status-pouco" },
  nao_iniciada: { chave: "nao_iniciada", rotulo: "Não iniciada", classe: "status-nao-iniciada" },
};

/** Percentual assistido (0-100) a partir da minutagem assistida e da duração total. */
export function percentual(assistidoSeg: number, totalSeg: number | null | undefined) {
  if (!totalSeg || totalSeg <= 0) return assistidoSeg > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((assistidoSeg / totalSeg) * 100)));
}

export function statusPorPercentual(pct: number): StatusInfo {
  if (pct >= 100) return STATUS_INFO.concluida;
  if (pct >= 70) return STATUS_INFO.quase;
  if (pct >= 40) return STATUS_INFO.metade;
  if (pct > 0) return STATUS_INFO.pouco;
  return STATUS_INFO.nao_iniciada;
}

/** Converte segundos em "mm:ss" (ou "hh:mm:ss"). */
export function tempo(seg: number) {
  const s = Math.max(0, Math.floor(seg || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatCpfCnpj(v: string, tipo: "cpf" | "cnpj") {
  const d = v.replace(/\D/g, "").slice(0, tipo === "cpf" ? 11 : 14);
  if (tipo === "cpf") {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** Detecta links que só podem ser exibidos via iframe (sem rastreio de minutagem). */
export function tipoDeLink(url: string | null | undefined): "arquivo" | "youtube" | "vimeo" | "outro" | null {
  if (!url) return null;
  const u = url.trim().toLowerCase();
  if (/youtube\.com|youtu\.be/.test(u)) return "youtube";
  if (/vimeo\.com/.test(u)) return "vimeo";
  if (/\.(mp4|webm|ogg|ogv|mov|m3u8)(\?|$)/.test(u)) return "arquivo";
  return "outro";
}

export function urlEmbed(url: string) {
  const tipo = tipoDeLink(url);
  if (tipo === "youtube") {
    const id = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)?.[1];
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  if (tipo === "vimeo") {
    const id = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : url;
  }
  return url;
}
