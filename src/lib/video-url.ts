export type FonteVideo = { tipo: "arquivo" | "embed"; src: string; provedor: string } | null;

/**
 * Converte o link informado pelo admin em algo reproduzível dentro do portal.
 * O objetivo é sempre manter o aluno no sistema: nada de abrir a página oficial
 * do provedor, nada de download.
 */
/**
 * Extrai a URL do player a partir de um código de incorporação (<iframe ... src="...">).
 * Aceita também scripts de player que tragam um atributo src/data-src com http(s).
 */
export function extrairSrcDeEmbed(codigo: string | null | undefined): string | null {
  if (!codigo) return null;
  const texto = codigo.trim();
  if (!texto.includes("<")) return null;
  const m =
    texto.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i) ??
    texto.match(/\s(?:data-)?src\s*=\s*["'](https?:\/\/[^"']+)["']/i);
  if (!m?.[1]) return null;
  const src = m[1].trim().replace(/&amp;/g, "&");
  const url = src.startsWith("//") ? `https:${src}` : src;
  return /^https?:\/\//i.test(url) ? url : null;
}

/** true quando o texto informado parece um código de incorporação em HTML. */
export function pareceEmbedCode(texto: string | null | undefined) {
  return !!texto && /<\s*(iframe|script|div)/i.test(texto);
}

export function fonteVideo(url: string | null | undefined): FonteVideo {
  if (!url) return null;
  let link = url.trim();
  // Código de incorporação colado pelo admin: usa o src do iframe.
  if (pareceEmbedCode(link)) {
    const src = extrairSrcDeEmbed(link);
    if (!src) return null;
    link = src;
  }
  if (!/^https?:\/\//i.test(link)) return null;

  // Arquivo direto
  if (/\.(mp4|webm|ogg|ogv|mov|m4v)(\?|$)/i.test(link)) return { tipo: "arquivo", src: link, provedor: "arquivo" };

  // YouTube (domínio sem cookies, sem vídeos relacionados de outros canais)
  const yt = link.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/|v\/)|youtu\.be\/)([\w-]{6,})/i,
  );
  if (yt) {
    return {
      tipo: "embed",
      provedor: "youtube",
      src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&enablejsapi=1`,
    };
  }

  // Vimeo (inclui links privados com hash: vimeo.com/123456/abcdef)
  const vimeo = link.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\w-]+))?/i);
  if (vimeo) {
    const hash = vimeo[2] ? `?h=${vimeo[2]}&` : "?";
    return { tipo: "embed", provedor: "vimeo", src: `https://player.vimeo.com/video/${vimeo[1]}${hash}title=0&byline=0&portrait=0` };
  }

  // Loom
  const loom = link.match(/loom\.com\/(?:share|embed|v)\/([\w-]+)/i);
  if (loom) {
    return {
      tipo: "embed",
      provedor: "loom",
      src: `https://www.loom.com/embed/${loom[1]}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`,
    };
  }

  // Google Drive
  const drive = link.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([\w-]+)/i);
  if (drive) return { tipo: "embed", provedor: "drive", src: `https://drive.google.com/file/d/${drive[1]}/preview` };

  // Dropbox -> stream direto
  if (/dropbox\.com\//i.test(link)) {
    const direto = link.replace(/[?&]dl=\d/i, "").replace("www.dropbox.com", "dl.dropboxusercontent.com");
    return { tipo: "arquivo", src: `${direto}${direto.includes("?") ? "&" : "?"}raw=1`, provedor: "dropbox" };
  }

  // OneDrive / SharePoint
  if (/1drv\.ms|onedrive\.live\.com|sharepoint\.com/i.test(link)) {
    const src = /embed/i.test(link) ? link : `${link}${link.includes("?") ? "&" : "?"}embed=1`;
    return { tipo: "embed", provedor: "onedrive", src };
  }

  // Streamable
  const streamable = link.match(/streamable\.com\/(?:e\/)?([\w-]+)/i);
  if (streamable) return { tipo: "embed", provedor: "streamable", src: `https://streamable.com/e/${streamable[1]}` };

  // Dailymotion
  const daily = link.match(/(?:dailymotion\.com\/video|dai\.ly)\/([\w]+)/i);
  if (daily) return { tipo: "embed", provedor: "dailymotion", src: `https://www.dailymotion.com/embed/video/${daily[1]}` };

  // Wistia
  const wistia = link.match(/(?:wistia\.com|wi\.st)\/(?:medias|embed)\/([\w-]+)/i);
  if (wistia) return { tipo: "embed", provedor: "wistia", src: `https://fast.wistia.net/embed/iframe/${wistia[1]}` };

  // Panda Video: mantém o player original e identifica o provedor para que a
  // página possa ouvir os eventos oficiais panda_play e panda_pause.
  if (/pandavideo\.com(?:\.br)?/i.test(link)) {
    return { tipo: "embed", provedor: "panda", src: link };
  }

  // Vturb / Panda / Bunny e afins já entregam um link de player: usa como está.
  return { tipo: "embed", provedor: "outro", src: link };
}

/** Rótulo amigável do provedor, usado apenas no painel administrativo. */
export function rotuloProvedor(url: string | null | undefined) {
  const f = fonteVideo(url);
  if (!f) return "—";
  const nomes: Record<string, string> = {
    arquivo: "Arquivo de vídeo",
    youtube: "YouTube",
    vimeo: "Vimeo",
    loom: "Loom",
    drive: "Google Drive",
    dropbox: "Dropbox",
    onedrive: "OneDrive",
    streamable: "Streamable",
    dailymotion: "Dailymotion",
    wistia: "Wistia",
    panda: "Panda Video",
    outro: "Player externo",
  };
  return nomes[f.provedor] ?? "Player externo";
}
