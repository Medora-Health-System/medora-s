"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { InpatientNursingAssessmentSave, InpatientNursingAssessmentV1 } from "@medora/shared";
import { resolveInpatientNursingClinicalOccurredAt } from "@medora/shared";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import {
  NursingDocumentationBoard,
  type NursingBoardColumn,
  type NursingBoardRow,
  type NursingBoardValue,
} from "@/features/clinical-documentation/NursingDocumentationBoard";
import { ClinicalDocumentationHub } from "@/features/clinical-documentation/ClinicalDocumentationHub";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  fetchClinicalDocumentationEntries,
  type ClinicalDocumentationEntryRow,
} from "@/lib/clinicalDocumentationApi";
import { useI18n } from "@/lib/i18n";
import { INPATIENT_NURSING_BOARD_ROWS } from "./inpatientNursingBoardRowsInp1b6";
import { projectClinicalDocumentationSummaryLines } from "./projectNursingClinicalDocumentationSummary";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDatetimeValue(local: string): string {
  const ms = Date.parse(local);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : new Date().toISOString();
}

const NARRATIVE_MAX = 8000;
const IO_HUB_CARD_ID = "io_intake_output";
const DEVICES_HUB_CARD_ID = "peripheral_iv_assessment";

const emptyDraft = (): InpatientNursingAssessmentSave => ({
  status: "DRAFT",
  assessmentType: "REASSESSMENT",
  orientation: [],
  ivAccess: [],
  linesDrainsDevices: [],
  structuredFindings: {},
  sectionStatus: {},
  significantConcerns: [],
  clinicalDocumentedAt: new Date().toISOString(),
});

type IvActiveLite = { site: string; gauge: string };

function parseIvActive(raw: unknown): IvActiveLite[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const a = (raw as { active?: unknown }).active;
  if (!Array.isArray(a)) return [];
  const out: IvActiveLite[] = [];
  for (const row of a) {
    if (!row || typeof row !== "object") continue;
    const x = row as Record<string, unknown>;
    out.push({
      site: typeof x.site === "string" ? x.site : "",
      gauge: typeof x.gauge === "string" ? x.gauge : "",
    });
  }
  return out;
}

