import type { SupportedLanguage } from "@/i18n/config";
import frMessages from "@/i18n/messages/fr";
import enMessages from "@/i18n/messages/en";

/**
 * Resolve `erTriage.*` string from mirrored fr/en message roots (non-React triage helpers).
 */
export function erTriageT(locale: SupportedLanguage, path: string): string {
  const root = (locale === "en" ? enMessages : frMessages) as Record<string, unknown>;
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = root;
  for (const p of parts) {
    if (cur !== null && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}
