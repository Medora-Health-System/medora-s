/**
 * Affichage compact ESI (urgences) — couleurs par gravité uniquement, pas de logique métier.
 * 1 = très urgent (noir) … 5 = non urgent (bleu).
 */

import type { CSSProperties } from "react";

export type EsiLevel = 1 | 2 | 3 | 4 | 5;

/** Cercle initiales aligné sur `MedoraCardIdentity` (44px). */
export const EMERGENCY_AVATAR_CIRCLE_STYLE: CSSProperties = {
  flexShrink: 0,
  width: 44,
  height: 44,
  borderRadius: "50%",
  backgroundColor: "#f1f5f9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  fontWeight: 600,
  color: "#334155",
  border: "1px solid #e2e8f0",
};

export function esiLevelFromUnknown(raw: string | number | null | undefined): EsiLevel | null {
  if (raw == null) return null;
  const n = typeof raw === "string" ? parseInt(raw.trim(), 10) : raw;
  if (Number.isNaN(n) || n < 1 || n > 5) return null;
  return n as EsiLevel;
}

/** Couleur du chiffre ESI (texte uniquement, tons Medora légers). */
export function esiTextColorStyle(level: EsiLevel | null): CSSProperties {
  if (level == null) return { color: "#64748b" };
  switch (level) {
    case 1:
      return { color: "#0f172a" };
    case 2:
      return { color: "#b91c1c" };
    case 3:
      return { color: "#b45309" };
    case 4:
      return { color: "#15803d" };
    case 5:
      return { color: "#2563eb" };
    default:
      return { color: "#64748b" };
  }
}

/** Typo ESI sous initiales (proche du corps des initiales ~14px). */
export function esiUnderAvatarNumberStyle(level: EsiLevel | null): CSSProperties {
  return {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.1,
    fontVariantNumeric: "tabular-nums",
    ...esiTextColorStyle(level),
  };
}

export function esiDisplayChar(level: EsiLevel | null): string {
  if (level == null) return "—";
  return String(level);
}
