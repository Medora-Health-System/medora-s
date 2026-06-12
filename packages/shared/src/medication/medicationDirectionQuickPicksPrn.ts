/**
 * PRN-aware direction quick-picks by medication category (K.10B.6).
 * Merged with route picks — does not replace scheduled options.
 */

function normalizeLabelText(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const PRN_PAIN_QUICK_PICKS = [
  "1 tab PO q4h PRN mild pain",
  "1 tab PO q6h PRN moderate pain",
  "2 mg IVP q4h PRN severe pain",
  "1 mg IVP q2h PRN severe pain",
] as const;

export const PRN_ANTIEMETIC_QUICK_PICKS = [
  "4 mg IVP q6h PRN nausea/vomiting",
  "4 mg PO q8h PRN nausea/vomiting",
  "10 mg IM q6h PRN nausea/vomiting",
] as const;

export const PRN_COUGH_QUICK_PICKS = [
  "10 mL PO q6h PRN cough",
  "1 tab PO q8h PRN cough",
  "5 mL PO q4h PRN cough",
] as const;

export const PRN_FEVER_QUICK_PICKS = [
  "650 mg PO q6h PRN fever",
  "1 g PO q6h PRN fever",
  "400 mg PO q6h PRN fever",
] as const;

export const PRN_ALLERGY_QUICK_PICKS = [
  "25 mg PO q6h PRN allergy symptoms",
  "10 mg PO daily PRN allergy symptoms",
  "50 mg IM once PRN allergic reaction",
] as const;

export const PRN_BRONCHODILATOR_QUICK_PICKS = [
  "2.5 mg neb q4h PRN wheezing",
  "4 puffs INH q4h PRN shortness of breath",
  "0.5 mg IVP q6h PRN bronchospasm",
] as const;

export const PRN_ANXIETY_SLEEP_QUICK_PICKS = [
  "0.5 mg PO q6h PRN anxiety",
  "1 mg PO at bedtime PRN insomnia",
  "25 mg PO at bedtime PRN insomnia",
] as const;

type PrnCategory =
  | "pain"
  | "antiemetic"
  | "cough"
  | "fever"
  | "allergy"
  | "bronchodilator"
  | "anxiety_sleep";

function detectPrnCategory(text: string): PrnCategory | null {
  if (
    text.includes("morphine") ||
    text.includes("hydromorphone") ||
    text.includes("dilaudid") ||
    text.includes("acetaminophen") ||
    text.includes("tylenol") ||
    text.includes("ibuprofen") ||
    text.includes("ketorolac") ||
    text.includes("tramadol") ||
    /\bnsaid\b/.test(text) ||
    text.includes("analges")
  ) {
    return "pain";
  }
  if (
    text.includes("ondansetron") ||
    text.includes("zofran") ||
    text.includes("metoclopramide") ||
    text.includes("promethazine") ||
    text.includes("antiemetic") ||
    text.includes("nausea")
  ) {
    return "antiemetic";
  }
  if (
    text.includes("dextromethorphan") ||
    text.includes("guaifenesin") ||
    text.includes("benzonatate") ||
    text.includes("cough")
  ) {
    return "cough";
  }
  if (
    text.includes("antipyretic") ||
    (text.includes("fever") && (text.includes("acetaminophen") || text.includes("ibuprofen")))
  ) {
    return "fever";
  }
  if (
    text.includes("diphenhydramine") ||
    text.includes("loratadine") ||
    text.includes("cetirizine") ||
    text.includes("antihistamine") ||
    text.includes("allergy")
  ) {
    return "allergy";
  }
  if (
    text.includes("albuterol") ||
    text.includes("salbutamol") ||
    text.includes("ipratropium") ||
    text.includes("bronchodilator") ||
    text.includes("wheez")
  ) {
    return "bronchodilator";
  }
  if (
    text.includes("lorazepam") ||
    text.includes("diazepam") ||
    text.includes("melatonin") ||
    text.includes("anxiety") ||
    text.includes("insomnia") ||
    text.includes("sleep")
  ) {
    return "anxiety_sleep";
  }
  return null;
}

function picksForCategory(category: PrnCategory): readonly string[] {
  switch (category) {
    case "pain":
      return PRN_PAIN_QUICK_PICKS;
    case "antiemetic":
      return PRN_ANTIEMETIC_QUICK_PICKS;
    case "cough":
      return PRN_COUGH_QUICK_PICKS;
    case "fever":
      return PRN_FEVER_QUICK_PICKS;
    case "allergy":
      return PRN_ALLERGY_QUICK_PICKS;
    case "bronchodilator":
      return PRN_BRONCHODILATOR_QUICK_PICKS;
    case "anxiety_sleep":
      return PRN_ANXIETY_SLEEP_QUICK_PICKS;
  }
}

/** Category PRN quick-picks when label/class indicate PRN-eligible medication (K.10B.6). */
export function medicationDirectionQuickPicksForPrnCategory(
  label: string | null | undefined,
  therapeuticClass?: string | null | undefined
): readonly string[] | null {
  const text = normalizeLabelText(`${label ?? ""} ${therapeuticClass ?? ""}`);
  if (!text) return null;
  const category = detectPrnCategory(text);
  if (!category) return null;
  return [...picksForCategory(category)];
}
