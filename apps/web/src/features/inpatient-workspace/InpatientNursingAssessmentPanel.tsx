"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { InpatientNursingAssessmentSave, InpatientNursingAssessmentV1 } from "@medora/shared";
import {
  resolveInpatientNursingClinicalOccurredAt,
} from "@medora/shared";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import {
  NursingDocumentationBoard,
  type NursingBoardColumn,
  type NursingBoardRow,
  type NursingBoardValue,
} from "@/features/clinical-documentation/NursingDocumentationBoard";
import { ClinicalDocumentationHub } from "@/features/clinical-documentation/ClinicalDocumentationHub";
import { useI18n } from "@/lib/i18n";
import { INPATIENT_NURSING_BOARD_ROWS } from "./inpatientNursingBoardRowsInp1b6";

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
}) {
  const { language, t } = useI18n();
  const french = language === "fr";
  const [history, setHistory] = useState<InpatientNursingAssessmentV1[]>([]);
  const [draft, setDraft] = useState<InpatientNursingAssessmentSave | null>(null);
  const [copied, setCopied] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hubOpen, setHubOpen] = useState(false);

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

  useEffect(() => {
    void load().catch(() => setMessage(t("inpatientNursingAssessmentInp1b.loadError")));
  }, [load, t]);

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
      setCopied(new Set(Object.keys(toBoardValues(latest)).filter((key) => toBoardValues(latest)[key] !== undefined && toBoardValues(latest)[key] !== "")));
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
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  const latest = history.at(-1);
  const summarySource = draft ? toBoardValues(draft) : latest ? toBoardValues(latest) : {};
  const rows = useMemo(() => localizeRows(INPATIENT_NURSING_BOARD_ROWS, french, t), [french, t]);
  const context = latest ? (
    <>
      {french ? "Dernière documentation : " : "Last documented: "}
      {new Date(resolveInpatientNursingClinicalOccurredAt(latest)).toLocaleString()}
      {" · "}
      {french ? "Documenté par : " : "Documented by: "}
      {latest.authorDisplayName}
    </>
  ) : (
    <>{french ? "Aucune évaluation enregistrée" : "No saved assessments yet"}</>
  );

  return (
    <div data-testid="inpatient-native-nursing-assessment">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button type="button" data-testid="inpatient-clinical-documentation-open" onClick={() => setHubOpen(true)}>
          {french ? "Documentation clinique" : "Clinical Documentation"}
        </button>
      </div>
      {hubOpen ? (
        <ClinicalDocumentationHub
          careSetting="INPATIENT"
          encounterId={encounterId}
          facilityId={facilityId}
          onClose={() => setHubOpen(false)}
        />
      ) : null}
      <NursingDocumentationBoard
        title={t("inpatientNursingAssessmentInp1b.title")}
        context={context}
        rows={rows}
        columns={columns}
        draft={draft ? toBoardValues(draft) : null}
        draftTime={draft?.clinicalDocumentedAt ?? undefined}
        clinicalTimeValue={draft?.clinicalDocumentedAt ? toLocalDatetimeValue(draft.clinicalDocumentedAt) : ""}
        onClinicalTimeChange={(local) =>
          setDraft((current) =>
            current ? { ...current, clinicalDocumentedAt: fromLocalDatetimeValue(local) } : current,
          )
        }
        clinicalTimeLabel={t("inpatientNursingAssessmentInp1b.assessmentTime")}
        copiedFieldIds={copied}
        readOnly={isLocked}
        busy={busy}
        onChange={patch}
        onNew={() => begin(false)}
        onCopyPrevious={() => begin(true)}
        onSave={() => void save()}
        labels={
          french
            ? {
                clinicalFinding: "Constat clinique",
                noSaved: "Aucune évaluation enregistrée",
                addColumn: "+ Ajouter une colonne",
                copyPrevious: "Copier la précédente",
                save: "Enregistrer l’évaluation",
                notCharted: "Non documenté",
                currentSaved: "ACTUELLE · ENREGISTRÉE",
                saved: "ENREGISTRÉE",
                draft: "BROUILLON",
                summary: "Résumé infirmier",
              }
            : undefined
        }
        summary={<SectionSummary values={summarySource} french={french} rows={rows} />}
      />
      <p style={{ fontSize: 12, color: "#64748b" }}>
        {french
          ? "Entrées/sorties et dispositifs : ouvrir Documentation clinique (autorité entreprise). Ne pas recopier ici."
          : "Intake & output and devices: open Clinical Documentation (enterprise authority). Do not duplicate inventory here."}
      </p>
      {message ? <p role="status">{message}</p> : null}
      {isLocked ? (
        <p role="status">
          {french
            ? "Lecture seule : la rédaction de l’évaluation infirmière nécessite une autorité Infirmier ou Admin."
            : "Read-only: nursing assessment authoring requires RN or Admin authority."}
        </p>
      ) : null}
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

function SectionSummary({
  values,
  french,
  rows,
}: {
  values: Record<string, NursingBoardValue>;
  french: boolean;
  rows: readonly NursingBoardRow[];
}) {
  const groups = [...new Set(rows.map((r) => r.group))];
  return (
    <div data-testid="nursing-section-summary">
      {groups.map((group) => {
        const items = rows
          .filter((r) => r.group === group)
          .map((r) => {
            const raw = values[r.id];
            if (raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0)) return null;
            const display =
              r.options?.find((o) => o.value === String(raw))?.label ??
              String(raw).replaceAll("_", " ");
            return (
              <p key={r.id} style={{ margin: "4px 0", fontSize: 13 }}>
                <strong>{r.label}:</strong> {display}
              </p>
            );
          })
          .filter(Boolean);
        if (items.length === 0) return null;
        return (
          <div key={group} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", color: "#334155" }}>
              {group.toUpperCase()}
            </div>
            {items}
          </div>
        );
      })}
      {Object.values(values).every((v) => v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) ? (
        <p style={{ color: "#64748b", fontSize: 13 }}>
          {french ? "Aucun constat documenté pour le moment." : "No findings documented yet."}
        </p>
      ) : null}
    </div>
  );
}
