"use client";

/**
 * D4A.2 / D4A.2.1 — Disposition-specific nursing execution (non-HOME pathways).
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  emptyAdaptiveEdNursingExecution,
  evaluateAdaptiveNursingCompletion,
  mergeAdaptiveEdNursingIntoNursingAssessment,
  nursingSectionsForPathway,
  pathwayFromDispositionBadgeVariant,
  pathwayFromDispositionOutcomeUi,
  readAdaptiveEdNursingExecution,
  type AdaptiveNursingPathway,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/apiClient";
import { erDispositionBadgeFromEncounterJson } from "@/features/emergency/erTrackboardDispositionBadge";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";

const inputBase: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 13,
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 4,
};

function sectionLabelKey(pathway: AdaptiveNursingPathway, sectionId: string): string {
  return `emergencyAdaptiveNursing.sections.${pathway}.${sectionId}`;
}

export function AdaptiveDispositionNursingSection({
  encounterId,
  facilityId,
  encounter,
  outcomeUi,
  admissionDecisionSigned,
  onSaved,
  canEdit,
}: {
  encounterId: string;
  facilityId: string;
  encounter: {
    nursingAssessment?: unknown;
    admissionSummaryJson?: unknown;
    dischargeSummaryJson?: unknown;
    status?: string | null;
    version?: number | null;
  };
  outcomeUi?: string | null;
  admissionDecisionSigned: boolean;
  onSaved: () => void | Promise<void>;
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const badge = erDispositionBadgeFromEncounterJson(encounter);
  const pathway = useMemo(() => {
    if (outcomeUi) return pathwayFromDispositionOutcomeUi(outcomeUi);
    return pathwayFromDispositionBadgeVariant(badge?.variant ?? null);
  }, [outcomeUi, badge?.variant]);

  const sectionIds = nursingSectionsForPathway(pathway);
  const stored = readAdaptiveEdNursingExecution(encounter.nursingAssessment);
  const [sections, setSections] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        Object.entries(stored?.sections ?? {}).map(([k, v]) => [k, v == null ? "" : String(v)])
      ) as Record<string, string>
  );
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [firstInvalidId, setFirstInvalidId] = useState<string | null>(null);
  const fieldRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    const next = readAdaptiveEdNursingExecution(encounter.nursingAssessment);
    setSections(
      Object.fromEntries(
        Object.entries(next?.sections ?? {}).map(([k, v]) => [k, v == null ? "" : String(v)])
      ) as Record<string, string>
    );
  }, [encounter.nursingAssessment]);

  const completion = useMemo(
    () =>
      evaluateAdaptiveNursingCompletion({
        pathway,
        sections,
        physicianPathway: pathway,
        admissionDecisionSigned,
        completing: false,
      }),
    [pathway, sections, admissionDecisionSigned]
  );

  if (pathway === "HOME" || pathway === "OTHER" || sectionIds.length === 0) {
    return null;
  }

  const patch = (id: string, value: string) => {
    setSections((prev) => ({ ...prev, [id]: value }));
  };

  const save = async (complete: boolean) => {
    if (!canEdit || saving) return;
    setSaving(true);
    setInfo(null);
    setFirstInvalidId(null);
    try {
      const evaluation = evaluateAdaptiveNursingCompletion({
        pathway,
        sections,
        physicianPathway: pathway,
        admissionDecisionSigned,
        completing: complete,
      });
      if (complete && !evaluation.ok) {
        const firstMissing = evaluation.items.find(
          (i) => i.required && i.status !== "COMPLETE"
        )?.fieldId;
        setFirstInvalidId(firstMissing ?? null);
        if (firstMissing && fieldRefs.current[firstMissing]) {
          fieldRefs.current[firstMissing]?.focus();
        }
        const missingLabels = evaluation.missingCodes
          .map((code) => {
            const fieldId = code.replace(/^NURSING_MISSING_/, "");
            return t(sectionLabelKey(pathway, fieldId));
          })
          .filter(Boolean);
        setInfo(
          missingLabels.length > 0
            ? `${t("emergencyAdaptiveNursing.errors.NURSING_COMPLETION_INCOMPLETE")}: ${missingLabels.join(", ")}`
            : t(`emergencyAdaptiveNursing.errors.${evaluation.errors[0]}`) ||
                t("emergencyAdaptiveNursing.errors.NURSING_COMPLETION_INCOMPLETE")
        );
        return;
      }
      const prior = readAdaptiveEdNursingExecution(encounter.nursingAssessment);
      const payload = emptyAdaptiveEdNursingExecution(pathway);
      payload.sections = { ...sections };
      payload.revision = (prior?.revision ?? 0) + 1;
      if (complete) {
        payload.completedAt = new Date().toISOString();
        payload.completedByDisplayName = t("emergencyAdaptiveNursing.completedByNurse");
      }
      const nursingAssessment = mergeAdaptiveEdNursingIntoNursingAssessment(
        encounter.nursingAssessment,
        payload
      );
      await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingAssessment }),
      });
      await onSaved();
      setInfo(
        complete
          ? t("emergencyAdaptiveNursing.saveCompleteOk")
          : t("emergencyAdaptiveNursing.saveDraftOk")
      );
    } catch (e) {
      // Preserve entered values — do not reset form on failure.
      setInfo(e instanceof Error ? e.message : t("emergencyAdaptiveNursing.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const overallStatus = completion.complete
    ? "COMPLETE"
    : completion.items.some((i) => i.required && i.status !== "COMPLETE")
      ? "INCOMPLETE"
      : "INCOMPLETE";

  return (
    <div
      style={{ ...MEDORA_CARD_SHELL, padding: 14 }}
      data-testid="adaptive-disposition-nursing"
      data-pathway={pathway}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
        {t(`emergencyAdaptiveNursing.title.${pathway}`)}
      </h3>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>
        {t("emergencyAdaptiveNursing.subtitle")}
      </p>

      <div
        data-testid="adaptive-nursing-completion-summary"
        style={{
          marginBottom: 12,
          padding: 10,
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          fontSize: 12,
        }}
        aria-live="polite"
      >
        <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#0f172a" }}>
          {t("emergencyAdaptiveNursing.completionSummaryTitle")}:{" "}
          <span>
            {t(`emergencyAdaptiveNursing.completionStatus.${overallStatus}`)}
          </span>
        </p>
        {(pathway === "ADMISSION" || pathway === "OBSERVATION") ? (
          <ul style={{ margin: "0 0 6px", paddingLeft: 18, color: "#475569" }}>
            <li>
              {t("emergencyAdaptiveNursing.lanes.physicianDecision")}:{" "}
              {admissionDecisionSigned
                ? t("emergencyAdaptiveNursing.lanes.signed")
                : t("emergencyAdaptiveNursing.lanes.unsigned")}
            </li>
            <li>{t("emergencyAdaptiveNursing.lanes.placementOffNote")}</li>
            <li>{t("emergencyAdaptiveNursing.lanes.nursingDeparture")}</li>
          </ul>
        ) : null}
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {completion.items
            .filter((i) => i.required)
            .map((item) => (
              <li key={item.fieldId} style={{ marginBottom: 2 }}>
                <span style={{ fontWeight: 600 }}>
                  {t(sectionLabelKey(pathway, item.fieldId))}
                </span>
                {" — "}
                <span>
                  {t(`emergencyAdaptiveNursing.completionStatus.${item.status}`)}
                </span>
              </li>
            ))}
        </ul>
      </div>

      {(pathway === "ADMISSION" || pathway === "OBSERVATION") && !admissionDecisionSigned ? (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#b45309", fontWeight: 600 }}>
          {t("emergencyAdaptiveNursing.awaitingSignedAdmission")}
        </p>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sectionIds.map((id) => {
          const item = completion.items.find((i) => i.fieldId === id);
          const invalid = firstInvalidId === id;
          return (
            <div key={id}>
              <label htmlFor={`adaptive-nursing-field-${id}`} style={labelStyle}>
                {t(sectionLabelKey(pathway, id))}
                {item?.required ? " *" : ""}
              </label>
              <textarea
                id={`adaptive-nursing-field-${id}`}
                ref={(el) => {
                  fieldRefs.current[id] = el;
                }}
                rows={id.includes("handoff") || id.includes("Note") ? 3 : 2}
                value={sections[id] ?? ""}
                disabled={!canEdit || saving}
                aria-invalid={invalid || undefined}
                aria-required={item?.required || undefined}
                onChange={(e) => patch(id, e.target.value)}
                style={{
                  ...inputBase,
                  resize: "vertical",
                  backgroundColor: canEdit ? "#fff" : "#f8fafc",
                  borderColor: invalid ? "#dc2626" : "#cbd5e1",
                }}
                data-testid={`adaptive-nursing-${id}`}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={!canEdit || saving}
          onClick={() => void save(false)}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: canEdit ? "pointer" : "not-allowed",
          }}
        >
          {t("emergencyAdaptiveNursing.saveDraft")}
        </button>
        <button
          type="button"
          disabled={!canEdit || saving}
          onClick={() => void save(true)}
          data-testid="adaptive-nursing-complete-departure"
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid #1d4ed8",
            background: "#1d4ed8",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: canEdit ? "pointer" : "not-allowed",
          }}
        >
          {t("emergencyAdaptiveNursing.completeDeparture")}
        </button>
      </div>
      {info ? (
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#334155" }} role="alert">
          {info}
        </p>
      ) : null}
    </div>
  );
}
