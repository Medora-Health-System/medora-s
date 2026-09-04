import { i18nMessage } from "@/lib/i18nMessagesLookup";

/**
 * Resolve `erTriage.*` string from mirrored fr/en message roots (non-React triage helpers).
 */
export function erTriageT(locale: string, path: string): string {
  return i18nMessage(locale, path);
}