export function InpatientNursingAssessmentPanel({
  encounterId,
  facilityId,
  patientId: _patientId,
  isLocked,
  onSaved,
}: {
  encounterId: string;
  facilityId: string;
  patientId: string;
  isLocked: boolean;
  onSaved: () => void | Promise<void>;
  /** Kept for workspace API compatibility; Assessment no longer mounts a context rail. */
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
}) {
  const { language, t } = useI18n();
  const french = language === "fr";
  const [history, setHistory] = useState<InpatientNursingAssessmentV1[]>([]);
  const [draft, setDraft] = useState<InpatientNursingAssessmentSave | null>(null);
  const [copied, setCopied] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hubOpen, setHubOpen] = useState(false);
  const [hubFocusCardId, setHubFocusCardId] = useState<string | null>(null);
  const [clinicalEntries, setClinicalEntries] = useState<ClinicalDocumentationEntryRow[]>([]);
  const [ivActive, setIvActive] = useState<IvActiveLite[]>([]);

  const load = useCallback(async () => {
    const response = await apiFetch(
      `/encounters/${encodeURIComponent(encounterId)}/inpatient-nursing-assessment-events`,
      { facilityId },
    );
    setHistory(
      (asApiObject<{ entries?: { assessment: InpatientNursingAssessmentV1 }[] }>(response)?.entries ?? []).map(
        (entry) => entry.assessment,
      ),
    );
  }, [encounterId, facilityId]);

  const loadClinicalProjections = useCallback(async () => {
    const [docsSettled, ivSettled] = await Promise.allSettled([
      fetchClinicalDocumentationEntries(encounterId, facilityId),
      apiFetch(`/encounters/${encodeURIComponent(encounterId)}/iv-access`, { facilityId }),
    ]);
    if (docsSettled.status === "fulfilled") {
      setClinicalEntries(docsSettled.value.entries ?? []);
    } else {
      setClinicalEntries([]);
    }
    if (ivSettled.status === "fulfilled") {
      setIvActive(parseIvActive(ivSettled.value));
    } else {
      setIvActive([]);
    }
  }, [encounterId, facilityId]);

  useEffect(() => {
    void load().catch(() => setMessage(t("inpatientNursingAssessmentInp1b.loadError")));
    void loadClinicalProjections().catch(() => {
      /* projection-only; assessment board remains usable */
    });
  }, [load, loadClinicalProjections, t]);

  const columns: NursingBoardColumn[] = useMemo(
    () =>
      history.map((assessment) => ({
        id: assessment.sessionId,
        occurredAt: resolveInpatientNursingClinicalOccurredAt(assessment),
        status: assessment.status,
        author: assessment.authorDisplayName,
        values: toBoardValues(assessment),
      })),
    [history],
  );

  function begin(copyPrevious: boolean) {
    const latest = history.at(-1);
    if (!copyPrevious || !latest) {
      setDraft(emptyDraft());
      setCopied(new Set());
      setMessage(t("inpatientNursingAssessmentInp1b.newNotice"));
    } else {
      const {
        version: _version,
        sessionId: _sessionId,
        authoredAt: _authoredAt,
        authorUserId: _authorUserId,
        authorDisplayName: _authorDisplayName,
        authorRole: _authorRole,
        clinicalDocumentedAt: _clinicalDocumentedAt,
        ...clinical
      } = latest;
      setDraft({
        ...clinical,
        status: "DRAFT",
        assessmentType: "REASSESSMENT",
        structuredFindings: { ...clinical.structuredFindings },
        clinicalDocumentedAt: new Date().toISOString(),
      });
      setCopied(
        new Set(
          Object.keys(toBoardValues(latest)).filter(
            (key) => toBoardValues(latest)[key] !== undefined && toBoardValues(latest)[key] !== "",
          ),
        ),
      );
      setMessage(t("inpatientNursingAssessmentInp1b.copiedNotice"));
    }
  }

  function patch(id: string, value: NursingBoardValue) {
    setDraft((current) => (current ? patchAssessment(current, id, value) : current));
    setCopied((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      await apiFetch(`/encounters/${encodeURIComponent(encounterId)}/inpatient-nursing-assessments`, {
        method: "POST",
        facilityId,
        body: JSON.stringify({ ...draft, status: "SAVED" }),
      });
      setDraft(null);
      setCopied(new Set());
      setMessage(t("inpatientNursingAssessmentInp1b.saved"));
      await load();
      await loadClinicalProjections();
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function refreshAfterHub() {
    await loadClinicalProjections();
    await onSaved();
  }

  function openHub(cardId?: string | null) {
    setHubFocusCardId(cardId ?? null);
    setHubOpen(true);
  }

  const latest = history.at(-1);
  const summarySource = latest ? toBoardValues(latest) : {};
  const rows = useMemo(() => localizeRows(INPATIENT_NURSING_BOARD_ROWS, french, t), [french, t]);
  const boardRows = useMemo(
    () =>
      rows.filter((row) => {
        const canonical = INPATIENT_NURSING_BOARD_ROWS.find((r) => r.id === row.id);
        return canonical?.group !== "Narrative";
      }),
    [rows],
  );
  const assessmentSummaryLines = useMemo(() => buildSummaryLines(summarySource, rows), [summarySource, rows]);
  const clinicalSummaryLines = useMemo(
    () =>
      projectClinicalDocumentationSummaryLines({
        entries: clinicalEntries,
        ivActive,
        french,
      }),
    [clinicalEntries, ivActive, french],
  );
  const summaryLines = useMemo(
    () => [...assessmentSummaryLines, ...clinicalSummaryLines],
    [assessmentSummaryLines, clinicalSummaryLines],
  );
  const context = latest ? (
    <>
      {t("inpatientNursingAssessmentInp2c.board.lastDocumented")}{" "}
      {new Date(resolveInpatientNursingClinicalOccurredAt(latest)).toLocaleString()}
      {" · "}
      {t("inpatientNursingAssessmentInp2c.board.documentedBy")} {latest.authorDisplayName}
    </>
  ) : (
    <>{t("inpatientNursingAssessmentInp2c.board.noSavedYet")}</>
  );

  const boardLabels = {
    clinicalFinding: t("inpatientNursingAssessmentInp2c.board.clinicalFinding"),
    noSaved: t("inpatientNursingAssessmentInp2c.board.noSaved"),
    addColumn: t("inpatientNursingAssessmentInp2c.board.addColumn"),
    copyPrevious: t("inpatientNursingAssessmentInp2c.board.copyPrevious"),
    save: t("inpatientNursingAssessmentInp2c.board.save"),
    discard: t("inpatientNursingAssessmentInp2c.board.discard"),
    notCharted: t("inpatientNursingAssessmentInp2c.board.notCharted"),
    currentSaved: t("inpatientNursingAssessmentInp2c.board.currentSaved"),
    saved: t("inpatientNursingAssessmentInp2c.board.saved"),
    draft: t("inpatientNursingAssessmentInp2c.board.draft"),
    historical: t("inpatientNursingAssessmentInp2c.board.historical"),
  };
  const noteText = draft?.narrative ?? latest?.narrative ?? "";
  const noteEditable = Boolean(draft) && !isLocked;

  return (
    <div data-testid="inpatient-native-nursing-assessment" style={{ width: "100%", minWidth: 0 }}>
      {hubOpen ? (
        <ClinicalDocumentationHub
          careSetting="INPATIENT"
          encounterId={encounterId}
          facilityId={facilityId}
          focusedCardId={hubFocusCardId}
          onClose={() => {
            setHubOpen(false);
            setHubFocusCardId(null);
            void refreshAfterHub();
          }}
          onEntriesChanged={() => {
            void refreshAfterHub();
          }}
        />
      ) : null}
      <div data-testid="nursing-assessment-layout" style={{ width: "100%", minWidth: 0 }}>
        <div
          data-testid="nursing-assessment-columns"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 400px)",
            gap: 16,
            alignItems: "start",
            width: "100%",
            minWidth: 0,
          }}
        >
          <div style={{ minWidth: 0, width: "100%" }}>
            <NursingDocumentationBoard
              title={t("inpatientNursingAssessmentInp1b.title")}
              context={context}
              rows={boardRows}
              columns={columns}
              draft={draft ? toBoardValues(draft) : null}
              draftTime={draft?.clinicalDocumentedAt ?? undefined}
              copiedFieldIds={copied}
              copiedVerifyLabel={t("inpatientNursingAssessmentInp2c.board.copiedVerify")}
              readOnly={isLocked}
              busy={busy}
              onChange={patch}
              onNew={() => begin(false)}
              onCopyPrevious={() => begin(true)}
              onSave={() => void save()}
              onDiscard={() => {
                setDraft(null);
                setCopied(new Set());
                setMessage("");
              }}
              labels={boardLabels}
              headerActions={
                <button
                  type="button"
                  data-testid="inpatient-clinical-documentation-open"
                  onClick={() => openHub(null)}
                >
                  {t("inpatientNursingAssessmentInp2c.board.openHub")}
                </button>
              }
            />
          </div>
          <aside
            aria-label={t("inpatientNursingAssessmentInp2c.board.summaryLatest")}
            data-testid="nursing-summary-sidebar"
            style={{
              ...MEDORA_CARD_SHELL,
              borderRadius: MEDORA_CARD_SHELL.radius,
              padding: "10px 12px",
              position: "sticky",
              top: 72,
              maxHeight: "calc(100vh - 140px)",
              overflowY: "auto",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>
              {t("inpatientNursingAssessmentInp2c.board.summaryLatest")}
            </h3>
            <SectionSummary
              lines={summaryLines}
              emptyLabel={t("inpatientNursingAssessmentInp2c.board.summaryEmpty")}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <button type="button" data-testid="nursing-open-io" onClick={() => openHub(IO_HUB_CARD_ID)}>
                {t("inpatientNursingAssessmentInp2c.board.openIo")}
              </button>
              <button
                type="button"
                data-testid="nursing-open-devices"
                onClick={() => openHub(DEVICES_HUB_CARD_ID)}
              >
                {t("inpatientNursingAssessmentInp2c.board.openDevices")}
              </button>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 11, color: "#64748b" }}>
              {t("inpatientNursingAssessmentInp2c.board.authorityNote")}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#64748b" }}>
              {t("inpatientNursingAssessmentInp2c.board.hubHint")}
            </p>
          </aside>
        </div>
        <section
          data-testid="nursing-note-section"
          style={{
            ...MEDORA_CARD_SHELL,
            borderRadius: MEDORA_CARD_SHELL.radius,
            marginTop: 16,
            padding: "12px 14px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>{t("inpatientNursingAssessmentInp2c.board.noteTitle")}</h3>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
            {t("inpatientNursingAssessmentInp2c.board.noteHint")}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 280px)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div>
              <textarea
                data-testid="nursing-note-textarea"
                aria-label={t("inpatientNursingAssessmentInp2c.board.noteTitle")}
                maxLength={NARRATIVE_MAX}
                readOnly={!noteEditable}
                value={noteText}
                onChange={(event) => patch("narrative", event.target.value.slice(0, NARRATIVE_MAX))}
                style={{
                  width: "100%",
                  minHeight: 120,
                  boxSizing: "border-box",
                  padding: 10,
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  fontSize: 13,
                  background: noteEditable ? "#fff" : "#f8fafc",
                }}
              />
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
                {noteText.length} / {NARRATIVE_MAX}
              </p>
              {!draft && !isLocked ? (
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
                  {t("inpatientNursingAssessmentInp2c.board.noteNeedDraft")}
                </p>
              ) : null}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {draft && !isLocked ? (
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                  <span>{t("inpatientNursingAssessmentInp2c.board.assessmentTime")}</span>
                  <input
                    data-testid="nursing-clinical-documented-at"
                    type="datetime-local"
                    value={draft.clinicalDocumentedAt ? toLocalDatetimeValue(draft.clinicalDocumentedAt) : ""}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, clinicalDocumentedAt: fromLocalDatetimeValue(event.target.value) }
                          : current,
                      )
                    }
                  />
                </label>
              ) : null}
              {!isLocked && draft ? (
                <button
                  type="button"
                  data-testid="nursing-note-save"
                  disabled={busy}
                  onClick={() => void save()}
                >
                  {t("inpatientNursingAssessmentInp2c.board.noteSave")}
                </button>
              ) : null}
            </div>
          </div>
        </section>
        {message ? <p role="status">{message}</p> : null}
        {isLocked ? <p role="status">{t("inpatientNursingAssessmentInp2c.board.readOnly")}</p> : null}
      </div>
    </div>
  );
}

