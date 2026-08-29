"use client";

/**
 * INP.PROV.1B — Provider Documentation workspace (3-column note-writing surface).
 *
 * Reuses the durable D4A.2.6 provider-workspace store (H&P draft + progress notes) and the
 * enterprise order composer. Only durable authoring types live here: Progress Note and H&P.
 * No second documentation engine, no second patient header: patient identity, MRN and the
 * live vital-sign header stay in the inpatient workspace chrome above this component. The
 * Flowsheets tab is a read-only projection of the provider clinical synthesis.
 *
 * Dictation: fields are Dragon-ready (`data-dictation-ready`); the workspace never opens a
 * browser speech-recognition session, it only focuses the target field.
 *
 * Closed-record projection: signed provider notes stay in the provider-workspace store and
 * are projected read-only by the encounter Summary. This workspace never rewrites the
 * encounter-level `admissionSummaryJson` snapshot or any other closed-record projection.
 *
 * Authorship: PROVIDER only, server-enforced. Progress-note text round-trips through the
 * SOAP encoder so no Prisma migration is required.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  canAuthorInpatientProviderDocumentation,
  inpatientFacilityMedicationOrderMode,
  isProviderProgressNoteFinalStatus,
  PLAN_STICKY_OPTIONS,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  fetchInpatientWorkspaceBootstrap,
  fetchProviderClinicalSynthesis,
  fetchProviderWorkspace,
  saveProviderProgressNote,
  signProviderHp,
  signProviderProgressNote,
} from "@/features/hospital-care/inpatientOperationsApi";
import { fetchOrdersForEncounter } from "@/lib/clinicalWorklistApi";
import { CreateOrderModal } from "@/components/orders";
import { DictationFieldLabel } from "@/components/clinical/DictationFieldLabel";
import { InpatientProviderWorkspacePanel } from "./InpatientProviderWorkspacePanel";
import { inpatientActiveWorkspacePath } from "./inpatientWorkspacePaths";
import {
  appendDictationToSection,
  countProgressSoapCharacters,
  emptyProgressSoapSections,
  parseProgressNoteSoapText,
  PROGRESS_SOAP_SECTION_KEYS,
  serializeProgressNoteSoapText,
  type ProgressSoapSectionKey,
  type ProgressSoapSections,
} from "./providerProgressNoteSoapInpProv1b";
import {
  buildProviderSmartAssistReview,
  buildProviderSmartAssistSuggestions,
  projectRecentLabsFromSynthesis,
  type ProviderSmartAssistSuggestion,
} from "./providerDocumentationSmartAssistInpProv1b";

const HISTORY_LIMIT = 40;
const I18N = "inpatientProviderDocumentationInpProv1b";
const HP_LIST_ID = "__hp__";
const COLLAPSED_NOTE_COUNT = 6;
const CLOCK_INTERVAL_MS = 30_000;

function standardDailyTemplate(french: boolean): ProgressSoapSections {
  return french
    ? {
        SUBJECTIVE: "Revue du jour d’hospitalisation :\n",
        OBJECTIVE: "Examen et données :\n",
        ASSESSMENT: "Évaluation :\n",
        PLAN: "Plan :\n",
      }
    : {
        SUBJECTIVE: "Hospital day review:\n",
        OBJECTIVE: "Exam and data:\n",
        ASSESSMENT: "Assessment:\n",
        PLAN: "Plan:\n",
      };
}

type NoteType = "PROGRESS" | "HP";
const NOTE_TYPES: NoteType[] = ["PROGRESS", "HP"];

type CenterTab = "note" | "templates" | "smartPhrases" | "flowsheets" | "dictate";
const CENTER_TABS: CenterTab[] = ["note", "templates", "smartPhrases", "flowsheets", "dictate"];

type RightTab = "smartAssist" | "patientContext";

type ProgressNoteLite = {
  noteId: string;
  status: string;
  text: string;
  serviceDate: string;
  signedAt?: string | null;
  lastSavedAt?: string | null;
};

type ProviderWorkspaceDoc = {
  expectedVersion?: number;
  hpDraft?: { status?: string; signedAt?: string | null } | null;
  progressNotes?: ProgressNoteLite[];
};

type WorkspaceSynthesis = {
  overview?: {
    primaryDiagnosis?: string | null;
    attending?: string | null;
    codeStatus?: string | null;
    isolation?: string | null;
  } | null;
  vitals?: Array<{
    key: string;
    label: string;
    current: string | null;
    previous: string | null;
    trend24h: string;
    abnormal: boolean;
  }> | null;
  intakeOutput?: {
    intake24hMl?: number | null;
    output24hMl?: number | null;
    balance24hMl?: number | null;
    hospitalBalanceMl?: number | null;
  } | null;
  laboratories?: {
    trending?: Array<{
      label: string;
      current: string | null;
      previous: string | null;
      direction: string;
    }>;
    abnormal?: Array<{ label: string; current: string | null; direction: string }>;
  } | null;
  problems?: Array<{
    displayLabel: string;
    status: string;
    assessment?: string | null;
    plan?: string | null;
  }> | null;
};

type OrderItemLite = {
  id: string;
  status: string;
  displayLabel: string;
  catalogItemType: string;
  priority?: string | null;
  createdAt?: string | null;
  route?: string | null;
  frequencyCode?: string | null;
  frequency?: string | null;
  strength?: string | null;
  dose?: string | null;
};

type OrderCardLite = {
  id: string;
  status: string;
  createdAt?: string | null;
  priority?: string | null;
  items: OrderItemLite[];
};

type NoteEntry = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  statusTone: "draft" | "final";
  when: string;
};

/**
 * Same affordance as `DictationFieldLabel`: bring the target field into view, focus it,
 * place the caret at end, and flash it briefly so the provider can see where Dragon will type.
 */
function focusDictationTarget(elementId: string): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(elementId) as HTMLTextAreaElement | null;
  if (!el || el.disabled) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus();
  const len = el.value.length;
  try {
    el.setSelectionRange(len, len);
  } catch {
    /* some browsers reject setSelectionRange on disabled/non-text inputs */
  }
  el.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.28)";
  el.style.background = "#eff6ff";
  el.style.borderColor = "#93c5fd";
  window.setTimeout(() => {
    el.style.boxShadow = "";
    el.style.background = "";
    el.style.borderColor = "";
  }, 1400);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickLabel(item: Record<string, unknown>, french: boolean): string {
  const fr = String(item.displayLabelFr ?? "").trim();
  const en = String(item.displayLabelEn ?? item.displayLabel ?? "").trim();
  const manual = String(item.manualLabel ?? "").trim();
  return french ? fr || en || manual : en || fr || manual;
}

function pickOptionalString(...values: unknown[]): string | null {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return null;
}

