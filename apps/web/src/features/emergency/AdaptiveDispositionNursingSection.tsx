"use client";

/**
 * D4A.2 — Disposition-specific nursing execution (non-HOME pathways).
 */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  admissionNursingDepartureRequirementsMet,
  emptyAdaptiveEdNursingExecution,
  mergeAdaptiveEdNursingIntoNursingAssessment,
  nursingSectionsForPathway,
  pathwayFromDispositionBadgeVariant,
  pathwayFromDispositionOutcomeUi,
  readAdaptiveEdNursingExecution,
  validateAdaptiveNursingAgainstDisposition,
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

  useEffect(() => {
    const next = readAdaptiveEdNursingExecution(encounter.nursingAssessment);
    setSections(
      Object.fromEntries(
        Object.entries(next?.sections ?? {}).map(([k, v]) => [k, v == null ? "" : String(v)])
      ) as Record<string, string>
    );
  }, [encounter.nursingAssessment]);

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
    try {
      if (
        (pathway === "ADMISSION" || pathway === "OBSERVATION") &&
        !admissionDecisionSigned
      ) {
        setInfo(t("emergencyAdaptiveNursing.errors.ADMISSION_NURSING_WITHOUT_SIGNED_DECISION"));
        return;
      }
      if (complete) {
        const safety = validateAdaptiveNursingAgainstDisposition({
          physicianPathway: pathway,
          nursingPathway: pathway,
          admissionDecisionSigned,
          acceptingFacility: sections.acceptingFacility,
          homeNursingPresent: false,
        });
        if (!safety.ok) {
          setInfo(t(`emergencyAdaptiveNursing.errors.${safety.errors[0]}`));
          return;
        }
        if (
          (pathway === "ADMISSION" || pathway === "OBSERVATION") &&
          !admissionNursingDepartureRequirementsMet(sections)
        ) {
          setInfo(t("emergencyAdaptiveNursing.errors.DEPARTURE_REQUIREMENTS_INCOMPLETE"));
          return;
        }
      }
      const payload = emptyAdaptiveEdNursingExecution(pathway);
      payload.sections = { ...sections };
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
      setInfo(e instanceof Error ? e.message : t("emergencyAdaptiveNursing.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

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
      {(pathway === "ADMISSION" || pathway === "OBSERVATION") && !admissionDecisionSigned ? (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#b45309", fontWeight: 600 }}>
          {t("emergencyAdaptiveNursing.awaitingSignedAdmission")}
        </p>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sectionIds.map((id) => (
          <div key={id}>
            <label style={labelStyle}>{t(sectionLabelKey(pathway, id))}</label>
            <textarea
              rows={id.includes("handoff") || id.includes("Note") ? 3 : 2}
              value={sections[id] ?? ""}
              disabled={!canEdit || saving}
              onChange={(e) => patch(id, e.target.value)}
              style={{
                ...inputBase,
                resize: "vertical",
                backgroundColor: canEdit ? "#fff" : "#f8fafc",
              }}
              data-testid={`adaptive-nursing-${id}`}
            />
          </div>
        ))}
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
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#334155" }} role="status">
          {info}
        </p>
      ) : null}
    </div>
  );
}
