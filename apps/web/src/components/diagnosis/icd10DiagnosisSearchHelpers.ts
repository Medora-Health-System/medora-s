/**
 * INP.DIS.1I — ICD-10 diagnosis search keyboard + duplicate helpers (UI-agnostic).
 */

export type DiagnosisDuplicateRef = {
  code?: string | null;
  description?: string | null;
};

export function normalizeDiagnosisDuplicateKey(input: DiagnosisDuplicateRef): string {
  const code = (input.code ?? "").trim().toUpperCase();
  if (code) return `code:${code}`;
  const description = (input.description ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return description ? `desc:${description}` : "";
}

export function isDuplicateDischargeDiagnosis(
  candidate: DiagnosisDuplicateRef,
  selected: readonly DiagnosisDuplicateRef[]
): boolean {
  const key = normalizeDiagnosisDuplicateKey(candidate);
  if (!key) return false;
  return selected.some((row) => normalizeDiagnosisDuplicateKey(row) === key);
}

export type Icd10SearchKeyAction =
  | { type: "none" }
  | { type: "close" }
  | { type: "move"; nextIndex: number }
  | { type: "select"; index: number };

/**
 * Enter selects only when a result is actively highlighted (index >= 0).
 * ArrowDown from -1 highlights the first result.
 */
export function interpretIcd10SearchKeyDown(input: {
  key: string;
  activeIndex: number;
  hitCount: number;
  listOpen: boolean;
}): Icd10SearchKeyAction {
  if (!input.listOpen || input.hitCount <= 0) {
    if (input.key === "Escape") return { type: "close" };
    return { type: "none" };
  }
  if (input.key === "Escape") return { type: "close" };
  if (input.key === "ArrowDown") {
    const next =
      input.activeIndex < 0 ? 0 : Math.min(input.hitCount - 1, input.activeIndex + 1);
    return { type: "move", nextIndex: next };
  }
  if (input.key === "ArrowUp") {
    const next =
      input.activeIndex < 0 ? input.hitCount - 1 : Math.max(0, input.activeIndex - 1);
    return { type: "move", nextIndex: next };
  }
  if (input.key === "Enter") {
    if (input.activeIndex >= 0 && input.activeIndex < input.hitCount) {
      return { type: "select", index: input.activeIndex };
    }
    return { type: "none" };
  }
  return { type: "none" };
}

export function icd10HitDescription(hit: {
  shortDescription?: string | null;
  longDescription?: string | null;
  description?: string | null;
  displayLabel?: string | null;
  code: string;
}): string {
  void hit.displayLabel;
  return (
    (hit.longDescription ?? "").trim() ||
    (hit.shortDescription ?? "").trim() ||
    (hit.description ?? "").trim() ||
    hit.code
  );
}