function toBoardValues(value: InpatientNursingAssessmentSave): Record<string, NursingBoardValue> {
  return {
    ...value.structuredFindings,
    narrative: value.narrative,
    painScore: value.pain?.score ?? value.structuredFindings?.painScore,
    painLocation: value.pain?.location ?? value.structuredFindings?.painLocation,
    painIntervention: value.pain?.intervention ?? value.structuredFindings?.painIntervention,
    airway: value.airway?.code ?? value.structuredFindings?.airway,
    fallRisk: value.fallRisk?.level ?? value.structuredFindings?.fallRisk,
    mobility: value.mobility?.code ?? value.structuredFindings?.mobility,
    levelOfConsciousness: value.mentalStatus?.code ?? value.structuredFindings?.levelOfConsciousness,
    speech: value.speech?.code ?? value.structuredFindings?.speech,
  };
}

function patchAssessment(
  current: InpatientNursingAssessmentSave,
  id: string,
  value: NursingBoardValue,
): InpatientNursingAssessmentSave {
  if (id === "narrative") return { ...current, narrative: String(value ?? "") };
  const next: InpatientNursingAssessmentSave = {
    ...current,
    structuredFindings: { ...current.structuredFindings, [id]: value ?? "" },
  };
  if (id === "painScore" && typeof value === "number") next.pain = { ...current.pain, score: value };
  if (id === "painLocation") next.pain = { ...current.pain, score: current.pain?.score ?? 0, location: String(value ?? "") };
  if (id === "painIntervention") {
    next.pain = { ...current.pain, score: current.pain?.score ?? 0, intervention: String(value ?? "") };
  }
  if (id === "airway") next.airway = { code: String(value ?? "") };
  if (id === "fallRisk" && ["LOW", "MODERATE", "HIGH"].includes(String(value))) {
    next.fallRisk = { level: value as "LOW" | "MODERATE" | "HIGH" };
  }
  if (id === "mobility") next.mobility = { code: String(value ?? "") };
  if (id === "levelOfConsciousness") next.mentalStatus = { code: String(value ?? "") };
  if (id === "speech") next.speech = { code: String(value ?? "") };
  return next;
}