function progressNoteStatusMeta(
  status: string,
  t: (key: string) => string
): { label: string; tone: "draft" | "final" } {
  const s = String(status ?? "").trim().toUpperCase();
  if (s === "AMENDED") return { label: t(`${I18N}.amended`), tone: "final" };
  if (s === "CORRECTED") return { label: t(`${I18N}.corrected`), tone: "final" };
  if (s === "SIGNED") return { label: t(`${I18N}.signed`), tone: "final" };
  if (s === "REVIEW") return { label: t(`${I18N}.review`), tone: "draft" };
  return { label: t(`${I18N}.draft`), tone: "draft" };
}

/** Normalize the enterprise order payload down to the fields this strip displays. */
function normalizeOrders(raw: unknown[], french: boolean): OrderCardLite[] {
  const out: OrderCardLite[] = [];
  for (const entry of raw) {
    const order = asRecord(entry);
    const id = String(order?.id ?? "").trim();
    if (!order || !id) continue;
    const items: OrderItemLite[] = [];
    for (const rawItem of Array.isArray(order.items) ? order.items : []) {
      const item = asRecord(rawItem);
      const itemId = String(item?.id ?? "").trim();
      if (!item || !itemId) continue;
      items.push({
        id: itemId,
        status: String(item.status ?? order.status ?? "").toUpperCase(),
        displayLabel: pickLabel(item, french),
        catalogItemType: String(item.catalogItemType ?? "").toUpperCase(),
        priority: pickOptionalString(item.priority, order.priority),
        createdAt: pickOptionalString(item.createdAt, order.createdAt, order.orderedAt),
        route: pickOptionalString(item.route, item.administrationRoute),
        frequencyCode: pickOptionalString(item.frequencyCode),
        frequency: pickOptionalString(item.frequency, item.frequencyLabel),
        strength: pickOptionalString(item.strength, item.medicationStrength),
        dose: pickOptionalString(item.dose, item.doseAmount),
      });
    }
    out.push({
      id,
      status: String(order.status ?? "").toUpperCase(),
      createdAt: pickOptionalString(order.createdAt, order.orderedAt),
      priority: pickOptionalString(order.priority),
      items,
    });
  }
  return out;
}

function sortNotesNewestFirst(notes: ProgressNoteLite[]): ProgressNoteLite[] {
  return notes
    .slice()
    .sort((a, b) => String(b.serviceDate ?? "").localeCompare(String(a.serviceDate ?? "")));
}

function isProgressNoteFinal(status: string | null | undefined): boolean {
  return isProviderProgressNoteFinalStatus(status);
}

function isHpSignedStatus(status: string | null | undefined): boolean {
  return String(status ?? "").trim().toUpperCase() === "SIGNED";
}

function formatClockLabel(french: boolean): string {
  return new Date().toLocaleTimeString(french ? "fr-FR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function labAbnormalHint(
  row: { abnormal: boolean; direction: string },
  t: (key: string) => string
): string | null {
  const d = String(row.direction ?? "").toUpperCase();
  if (d.includes("UP") || d === "INCREASING" || d === "↑") return t(`${I18N}.recentLabs.high`);
  if (d.includes("DOWN") || d === "DECREASING" || d === "↓") return t(`${I18N}.recentLabs.low`);
  if (row.abnormal) return t(`${I18N}.recentLabs.high`);
  return null;
}

const CARD: CSSProperties = { ...MEDORA_CARD_SHELL, borderRadius: 12, padding: "10px 12px" };
const CARD_TITLE: CSSProperties = { margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a" };
const ROW_BETWEEN: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
};
const META: CSSProperties = { fontSize: 11, color: "#64748b" };
const GHOST_BTN: CSSProperties = {
  padding: "4px 8px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#334155",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
const LINK_BTN: CSSProperties = { ...GHOST_BTN, border: "none", padding: 0, color: "#1d4ed8" };
const PRIMARY_BTN: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 10,
  border: "1px solid #1d4ed8",
  background: "#2563eb",
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};
const TEXTAREA: CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 8px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
  fontSize: 12,
  fontFamily: "inherit",
  color: "#0f172a",
  resize: "vertical",
};
const SOAP_SECTION: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "8px 10px",
  background: "#fff",
};

function statusBadgeStyle(tone: "draft" | "final"): CSSProperties {
  return tone === "final"
    ? {
        display: "inline-block",
        padding: "1px 6px",
        borderRadius: 9999,
        fontSize: 9,
        fontWeight: 700,
        background: "#ecfdf5",
        border: "1px solid #6ee7b7",
        color: "#047857",
      }
    : {
        display: "inline-block",
        padding: "1px 6px",
        borderRadius: 9999,
        fontSize: 9,
        fontWeight: 700,
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        color: "#1d4ed8",
      };
}

function off(base: CSSProperties, disabled: boolean): CSSProperties {
  return disabled ? { ...base, opacity: 0.5, cursor: "not-allowed" } : base;
}

function tabStyle(active: boolean): CSSProperties {
  return {
    ...GHOST_BTN,
    borderColor: active ? "#93c5fd" : "#e2e8f0",
    background: active ? "#eff6ff" : "#fff",
    color: active ? "#1d4ed8" : "#334155",
  };
}

function PanelCard({
  testId,
  title,
  action,
  children,
  panelRef,
}: {
  testId: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  panelRef?: React.Ref<HTMLElement>;
}) {
  return (
    <section ref={panelRef} data-testid={testId} style={CARD}>
      <div style={ROW_BETWEEN}>
        <h3 style={CARD_TITLE}>{title}</h3>
        {action ?? null}
      </div>
      {children}
    </section>
  );
}

