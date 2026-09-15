import { z } from "zod";

export const AI_ASSIST_LOCALES = ["en", "es", "fr"] as const;

export type AiAssistLocale = (typeof AI_ASSIST_LOCALES)[number];

export const aiLocalizedCopySchema = z.object({
  en: z.string().max(2000),
  es: z.string().max(2000),
  fr: z.string().max(2000),
});

export type AiLocalizedCopy = z.infer<typeof aiLocalizedCopySchema>;

export function interpolateAiLocalizedCopy(
  copy: AiLocalizedCopy,
  vars: Record<string, string> = {}
): AiLocalizedCopy {
  const apply = (value: string) =>
    value.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => vars[key] ?? "");
  return {
    en: apply(copy.en),
    es: apply(copy.es),
    fr: apply(copy.fr),
  };
}

export function pickAiLocalizedCopy(copy: AiLocalizedCopy | undefined, locale: string, fallback: string): string {
  if (!copy) return fallback;
  const key = locale.trim().toLowerCase().slice(0, 2);
  if (key === "es") return copy.es || fallback;
  if (key === "fr") return copy.fr || fallback;
  return copy.en || fallback;
}
