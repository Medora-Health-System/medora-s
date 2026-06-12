/**
 * Label-aware medication direction quick-picks (K.10B.5).
 */

function normalizeLabelText(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const MORPHINE_IVP_QUICK_PICKS = [
  "2 mg IVP now",
  "4 mg IVP now",
  "1 mg IVP q2h PRN severe pain",
  "2 mg IVP q4h PRN severe pain",
  "IVP once",
  "give IVP now",
] as const;

export const HYDROMORPHONE_IVP_QUICK_PICKS = [
  "0.2 mg IVP now",
  "0.5 mg IVP now",
  "1 mg IVP q3h PRN severe pain",
  "IVP once",
  "give IVP now",
] as const;

export const ONDANSETRON_QUICK_PICKS = [
  "4 mg IVP now",
  "4 mg IVP q6h PRN nausea/vomiting",
  "4 mg PO q8h PRN nausea/vomiting",
  "4 mg PO now",
] as const;

function isMorphineLabel(label: string): boolean {
  const text = normalizeLabelText(label);
  return text.includes("morphine") || /\bmorph\b/.test(text);
}

function isHydromorphoneLabel(label: string): boolean {
  const text = normalizeLabelText(label);
  return text.includes("hydromorphone") || text.includes("dilaudid");
}

function isOndansetronLabel(label: string): boolean {
  const text = normalizeLabelText(label);
  return text.includes("ondansetron") || text.includes("zofran");
}

/** Clinical quick-picks keyed by catalog label + route (K.10B.5). */
export function medicationDirectionQuickPicksForClinicalLabel(
  route: string | null | undefined,
  label: string | null | undefined
): readonly string[] | null {
  const routeToken = route?.trim().toUpperCase() ?? "";
  const text = normalizeLabelText(label);
  if (!text) return null;

  if (isMorphineLabel(text) && (routeToken === "IVP" || routeToken === "")) {
    return [...MORPHINE_IVP_QUICK_PICKS];
  }
  if (isHydromorphoneLabel(text) && (routeToken === "IVP" || routeToken === "")) {
    return [...HYDROMORPHONE_IVP_QUICK_PICKS];
  }
  if (isOndansetronLabel(text)) {
    return [...ONDANSETRON_QUICK_PICKS];
  }
  return null;
}