function localizeRows(
  rows: readonly NursingBoardRow[],
  french: boolean,
  t: (key: string) => string,
): NursingBoardRow[] {
  return rows.map((row) => ({
    ...row,
    label: french
      ? t(`inpatientNursingAssessmentInp1b.fields.${row.id}`) !== `inpatientNursingAssessmentInp1b.fields.${row.id}`
        ? t(`inpatientNursingAssessmentInp1b.fields.${row.id}`)
        : row.label
      : row.label,
    group: french ? (GROUP_FR[row.group] ?? row.group) : row.group,
    options: row.options?.map((option) => ({
      ...option,
      label: french
        ? t(`inpatientNursingAssessmentInp1b.codes.${option.value}`) !==
          `inpatientNursingAssessmentInp1b.codes.${option.value}`
          ? t(`inpatientNursingAssessmentInp1b.codes.${option.value}`)
          : option.label
        : option.label,
    })),
  }));
}

const GROUP_FR: Record<string, string> = {
  Neurological: "Neurologique",
  Pain: "Douleur",
  Respiratory: "Respiratoire",
  Cardiovascular: "Cardiovasculaire",
  Gastrointestinal: "Gastro-intestinal",
  Genitourinary: "Génito-urinaire",
  "Skin / Wounds": "Peau / plaies",
  "Mobility / Fall": "Mobilité / chute",
  "Lines / Drains / Devices": "Voies / drains / dispositifs",
  Safety: "Sécurité",
  "Nutrition / Hydration": "Nutrition / hydratation",
  "Intake & Output": "Entrées et sorties",
  "Education / Communication": "Éducation / communication",
  Psychosocial: "Psychosocial",
  Narrative: "Note narrative",
};