export function InpatientProviderDocumentationWorkspaceInpProv1b({
  encounterId,
  facilityId,
  patientId,
  roles,
  isLocked,
  writersEnabled,
  allergiesSummary,
  onNavigateSection,
}: {
  encounterId: string;
  facilityId: string;
  patientId?: string | null;
  roles: string[];
  isLocked: boolean;
  writersEnabled: boolean;
  allergiesSummary?: string | null;
  onNavigateSection?: (section: string) => void;
}) {
  const { t, language } = useI18n();
  const french = language === "fr";
  const canAuthor = canAuthorInpatientProviderDocumentation(roles) && writersEnabled && !isLocked;

  const [doc, setDoc] = useState<ProviderWorkspaceDoc | null>(null);
  const [synthesis, setSynthesis] = useState<WorkspaceSynthesis | null>(null);
  const [orders, setOrders] = useState<OrderCardLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [noteType, setNoteType] = useState<NoteType>("PROGRESS");
  const [centerTab, setCenterTab] = useState<CenterTab>("note");
  const [rightTab, setRightTab] = useState<RightTab>("smartAssist");
  const [assistTab, setAssistTab] = useState<"suggestions" | "review">("suggestions");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [sections, setSections] = useState<ProgressSoapSections>(() => emptyProgressSoapSections());
  const [undoStack, setUndoStack] = useState<ProgressSoapSections[]>([]);
  const [redoStack, setRedoStack] = useState<ProgressSoapSections[]>([]);
  const [focusedSection, setFocusedSection] = useState<ProgressSoapSectionKey>("SUBJECTIVE");
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [savedAtLabel, setSavedAtLabel] = useState<string | null>(null);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const [todayIso, setTodayIso] = useState("");
  const [clockLabel, setClockLabel] = useState("");
  const [bootstrapAllergies, setBootstrapAllergies] = useState<string | null>(null);

  const sectionsRef = useRef(sections);
  const focusedRef = useRef(focusedSection);
  const dirtyRef = useRef(dirty);
  const selectedRef = useRef(selectedNoteId);
  const noteTypeRef = useRef(noteType);
  const ordersStripRef = useRef<HTMLElement | null>(null);
  const assistRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);
  useEffect(() => {
    focusedRef.current = focusedSection;
  }, [focusedSection]);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  useEffect(() => {
    selectedRef.current = selectedNoteId;
  }, [selectedNoteId]);
  useEffect(() => {
    noteTypeRef.current = noteType;
  }, [noteType]);

  useEffect(() => {
    setTodayIso(new Date().toISOString().slice(0, 10));
    setClockLabel(formatClockLabel(french));
    const handle = window.setInterval(() => setClockLabel(formatClockLabel(french)), CLOCK_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [french]);

  const progressNotes = useMemo(() => sortNotesNewestFirst(doc?.progressNotes ?? []), [doc]);
  const expectedVersion = Number(doc?.expectedVersion ?? 0);
  const activeNote = useMemo(
    () => progressNotes.find((n) => n.noteId === selectedNoteId) ?? null,
    [progressNotes, selectedNoteId]
  );
  const canEditNote =
    canAuthor && noteType === "PROGRESS" && Boolean(activeNote) && !isProgressNoteFinal(activeNote?.status);

  const applyDocumentation = useCallback((next: ProviderWorkspaceDoc) => {
    setDoc(next);
    const notes = sortNotesNewestFirst(next.progressNotes ?? []);
    const preferred =
      notes.find((n) => n.noteId === selectedRef.current) ??
      notes.find((n) => !isProgressNoteFinal(n.status)) ??
      notes[0] ??
      null;
    if (!preferred) return;
    if (preferred.noteId !== selectedRef.current) {
      setSelectedNoteId(preferred.noteId);
      selectedRef.current = preferred.noteId;
      setSections(parseProgressNoteSoapText(preferred.text));
      setUndoStack([]);
      setRedoStack([]);
      setDirty(false);
      return;
    }
    if (!dirtyRef.current) setSections(parseProgressNoteSoapText(preferred.text));
  }, []);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    const [workspaceSettled, synthesisSettled, bootstrapSettled] = await Promise.allSettled([
      fetchProviderWorkspace(encounterId),
      fetchProviderClinicalSynthesis(encounterId),
      fetchInpatientWorkspaceBootstrap(encounterId, "PROVIDER", { facilityId }),
    ]);
    if (workspaceSettled.status === "fulfilled") {
      applyDocumentation((workspaceSettled.value.documentation ?? {}) as ProviderWorkspaceDoc);
    } else {
      setDoc(null);
      setLoadFailed(true);
    }
    setSynthesis(
      synthesisSettled.status === "fulfilled"
        ? ((synthesisSettled.value.synthesis ?? null) as WorkspaceSynthesis)
        : null
    );
    setBootstrapAllergies(
      bootstrapSettled.status === "fulfilled"
        ? (bootstrapSettled.value.header?.allergiesSummary ?? null)
        : null
    );
    setLoading(false);
  }, [applyDocumentation, encounterId, facilityId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const raw = await fetchOrdersForEncounter(facilityId, encounterId).catch(() => [] as unknown[]);
      if (!cancelled) setOrders(normalizeOrders(raw, french));
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, french, ordersRefresh]);

  const commitSections = useCallback((next: ProgressSoapSections) => {
    setUndoStack((stack) => [...stack, sectionsRef.current].slice(-HISTORY_LIMIT));
    setRedoStack([]);
    setSections(next);
    setDirty(true);
  }, []);

  const appendToSection = useCallback(
    (key: ProgressSoapSectionKey, text: string) => {
      if (!text.trim()) return;
      commitSections({
        ...sectionsRef.current,
        [key]: appendDictationToSection(sectionsRef.current[key], text),
      });
    },
    [commitSections]
  );

  const undo = () => {
    if (!undoStack.length) return;
    const previous = undoStack[undoStack.length - 1]!;
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, sectionsRef.current].slice(-HISTORY_LIMIT));
    setSections(previous);
    setDirty(true);
  };

  const redo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1]!;
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, sectionsRef.current].slice(-HISTORY_LIMIT));
    setSections(next);
    setDirty(true);
  };

  const persistProgressDraft = useCallback(async (): Promise<number | null> => {
    const note = progressNotes.find((n) => n.noteId === selectedRef.current);
    if (!canAuthor || !note || isProgressNoteFinal(note.status)) return null;
    setSaveState("saving");
    setActionError(null);
    try {
      const res = await saveProviderProgressNote(encounterId, {
        expectedVersion,
        note: {
          noteId: note.noteId,
          expectedVersion: 0,
          status: "DRAFT",
          text: serializeProgressNoteSoapText(sectionsRef.current),
          serviceDate: note.serviceDate || new Date().toISOString().slice(0, 10),
        },
      });
      const nextDoc = res.documentation as ProviderWorkspaceDoc;
      setDirty(false);
      dirtyRef.current = false;
      applyDocumentation(nextDoc);
      setSaveState("saved");
      setSavedAtLabel(formatClockLabel(french));
      return Number(nextDoc.expectedVersion ?? expectedVersion + 1);
    } catch {
      setSaveState("failed");
      setActionError(t(`${I18N}.saveFailed`));
      return null;
    }
  }, [applyDocumentation, canAuthor, encounterId, expectedVersion, french, progressNotes, t]);

  useEffect(() => {
    if (!dirty || !canEditNote) return;
    const handle = window.setTimeout(() => void persistProgressDraft(), 900);
    return () => window.clearTimeout(handle);
  }, [canEditNote, dirty, persistProgressDraft, sections]);

  const guardDirtySwitch = useCallback(async (): Promise<boolean> => {
    if (!dirtyRef.current || noteTypeRef.current !== "PROGRESS" || !canAuthor) return true;
    const note = progressNotes.find((n) => n.noteId === selectedRef.current);
    if (!note || isProgressNoteFinal(note.status)) return true;
    const version = await persistProgressDraft();
    // Saved successfully → clear dirty and allow navigation.
    if (version !== null && !dirtyRef.current) return true;
    // Save failed: keep current note selected, preserve editor, show failure — never switch.
    return false;
  }, [canAuthor, persistProgressDraft, progressNotes]);

  const applyNoteSelection = useCallback(
    (id: string) => {
      if (id === HP_LIST_ID) {
        setNoteType("HP");
        setCenterTab("note");
        return;
      }
      const note = progressNotes.find((n) => n.noteId === id);
      if (!note) return;
      setNoteType("PROGRESS");
      setCenterTab("note");
      setSelectedNoteId(note.noteId);
      selectedRef.current = note.noteId;
      setSections(parseProgressNoteSoapText(note.text));
      setUndoStack([]);
      setRedoStack([]);
      setDirty(false);
      dirtyRef.current = false;
    },
    [progressNotes]
  );

  const selectNote = async (id: string) => {
    const currentListId = noteTypeRef.current === "HP" ? HP_LIST_ID : selectedRef.current;
    if (id !== currentListId) {
      const ok = await guardDirtySwitch();
      if (!ok) return;
    }
    applyNoteSelection(id);
  };

  const createProgressNote = async () => {
    if (!canAuthor || saveState === "saving") return;
    const ok = await guardDirtySwitch();
    if (!ok) return;
    const noteId = `pn-${Date.now()}`;
    setSaveState("saving");
    setActionError(null);
    try {
      const res = await saveProviderProgressNote(encounterId, {
        expectedVersion,
        note: {
          noteId,
          expectedVersion: 0,
          status: "DRAFT",
          text: serializeProgressNoteSoapText(emptyProgressSoapSections()),
          serviceDate: new Date().toISOString().slice(0, 10),
        },
      });
      setNoteType("PROGRESS");
      setCenterTab("note");
      setSelectedNoteId(noteId);
      selectedRef.current = noteId;
      setSections(emptyProgressSoapSections());
      setUndoStack([]);
      setRedoStack([]);
      setDirty(false);
      dirtyRef.current = false;
      setDoc(res.documentation as ProviderWorkspaceDoc);
      setSaveState("saved");
      setSavedAtLabel(formatClockLabel(french));
    } catch {
      setSaveState("failed");
      setActionError(t(`${I18N}.saveFailed`));
    }
  };

  const handleNoteTypeChange = async (next: NoteType) => {
    if (next === noteType) return;
    const ok = await guardDirtySwitch();
    if (!ok) return;
    setNoteType(next);
    setCenterTab("note");
  };

  const signNote = async () => {
    setActionError(null);
    if (noteType === "HP") {
      if (!canAuthor || isHpSignedStatus(doc?.hpDraft?.status) || saveState === "saving") return;
      setSaveState("saving");
      try {
        const res = await signProviderHp(encounterId, { expectedVersion });
        applyDocumentation(res.documentation as ProviderWorkspaceDoc);
        setSaveState("saved");
        setSavedAtLabel(formatClockLabel(french));
      } catch {
        setSaveState("failed");
        setActionError(t(`${I18N}.signFailed`));
      }
      return;
    }
    if (!canEditNote || !activeNote || isProgressNoteFinal(activeNote.status) || saveState === "saving") {
      return;
    }
    try {
      // Persist first when dirty; never call sign if save failed.
      const version = dirtyRef.current ? await persistProgressDraft() : expectedVersion;
      if (version === null) return;
      setSaveState("saving");
      const res = await signProviderProgressNote(encounterId, {
        noteId: activeNote.noteId,
        expectedVersion: version,
      });
      applyDocumentation(res.documentation as ProviderWorkspaceDoc);
      setSaveState("saved");
      setSavedAtLabel(formatClockLabel(french));
    } catch {
      setSaveState("failed");
      setActionError(t(`${I18N}.signFailed`));
    }
  };

  const focusSoapSection = (key: ProgressSoapSectionKey) => {
    setFocusedSection(key);
    focusDictationTarget(`inp-prov-1b-soap-${key}`);
  };

  const applyTemplate = (template: ProgressSoapSections) => {
    if (!canEditNote) return;
    if (countProgressSoapCharacters(sectionsRef.current) > 0) {
      if (!window.confirm(t(`${I18N}.templates.overwriteConfirm`))) return;
    }
    commitSections(template);
    setCenterTab("note");
  };

  const recentLabs = useMemo(() => projectRecentLabsFromSynthesis(synthesis), [synthesis]);

  const suggestions = useMemo(
    () =>
      buildProviderSmartAssistSuggestions({
        sections,
        synthesis,
        orders,
        noteStatus: activeNote?.status ?? null,
      }),
    [activeNote?.status, orders, sections, synthesis]
  );

  const reviewItems = useMemo(
    () =>
      buildProviderSmartAssistReview({
        sections,
        noteStatus: activeNote?.status ?? null,
        noteType,
      }),
    [activeNote?.status, noteType, sections]
  );

  const insertSuggestion = (suggestion: ProviderSmartAssistSuggestion) => {
    if (!canEditNote || !suggestion.insertText.trim()) return;
    appendToSection(suggestion.kind === "lab" ? "OBJECTIVE" : "PLAN", suggestion.insertText);
  };

  const attachRecentLabs = () => {
    if (!canEditNote || !recentLabs.length) return;
    appendToSection(
      "OBJECTIVE",
      recentLabs.map((r) => `${r.label}: ${r.value}${r.trend ? ` ${r.trend}` : ""}.`).join(" ")
    );
    setShowAttachMenu(false);
  };

  const goToResults = () => onNavigateSection?.("results");
  const resultsHref = `${inpatientActiveWorkspacePath(encounterId)}?section=results`;
  const hpSigned = isHpSignedStatus(doc?.hpDraft?.status);

  const noteEntries = useMemo((): NoteEntry[] => {
    const entries: NoteEntry[] = [];
    if (doc?.hpDraft) {
      const hpStatus = hpSigned ? "SIGNED" : "DRAFT";
      const meta = progressNoteStatusMeta(hpStatus, t);
      entries.push({
        id: HP_LIST_ID,
        title: t(`${I18N}.noteTypes.HP`),
        status: hpStatus,
        statusLabel: meta.label,
        statusTone: meta.tone,
        when: String(doc.hpDraft.signedAt ?? "").slice(0, 10),
      });
    }
    for (const note of progressNotes) {
      const meta = progressNoteStatusMeta(note.status, t);
      entries.push({
        id: note.noteId,
        title: t(`${I18N}.noteTypes.PROGRESS`),
        status: note.status,
        statusLabel: meta.label,
        statusTone: meta.tone,
        when: note.serviceDate ?? "",
      });
    }
    return entries;
  }, [doc?.hpDraft, hpSigned, progressNotes, t]);

  const visibleNoteEntries = showAllNotes ? noteEntries : noteEntries.slice(0, COLLAPSED_NOTE_COUNT);
  const signedNotes = useMemo(
    () => progressNotes.filter((n) => isProgressNoteFinal(n.status)).slice(0, 4),
    [progressNotes]
  );

  const charCount = countProgressSoapCharacters(sections);
  const selectedListId = noteType === "HP" ? HP_LIST_ID : selectedNoteId;
  const canSign = noteType === "PROGRESS" ? canEditNote : canAuthor && !hpSigned;
  const busy = saveState === "saving";
  const orderItemCount = useMemo(
    () => orders.reduce((sum, order) => sum + order.items.length, 0),
    [orders]
  );

  const allergiesLine =
    (bootstrapAllergies ?? "").trim() || (allergiesSummary ?? "").trim() || null;

  const flowsheetVitals = synthesis?.vitals ?? [];
  const flowsheetIo = synthesis?.intakeOutput ?? null;
  const flowsheetIoRows = (
    [
      ["intake24", flowsheetIo?.intake24hMl],
      ["output24", flowsheetIo?.output24hMl],
      ["balance24", flowsheetIo?.balance24hMl],
    ] as Array<[string, number | null | undefined]>
  ).filter(([, value]) => value !== null && value !== undefined);
  const flowsheetsEmpty = flowsheetVitals.length === 0 && flowsheetIoRows.length === 0;

  const resultsLink = onNavigateSection ? (
    <button type="button" onClick={goToResults} style={GHOST_BTN}>
      {t(`${I18N}.recentLabs.viewAll`)}
    </button>
  ) : (
    <Link href={resultsHref} style={{ ...GHOST_BTN, textDecoration: "none" }}>
      {t(`${I18N}.recentLabs.viewAll`)}
    </Link>
  );

  const flowsheetResultsLink = onNavigateSection ? (
    <button type="button" onClick={goToResults} style={GHOST_BTN}>
      {t(`${I18N}.flowsheets.viewResults`)}
    </button>
  ) : (
    <Link href={resultsHref} style={{ ...GHOST_BTN, textDecoration: "none" }}>
      {t(`${I18N}.flowsheets.viewResults`)}
    </Link>
  );

  const autosaveLabel =
    saveState === "saving"
      ? t(`${I18N}.saving`)
      : saveState === "failed"
        ? t(`${I18N}.saveFailedStatus`)
        : savedAtLabel
          ? t(`${I18N}.savedAt`).replace("{time}", savedAtLabel)
          : null;

  if (loading) return <p style={META}>{t("common.loading")}</p>;

  return (
    <div data-testid="inp-prov-1b-workspace" style={{ display: "grid", gap: 10 }}>
      <header style={{ ...CARD, display: "grid", gap: 8 }}>
        <div style={ROW_BETWEEN}>
          <div>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              {t(`${I18N}.title`)}
            </h2>
            <p style={{ margin: "2px 0 0", ...META }}>{t(`${I18N}.subtitle`)}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span data-testid="inp-prov-1b-datetime" style={META}>
              {activeNote?.serviceDate || todayIso}
            </span>
            <span data-testid="inp-prov-1b-clock" style={META}>
              {clockLabel}
            </span>
            <label style={{ ...META, display: "flex", alignItems: "center", gap: 4 }}>
              {t(`${I18N}.noteType`)}
              <select
                data-testid="inp-prov-1b-note-type"
                value={noteType}
                onChange={(e) => void handleNoteTypeChange(e.target.value as NoteType)}
                style={{
                  padding: "4px 6px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  fontSize: 11,
                  fontFamily: "inherit",
                }}
              >
                {NOTE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`${I18N}.noteTypes.${type}`)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              data-testid="inp-prov-1b-sign-save"
              disabled={!canSign || busy}
              onClick={() => void signNote()}
              style={off(PRIMARY_BTN, !canSign || busy)}
            >
              {busy ? t(`${I18N}.signing`) : t(`${I18N}.signSave`)}
            </button>
            <button
              type="button"
              data-testid="inp-prov-1b-save-draft"
              disabled={!canEditNote || busy}
              onClick={() => void persistProgressDraft()}
              style={off({ ...GHOST_BTN, padding: "6px 12px", fontSize: 12 }, !canEditNote || busy)}
            >
              {t(`${I18N}.saveDraft`)}
            </button>
            {autosaveLabel ? (
              <span
                data-testid="inp-prov-1b-autosave"
                style={{
                  ...META,
                  color: saveState === "failed" ? "#b91c1c" : "#64748b",
                  fontWeight: saveState === "failed" ? 700 : 400,
                }}
                aria-live="polite"
              >
                {autosaveLabel}
              </span>
            ) : null}
          </div>
        </div>
        {!canAuthor ? (
          <p
            role="status"
            data-testid="inp-prov-1b-view-only"
            style={{ margin: 0, fontSize: 11, color: "#92400e", fontWeight: 600 }}
          >
            {t(`${I18N}.viewOnly`)}
          </p>
        ) : null}
        {loadFailed ? (
          <p role="alert" style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>
            {t(`${I18N}.loadFailed`)}
          </p>
        ) : null}
        {actionError ? (
          <p role="alert" style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>
            {actionError}
          </p>
        ) : null}
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(200px, 0.22fr) minmax(0, 1.1fr) minmax(240px, 0.58fr)",
          gap: 10,
          alignItems: "start",
        }}
      >
        <aside data-testid="inp-prov-1b-notes-navigator" style={{ ...CARD, padding: 0 }}>
          <div style={{ ...ROW_BETWEEN, padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 style={CARD_TITLE}>{t(`${I18N}.notes`)}</h3>
            <button
              type="button"
              data-testid="inp-prov-1b-new-note"
              disabled={!canAuthor || busy}
              onClick={() => void createProgressNote()}
              style={off(GHOST_BTN, !canAuthor || busy)}
            >
              {t(`${I18N}.newNote`)}
            </button>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {visibleNoteEntries.map((entry) => {
              const selected = entry.id === selectedListId;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    data-testid={`inp-prov-1b-note-row-${entry.id}`}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => void selectNote(entry.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 10px",
                      border: "none",
                      borderLeft: `3px solid ${selected ? "#2563eb" : "transparent"}`,
                      background: selected ? "#eff6ff" : "#fff",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: selected ? "#1d4ed8" : "#0f172a",
                        }}
                      >
                        {entry.title}
                      </span>
                      <span style={statusBadgeStyle(entry.statusTone)}>{entry.statusLabel}</span>
                    </span>
                    <span style={{ ...META, display: "block", marginTop: 2 }}>{entry.when}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {noteEntries.length > COLLAPSED_NOTE_COUNT ? (
            <div style={{ padding: "6px 10px", borderTop: "1px solid #e2e8f0" }}>
              <button
                type="button"
                data-testid="inp-prov-1b-show-all-notes"
                onClick={() => setShowAllNotes((v) => !v)}
                style={LINK_BTN}
              >
                {showAllNotes
                  ? t(`${I18N}.notes`)
                  : t(`${I18N}.showAllNotes`).replace("{n}", String(noteEntries.length))}
              </button>
            </div>
          ) : null}
        </aside>

        <section data-testid="inp-prov-1b-editor" style={{ ...CARD, padding: 0 }}>
          <div
            role="tablist"
            aria-label={t(`${I18N}.title`)}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              padding: "6px 10px",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            {CENTER_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={centerTab === tab}
                data-testid={`inp-prov-1b-tab-${tab}`}
                onClick={() => setCenterTab(tab)}
                style={tabStyle(centerTab === tab)}
              >
                {t(`${I18N}.tabs.${tab}`)}
              </button>
            ))}
          </div>

          <div
            data-testid="inp-prov-1b-toolbar"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              padding: "6px 10px",
              borderBottom: "1px solid #e2e8f0",
              position: "relative",
            }}
          >
            <button
              type="button"
              data-testid="inp-prov-1b-toolbar-attach"
              disabled={!canEditNote && !onNavigateSection}
              onClick={() => setShowAttachMenu((v) => !v)}
              style={off(GHOST_BTN, !canEditNote && !onNavigateSection)}
            >
              {t(`${I18N}.toolbar.attach`)}
            </button>
            <button
              type="button"
              data-testid="inp-prov-1b-toolbar-smart-assist"
              onClick={() => {
                setRightTab("smartAssist");
                setAssistTab("suggestions");
                assistRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              style={GHOST_BTN}
            >
              {t(`${I18N}.toolbar.smartAssist`)}
            </button>
            <button
              type="button"
              data-testid="inp-prov-1b-toolbar-insert"
              disabled={!canEditNote}
              onClick={() => setCenterTab("smartPhrases")}
              style={off(GHOST_BTN, !canEditNote)}
            >
              {t(`${I18N}.toolbar.insert`)}
            </button>
            <button
              type="button"
              data-testid="inp-prov-1b-toolbar-orders"
              onClick={() =>
                ordersStripRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              style={GHOST_BTN}
            >
              {t(`${I18N}.toolbar.orders`)}
            </button>
            <button
              type="button"
              data-testid="inp-prov-1b-toolbar-undo"
              disabled={!canEditNote || !undoStack.length}
              onClick={undo}
              style={off(GHOST_BTN, !canEditNote || !undoStack.length)}
            >
              {t(`${I18N}.toolbar.undo`)}
            </button>
            <button
              type="button"
              data-testid="inp-prov-1b-toolbar-redo"
              disabled={!canEditNote || !redoStack.length}
              onClick={redo}
              style={off(GHOST_BTN, !canEditNote || !redoStack.length)}
            >
              {t(`${I18N}.toolbar.redo`)}
            </button>
            {showAttachMenu ? (
              <div
                data-testid="inp-prov-1b-attach-menu"
                style={{
                  ...CARD,
                  position: "absolute",
                  top: 34,
                  left: 8,
                  zIndex: 5,
                  padding: 6,
                  display: "grid",
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  data-testid="inp-prov-1b-attach-labs"
                  disabled={!canEditNote || !recentLabs.length}
                  onClick={attachRecentLabs}
                  style={off(GHOST_BTN, !canEditNote || !recentLabs.length)}
                >
                  {t(`${I18N}.attachMenu.labs`)}
                </button>
                {onNavigateSection ? (
                  <button
                    type="button"
                    data-testid="inp-prov-1b-attach-results"
                    onClick={() => {
                      setShowAttachMenu(false);
                      goToResults();
                    }}
                    style={GHOST_BTN}
                  >
                    {t(`${I18N}.attachMenu.results`)}
                  </button>
                ) : (
                  <Link href={resultsHref} style={{ ...GHOST_BTN, textDecoration: "none" }}>
                    {t(`${I18N}.attachMenu.results`)}
                  </Link>
                )}
              </div>
            ) : null}
          </div>

          <div style={{ padding: "8px 10px" }}>
            {noteType === "PROGRESS" && centerTab === "note" ? (
              <div style={{ display: "grid", gap: 8 }}>
                {!activeNote ? <p style={{ margin: 0, ...META }}>{t(`${I18N}.noActiveNote`)}</p> : null}
                {PROGRESS_SOAP_SECTION_KEYS.map((key) => (
                  <div key={key} style={SOAP_SECTION}>
                    <DictationFieldLabel
                      label={t(`${I18N}.soap.${key}`)}
                      dictationTargetId={`inp-prov-1b-soap-${key}`}
                      dictationLabel={t(`${I18N}.dictateInto.${key}`)}
                      readOnly={!canEditNote}
                      readOnlyLabel={t(`${I18N}.viewOnly`)}
                      alignEnd
                      prominent
                    />
                    <textarea
                      id={`inp-prov-1b-soap-${key}`}
                      data-testid={`inp-prov-1b-soap-${key}`}
                      value={sections[key]}
                      rows={4}
                      disabled={!canEditNote}
                      onFocus={() => setFocusedSection(key)}
                      onChange={(e) => commitSections({ ...sectionsRef.current, [key]: e.target.value })}
                      style={TEXTAREA}
                      data-dictation-ready={canEditNote ? "true" : undefined}
                    />
                  </div>
                ))}
                <div
                  data-testid="inp-prov-1b-editor-footer"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: 6,
                  }}
                >
                  <span style={META}>{t(`${I18N}.characters`).replace("{n}", String(charCount))}</span>
                </div>
              </div>
            ) : null}

            {noteType === "PROGRESS" && centerTab === "templates" ? (
              <div data-testid="inp-prov-1b-templates" style={{ display: "grid", gap: 6 }}>
                <h3 style={CARD_TITLE}>{t(`${I18N}.templates.title`)}</h3>
                <button
                  type="button"
                  data-testid="inp-prov-1b-template-blank"
                  disabled={!canEditNote}
                  onClick={() => applyTemplate(emptyProgressSoapSections())}
                  style={off(GHOST_BTN, !canEditNote)}
                >
                  {t(`${I18N}.templates.blankSoap`)}
                </button>
                <button
                  type="button"
                  data-testid="inp-prov-1b-template-standard-daily"
                  disabled={!canEditNote}
                  onClick={() => applyTemplate(standardDailyTemplate(french))}
                  style={off(GHOST_BTN, !canEditNote)}
                >
                  {t(`${I18N}.templates.standardDaily`)}
                </button>
              </div>
            ) : null}

            {noteType === "PROGRESS" && centerTab === "smartPhrases" ? (
              <div data-testid="inp-prov-1b-smart-phrases" style={{ display: "grid", gap: 6 }}>
                <h3 style={CARD_TITLE}>{t(`${I18N}.smartPhrases.title`)}</h3>
                <p style={{ margin: 0, ...META }}>{t(`${I18N}.smartPhrases.subtitle`)}</p>
                <p style={{ margin: 0, ...META }}>{t(`${I18N}.smartPhrases.appendHint`)}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {PLAN_STICKY_OPTIONS.map((option) => {
                    const display = french ? option.displayFr : option.display;
                    return (
                      <button
                        key={option.code}
                        type="button"
                        data-testid={`inp-prov-1b-phrase-${option.code}`}
                        disabled={!canEditNote}
                        onClick={() => appendToSection("PLAN", `${display}.`)}
                        style={off(GHOST_BTN, !canEditNote)}
                      >
                        {display}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {noteType === "PROGRESS" && centerTab === "flowsheets" ? (
              <div data-testid="inp-prov-1b-flowsheets" style={{ display: "grid", gap: 6 }}>
                <h3 style={CARD_TITLE}>{t(`${I18N}.flowsheets.title`)}</h3>
                {flowsheetsEmpty ? (
                  <p style={{ margin: 0, ...META }}>{t(`${I18N}.flowsheets.empty`)}</p>
                ) : null}
                {flowsheetVitals.length ? (
                  <table
                    data-testid="inp-prov-1b-flowsheets-vitals"
                    style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}
                  >
                    <caption style={{ ...META, textAlign: "left", paddingBottom: 2 }}>
                      {t(`${I18N}.flowsheets.vitalsTitle`)}
                    </caption>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#64748b" }}>
                        <th style={{ padding: "2px 4px", fontWeight: 600 }}>
                          {t(`${I18N}.flowsheets.measure`)}
                        </th>
                        <th style={{ padding: "2px 4px", fontWeight: 600 }}>
                          {t(`${I18N}.flowsheets.current`)}
                        </th>
                        <th style={{ padding: "2px 4px", fontWeight: 600 }}>
                          {t(`${I18N}.flowsheets.previous`)}
                        </th>
                        <th style={{ padding: "2px 4px", fontWeight: 600 }}>
                          {t(`${I18N}.flowsheets.trend`)}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {flowsheetVitals.map((row) => (
                        <tr
                          key={row.key}
                          data-testid={`inp-prov-1b-flowsheets-vital-${row.key}`}
                          style={{ color: row.abnormal ? "#9a3412" : "#334155" }}
                        >
                          <td style={{ padding: "2px 4px", fontWeight: 600 }}>{row.label}</td>
                          <td style={{ padding: "2px 4px" }}>{row.current ?? "—"}</td>
                          <td style={{ padding: "2px 4px" }}>{row.previous ?? "—"}</td>
                          <td style={{ padding: "2px 4px" }}>{row.trend24h || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
                {flowsheetIoRows.length ? (
                  <dl
                    data-testid="inp-prov-1b-flowsheets-io"
                    style={{ margin: 0, display: "grid", gap: 3, fontSize: 11 }}
                  >
                    <dt style={{ ...META, margin: 0 }}>{t(`${I18N}.flowsheets.ioTitle`)}</dt>
                    {flowsheetIoRows.map(([key, value]) => (
                      <dd key={key} style={{ margin: 0, display: "flex", gap: 6 }}>
                        <span style={{ color: "#64748b", minWidth: 96 }}>
                          {t(`${I18N}.flowsheets.${key}`)}
                        </span>
                        <span style={{ color: "#0f172a", fontWeight: 600 }}>{`${value} mL`}</span>
                      </dd>
                    ))}
                  </dl>
                ) : null}
                {flowsheetResultsLink}
              </div>
            ) : null}

            {noteType === "PROGRESS" && centerTab === "dictate" ? (
              <div data-testid="inp-prov-1b-dictate" style={{ display: "grid", gap: 8 }}>
                <p style={{ margin: 0, ...META }}>
                  {t(`${I18N}.dictate.currentTarget`).replace(
                    "{section}",
                    t(`${I18N}.soap.${focusedSection}`)
                  )}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {PROGRESS_SOAP_SECTION_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      data-testid={`inp-prov-1b-dictate-target-${key}`}
                      disabled={!canEditNote}
                      onClick={() => focusSoapSection(key)}
                      style={off(
                        {
                          ...GHOST_BTN,
                          borderColor: focusedSection === key ? "#93c5fd" : "#e2e8f0",
                          background: focusedSection === key ? "#eff6ff" : "#fff",
                          color: focusedSection === key ? "#1d4ed8" : "#334155",
                        },
                        !canEditNote
                      )}
                    >
                      {t(`${I18N}.dictate.targetAction`).replace("{section}", t(`${I18N}.soap.${key}`))}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {noteType === "HP" ? (
              <div data-testid="inp-prov-1b-hp-host" style={{ display: "grid", gap: 8 }}>
                <InpatientProviderWorkspacePanel
                  mode="historyPhysical"
                  encounterId={encounterId}
                  facilityId={facilityId}
                  patientId={patientId}
                  canProviderWrite={canAuthor}
                  canDocumentDiagnoses={canAuthor}
                  isLocked={isLocked || !canAuthor}
                />
              </div>
            ) : null}
          </div>
        </section>

        <div style={{ display: "grid", gap: 10 }}>
          <section ref={assistRef} style={{ ...CARD, padding: 0 }}>
            <div
              role="tablist"
              style={{
                display: "flex",
                gap: 4,
                padding: "6px 10px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              {(["smartAssist", "patientContext"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={rightTab === tab}
                  data-testid={`inp-prov-1b-right-tab-${tab}`}
                  onClick={() => setRightTab(tab)}
                  style={tabStyle(rightTab === tab)}
                >
                  {t(`${I18N}.rightTabs.${tab}`)}
                </button>
              ))}
            </div>

            {rightTab === "smartAssist" ? (
              <div data-testid="inp-prov-1b-smart-assist" style={{ padding: "8px 10px" }}>
                <div style={{ ...ROW_BETWEEN, marginBottom: 6 }}>
                  <h3 style={CARD_TITLE}>{t(`${I18N}.smartAssist.title`)}</h3>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: 9999,
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        color: "#1d4ed8",
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    >
                      {t(`${I18N}.smartAssist.beta`)}
                    </span>
                    <button
                      type="button"
                      data-testid="inp-prov-1b-assist-regenerate"
                      onClick={() => void loadWorkspace()}
                      style={GHOST_BTN}
                    >
                      {t(`${I18N}.smartAssist.regenerate`)}
                    </button>
                  </span>
                </div>
                <div role="tablist" style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {(["suggestions", "review"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={assistTab === tab}
                      data-testid={`inp-prov-1b-assist-tab-${tab}`}
                      onClick={() => setAssistTab(tab)}
                      style={tabStyle(assistTab === tab)}
                    >
                      {t(`${I18N}.smartAssist.${tab}`)}
                    </button>
                  ))}
                </div>
                {assistTab === "suggestions" ? (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                    {suggestions.length === 0 ? (
                      <li style={META}>{t(`${I18N}.smartAssist.empty`)}</li>
                    ) : null}
                    {suggestions.map((suggestion) => (
                      <li
                        key={suggestion.id}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          padding: "6px 8px",
                          background: "#f8fafc",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            marginBottom: 4,
                            padding: "1px 6px",
                            borderRadius: 9999,
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            color: "#1d4ed8",
                            fontSize: 9,
                            fontWeight: 700,
                          }}
                        >
                          {t(`${I18N}.smartAssist.kinds.${suggestion.kind}`)}
                        </span>
                        <span
                          style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#0f172a" }}
                        >
                          {suggestion.title}
                        </span>
                        <span style={{ ...META, display: "block" }}>{suggestion.rationale}</span>
                        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                          <button
                            type="button"
                            data-testid={`inp-prov-1b-assist-preview-${suggestion.id}`}
                            onClick={() => setPreviewText(suggestion.insertText)}
                            style={GHOST_BTN}
                          >
                            {t(`${I18N}.smartAssist.preview`)}
                          </button>
                          {suggestion.insertText.trim() ? (
                            <button
                              type="button"
                              data-testid={`inp-prov-1b-assist-insert-${suggestion.id}`}
                              disabled={!canEditNote}
                              onClick={() => insertSuggestion(suggestion)}
                              style={off(GHOST_BTN, !canEditNote)}
                            >
                              {t(`${I18N}.smartAssist.insert`)}
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 4 }}>
                    {reviewItems.length === 0 ? (
                      <li style={META}>{t(`${I18N}.smartAssist.reviewEmpty`)}</li>
                    ) : null}
                    {reviewItems.map((item) => (
                      <li
                        key={item.id}
                        data-review-code={item.code}
                        style={{
                          fontSize: 11,
                          color: item.severity === "warn" ? "#92400e" : "#475569",
                        }}
                      >
                        {item.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div data-testid="inp-prov-1b-patient-context" style={{ padding: "8px 10px" }}>
                <div style={ROW_BETWEEN}>
                  <h3 style={CARD_TITLE}>{t(`${I18N}.patientContext.title`)}</h3>
                  {onNavigateSection ? (
                    <button
                      type="button"
                      data-testid="inp-prov-1b-context-view-more"
                      onClick={() => onNavigateSection("summary")}
                      style={GHOST_BTN}
                    >
                      {t(`${I18N}.patientContext.viewMore`)}
                    </button>
                  ) : null}
                </div>
                <dl style={{ margin: "6px 0 0", display: "grid", gap: 3, fontSize: 11 }}>
                  {(
                    [
                      [`${I18N}.patientContext.allergies`, allergiesLine],
                      [`${I18N}.patientContext.codeStatus`, synthesis?.overview?.codeStatus],
                      [`${I18N}.patientContext.isolation`, synthesis?.overview?.isolation],
                      [`${I18N}.patientContext.attending`, synthesis?.overview?.attending],
                      [`${I18N}.patientContext.primaryDx`, synthesis?.overview?.primaryDiagnosis],
                    ] as Array<[string, string | null | undefined]>
                  ).map(([labelKey, value]) => (
                    <div key={labelKey} style={{ display: "flex", gap: 6 }}>
                      <dt style={{ margin: 0, color: "#64748b", minWidth: 84 }}>{t(labelKey)}</dt>
                      <dd style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>
                        {String(value ?? "").trim() || t(`${I18N}.patientContext.notDocumented`)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </section>

          <PanelCard testId="inp-prov-1b-recent-labs" title={t(`${I18N}.recentLabs.title`)} action={resultsLink}>
            <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 3 }}>
              {recentLabs.length === 0 ? <li style={META}>{t(`${I18N}.recentLabs.empty`)}</li> : null}
              {recentLabs.map((row) => {
                const hint = labAbnormalHint(row, t);
                return (
                  <li
                    key={row.label}
                    style={{ display: "flex", justifyContent: "space-between", fontSize: 11, gap: 6 }}
                  >
                    <span style={{ color: "#475569" }}>{row.label}</span>
                    <span style={{ color: row.abnormal ? "#9a3412" : "#0f172a", fontWeight: 600 }}>
                      {row.value}
                      {row.trend ? ` ${row.trend}` : ""}
                      {hint ? ` · ${hint}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </PanelCard>

          <PanelCard
            testId="inp-prov-1b-recent-notes"
            title={t(`${I18N}.recentNotes.title`)}
            action={
              noteEntries.length > COLLAPSED_NOTE_COUNT && !showAllNotes ? (
                <button type="button" onClick={() => setShowAllNotes(true)} style={GHOST_BTN}>
                  {t(`${I18N}.recentNotes.viewAll`)}
                </button>
              ) : null
            }
          >
            <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 3 }}>
              {!signedNotes.length && !hpSigned ? (
                <li style={META}>{t(`${I18N}.recentNotes.empty`)}</li>
              ) : null}
              {hpSigned ? (
                <li>
                  <button
                    type="button"
                    onClick={() => void selectNote(HP_LIST_ID)}
                    style={{ ...LINK_BTN, fontWeight: 600 }}
                  >
                    {t(`${I18N}.noteTypes.HP`)} · {t(`${I18N}.signed`)}
                  </button>
                </li>
              ) : null}
              {signedNotes.map((note) => (
                <li key={note.noteId}>
                  <button
                    type="button"
                    onClick={() => void selectNote(note.noteId)}
                    style={{ ...LINK_BTN, fontWeight: 600 }}
                  >
                    {t(`${I18N}.noteTypes.PROGRESS`)} · {note.serviceDate}
                  </button>
                </li>
              ))}
            </ul>
          </PanelCard>
        </div>
      </div>

      <PanelCard
        testId="inp-prov-1b-encounter-orders"
        panelRef={ordersStripRef}
        title={`${t(`${I18N}.encounterOrders.title`)} · ${t(`${I18N}.encounterOrders.count`).replace("{n}", String(orderItemCount))}`}
        action={
          <button
            type="button"
            data-testid="inp-prov-1b-add-order"
            disabled={!canAuthor}
            onClick={() => setShowCreateOrder(true)}
            style={off(GHOST_BTN, !canAuthor)}
          >
            {t(`${I18N}.encounterOrders.addOrder`)}
          </button>
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {orders.length === 0 ? (
            <span style={META}>{t(`${I18N}.encounterOrders.empty`)}</span>
          ) : null}
          {orders.flatMap((order) =>
            order.items.map((item) => {
              const metaParts = [
                item.priority,
                item.route,
                item.frequencyCode || item.frequency,
                item.strength || item.dose,
                item.createdAt ? item.createdAt.slice(0, 10) : null,
              ].filter(Boolean);
              return (
                <article
                  key={item.id}
                  data-testid={`inp-prov-1b-order-card-${item.id}`}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "5px 8px",
                    background: "#f8fafc",
                    minWidth: 150,
                  }}
                >
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#0f172a" }}>
                    {item.displayLabel || item.catalogItemType}
                  </span>
                  <span style={{ ...META, display: "block" }}>{item.status}</span>
                  {metaParts.length ? (
                    <span style={{ ...META, display: "block" }}>{metaParts.join(" · ")}</span>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </PanelCard>

      {previewText !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(`${I18N}.previewTitle`)}
          data-testid="inp-prov-1b-preview"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div style={{ ...CARD, maxWidth: 420, width: "100%" }}>
            <h3 style={CARD_TITLE}>{t(`${I18N}.previewTitle`)}</h3>
            <p style={{ margin: "6px 0", fontSize: 12, color: "#0f172a", whiteSpace: "pre-wrap" }}>
              {previewText}
            </p>
            <button type="button" onClick={() => setPreviewText(null)} style={GHOST_BTN}>
              {t(`${I18N}.closePreview`)}
            </button>
          </div>
        </div>
      ) : null}

      {showCreateOrder ? (
        <CreateOrderModal
          key={`${encounterId}-${ordersRefresh}`}
          encounterId={encounterId}
          facilityId={facilityId}
          canPrescribe={canAuthor}
          medicationOrderMode={inpatientFacilityMedicationOrderMode()}
          onClose={() => setShowCreateOrder(false)}
          onSuccess={() => {
            setShowCreateOrder(false);
            setOrdersRefresh((n) => n + 1);
          }}
        />
      ) : null}
    </div>
  );
}
