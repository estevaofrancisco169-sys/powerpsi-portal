import { supabase } from "@/integrations/supabase/client";

export async function signedUrl(bucket: string, path: string | null, expiresIn = 3600) {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function signedUrlMap(bucket: string, paths: (string | null)[], expiresIn = 3600) {
  const clean = Array.from(new Set(paths.filter(Boolean) as string[]));
  if (clean.length === 0) return {} as Record<string, string>;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(clean, expiresIn);
  const map: Record<string, string> = {};
  (data ?? []).forEach((d) => {
    if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  });
  return map;
}

export function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