/** Concise clinical lines per group — omit empty sections (no "Not charted" spam). */
export function buildSummaryLines(
  values: Record<string, NursingBoardValue>,
  rows: readonly NursingBoardRow[],
): string[] {
  const groups = [...new Set(rows.map((r) => r.group))];
  const lines: string[] = [];
  for (const group of groups) {
    if (group === "Narrative" || group === "Note narrative") continue;
    const parts: string[] = [];
    for (const r of rows.filter((row) => row.group === group)) {
      const raw = values[r.id];
      if (raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0)) continue;
      const display =
        r.options?.find((o) => o.value === String(raw))?.label ?? String(raw).replaceAll("_", " ");
      parts.push(display);
    }
    if (parts.length === 0) continue;
    lines.push(`${group}: ${parts.slice(0, 4).join(" · ")}`);
  }
  return lines;
}

function SectionSummary({ lines, emptyLabel }: { lines: readonly string[]; emptyLabel: string }) {
  return (
    <div data-testid="nursing-section-summary">
      {lines.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: 13 }}>{emptyLabel}</p>
      ) : (
        lines.map((line) => {
          const significant = /HIGH|CONCERN|WORSENED|UNRESPONSIVE|SEVERE/i.test(line);
          return (
            <p
              key={line}
              data-significant={significant ? "true" : undefined}
              style={{
                margin: "6px 0",
                fontSize: 13,
                color: significant ? "#9a3412" : "#0f172a",
                fontWeight: significant ? 600 : 400,
              }}
            >
              {line}
            </p>
          );
        })
      )}
    </div>
  );
}
