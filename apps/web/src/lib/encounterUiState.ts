/**
 * Phase 19V — per-encounter UI view state (sessionStorage only).
 * Stores navigation chrome only — never clinical text or PHI.
 */

export const ENCOUNTER_UI_STATE_VERSION = 1 as const;
export const ENCOUNTER_UI_STATE_TTL_MS = 24 * 60 * 60 * 1000;

export type EncounterUiStateV1 = {
  version: typeof ENCOUNTER_UI_STATE_VERSION;
  encounterId: string;
  savedAt: number;
  activeTab?: string;
  activeDocSection?: string;
  expandedAccordionSections?: string[];
  scrollY?: number;
  /** Non-PHI template identifier only (e.g. chest_pain). */
  templateId?: string;
};

/** Keys that must never appear in persisted encounter UI state. */
export const FORBIDDEN_ENCOUNTER_UI_STATE_KEYS = [
  "patient",
  "patientName",
  "patientId",
  "hpi",
  "ros",
  "physicalExam",
  "mdm",
  "diagnosis",
  "diagnoses",
  "medication",
  "medications",
  "chiefComplaint",
  "clinicalImpression",
  "treatmentPlan",
  "providerNote",
  "nursingAssessment",
] as const;

export function encounterUiStateStorageKey(encounterId: string): string {
  return `medora:encounter-ui-state:${encounterId}`;
}

export function isEncounterUiStateExpired(
  savedAt: number,
  nowMs: number = Date.now(),
  ttlMs: number = ENCOUNTER_UI_STATE_TTL_MS
): boolean {
  if (!Number.isFinite(savedAt) || savedAt <= 0) return true;
  return nowMs - savedAt > ttlMs;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function parseStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length > 0 ? strings : undefined;
}

export function parseEncounterUiState(raw: unknown, encounterId: string): EncounterUiStateV1 | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== ENCOUNTER_UI_STATE_VERSION) return null;
  if (raw.encounterId !== encounterId) return null;
  if (typeof raw.savedAt !== "number" || !Number.isFinite(raw.savedAt)) return null;
  if (isEncounterUiStateExpired(raw.savedAt)) return null;

  const state: EncounterUiStateV1 = {
    version: ENCOUNTER_UI_STATE_VERSION,
    encounterId,
    savedAt: raw.savedAt,
  };

  if (typeof raw.activeTab === "string" && raw.activeTab.trim()) {
    state.activeTab = raw.activeTab.trim();
  }
  if (typeof raw.activeDocSection === "string" && raw.activeDocSection.trim()) {
    state.activeDocSection = raw.activeDocSection.trim();
  }
  const expanded = parseStringArray(raw.expandedAccordionSections);
  if (expanded) state.expandedAccordionSections = expanded;
  if (typeof raw.scrollY === "number" && Number.isFinite(raw.scrollY) && raw.scrollY >= 0) {
    state.scrollY = raw.scrollY;
  }
  if (typeof raw.templateId === "string" && raw.templateId.trim()) {
    state.templateId = raw.templateId.trim();
  }

  return state;
}

export function readEncounterUiState(
  storage: Pick<Storage, "getItem">,
  encounterId: string
): EncounterUiStateV1 | null {
  if (!encounterId.trim()) return null;
  try {
    const raw = storage.getItem(encounterUiStateStorageKey(encounterId));
    if (!raw) return null;
    return parseEncounterUiState(JSON.parse(raw), encounterId);
  } catch {
    return null;
  }
}

export type EncounterUiStatePatch = Partial<
  Pick<
    EncounterUiStateV1,
    "activeTab" | "activeDocSection" | "expandedAccordionSections" | "scrollY" | "templateId"
  >
>;

export function mergeEncounterUiState(
  encounterId: string,
  previous: EncounterUiStateV1 | null,
  patch: EncounterUiStatePatch,
  nowMs: number = Date.now()
): EncounterUiStateV1 {
  return {
    version: ENCOUNTER_UI_STATE_VERSION,
    encounterId,
    savedAt: nowMs,
    activeTab: patch.activeTab ?? previous?.activeTab,
    activeDocSection: patch.activeDocSection ?? previous?.activeDocSection,
    expandedAccordionSections: patch.expandedAccordionSections ?? previous?.expandedAccordionSections,
    scrollY: patch.scrollY ?? previous?.scrollY,
    templateId: patch.templateId ?? previous?.templateId,
  };
}

export function writeEncounterUiState(
  storage: Pick<Storage, "setItem" | "getItem">,
  encounterId: string,
  patch: EncounterUiStatePatch,
  nowMs: number = Date.now()
): EncounterUiStateV1 {
  const previous = readEncounterUiState(storage, encounterId);
  const next = mergeEncounterUiState(encounterId, previous, patch, nowMs);
  storage.setItem(encounterUiStateStorageKey(encounterId), JSON.stringify(next));
  return next;
}

export function clearEncounterUiState(
  storage: Pick<Storage, "removeItem">,
  encounterId: string
): void {
  if (!encounterId.trim()) return;
  try {
    storage.removeItem(encounterUiStateStorageKey(encounterId));
  } catch {
    /* best-effort */
  }
}

/** Returns false if raw JSON (parsed or string) contains forbidden PHI-like keys. */
export function encounterUiStateContainsForbiddenKeys(raw: unknown): boolean {
  const visit = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(visit);
    if (!isRecord(value)) return false;
    for (const key of Object.keys(value)) {
      const normalized = key.toLowerCase();
      if (FORBIDDEN_ENCOUNTER_UI_STATE_KEYS.some((forbidden) => normalized.includes(forbidden.toLowerCase()))) {
        return true;
      }
      if (visit(value[key])) return true;
    }
    return false;
  };
  return visit(raw);
}

export function assertEncounterUiStatePayloadSafe(state: EncounterUiStateV1): boolean {
  return !encounterUiStateContainsForbiddenKeys(state);
}
