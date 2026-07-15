"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import {
  hasVitalsJson,
  MEDORA_PATIENT_VITALS_UPDATED,
  type PatientTriageVitalsSnapshot,
} from "@/lib/patientVitals";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import { defaultVitalsEntryUnits } from "@/lib/vitalsEntryDefaults";
import {
  measuredAtIsoFromLocalInputs,
  splitMeasuredAtLocal,
} from "@/lib/vitalsMeasurementContextDisplay";
import {
  sepsisScreenFormToJson,
  sepsisScreenFromUnknown,
  strokeScreenFormToJson,
  strokeScreenFromUnknown,
  triagePreviewSliceFromTriageGet,
} from "./emergencyTriageDocPreview";
import { mergeVitalsJsonForSave } from "./emergencyTriageVitalsMerge";
import { erTriageV1FormFromVitalsJson } from "./medoraErTriageV1";
import { isTriageStaleConflictError } from "./triageConcurrency";
import {
  EmergencyTriageVitalsCompactSection,
  type TriageVitalsCompactValues,
} from "./EmergencyTriageVitalsCompactSection";

type Draft = TriageVitalsCompactValues & { allergyNote: string };

function draftFromTriage(triage: Record<string, unknown> | null, language: "en" | "fr"): Draft {
  const units = defaultVitalsEntryUnits(language);
  const measured = splitMeasuredAtLocal(new Date().toISOString());
  const empty: Draft = {
    tempC: "",
    hr: "",
    rr: "",
    bpSys: "",
    bpDia: "",
    spo2: "",
    weightKg: "",
    heightCm: "",
    painScore: "",
    tempInputUnit: units.tempInputUnit,
    weightInputUnit: units.weightInputUnit,
    heightInputMode: units.heightInputMode,
    heightFeet: "",
    heightInches: "",
    allergyNote: "",
    temperatureSite: "",
    oxygenDevice: "ROOM_AIR",
    oxygenFlowLpm: "",
    oxygenFiO2Percent: "",
    oxygenDeviceNotes: "",
    measuredDate: measured.date,
    measuredTime: measured.time,
  };
  const parsed = triagePreviewSliceFromTriageGet(triage, language);
  if (!parsed) return empty;
  const s = parsed.slice;
  const v =
    triage?.vitalsJson && typeof triage.vitalsJson === "object" && !Array.isArray(triage.vitalsJson)
      ? (triage.vitalsJson as Record<string, unknown>)
      : {};
  return {
    ...empty,
    tempC: s.tempC,
    hr: s.hr,
    rr: s.rr,
    bpSys: s.bpSys,
    bpDia: s.bpDia,
    spo2: s.spo2,
    weightKg: s.weightKg,
    heightCm: s.heightCm,
    painScore: s.painScore ?? "",
    tempInputUnit: s.tempInputUnit ?? units.tempInputUnit,
    weightInputUnit: s.weightInputUnit ?? units.weightInputUnit,
    heightInputMode: s.heightInputMode ?? units.heightInputMode,
    heightFeet: s.heightFeet ?? "",
    heightInches: s.heightInches ?? "",
    allergyNote: s.allergyNote,
    temperatureSite: typeof v.temperatureSite === "string" ? v.temperatureSite : "",
    oxygenDevice: typeof v.oxygenDevice === "string" ? v.oxygenDevice : "ROOM_AIR",
    oxygenFlowLpm: v.oxygenFlowLpm != null && v.oxygenFlowLpm !== "" ? String(v.oxygenFlowLpm) : "",
    oxygenFiO2Percent:
      v.oxygenFiO2Percent != null && v.oxygenFiO2Percent !== "" ? String(v.oxygenFiO2Percent) : "",
    oxygenDeviceNotes: typeof v.oxygenDeviceNotes === "string" ? v.oxygenDeviceNotes : "",
  };
}

export function EmergencyQuickVitalsEditor({
  open,
  onClose,
  encounterId,
  facilityId,
  patientId,
  triageSnapshot,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  encounterId: string;
  facilityId: string;
  patientId?: string | null;
  triageSnapshot: Record<string, unknown> | null;
  onSaved: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const [draft, setDraft] = useState<Draft>(() => draftFromTriage(triageSnapshot, language));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"error" | "success" | "info">("error");

  useEffect(() => {
    if (open) {
      setDraft(draftFromTriage(triageSnapshot, language));
      setMsg(null);
    }
  }, [open, triageSnapshot, language]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  const patch = useCallback((p: Partial<TriageVitalsCompactValues>) => {
    setDraft((d) => ({ ...d, ...p }));
  }, []);

  const handleClear = () => {
    const measured = splitMeasuredAtLocal(new Date().toISOString());
    setDraft((d) => ({
      ...d,
      tempC: "",
      hr: "",
      rr: "",
      bpSys: "",
      bpDia: "",
      spo2: "",
      weightKg: "",
      heightCm: "",
      heightFeet: "",
      heightInches: "",
      painScore: "",
      temperatureSite: "",
      oxygenDevice: "ROOM_AIR",
      oxygenFlowLpm: "",
      oxygenFiO2Percent: "",
      oxygenDeviceNotes: "",
      measuredDate: measured.date,
      measuredTime: measured.time,
    }));
    setMsg(null);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const measuredAt = measuredAtIsoFromLocalInputs(draft.measuredDate, draft.measuredTime);
      if (!measuredAt) {
        setMsgTone("error");
        setMsg(t("vitalsContext.errors.invalidMeasuredAt"));
        return;
      }

      const latestRaw = await apiFetch(`/encounters/${encounterId}/triage`, { facilityId });
      const latest =
        latestRaw && typeof latestRaw === "object" && !Array.isArray(latestRaw)
          ? (latestRaw as Record<string, unknown>)
          : null;
      if (!latest) {
        setMsgTone("error");
        setMsg(normalizeUserFacingError(null, language) || t("erQuickVitals.saveError"));
        return;
      }

      const erV1 = erTriageV1FormFromVitalsJson(latest.vitalsJson);
      const vitalsMerged = mergeVitalsJsonForSave(latest.vitalsJson, {
        ...draft,
        erV1,
      });

      const strokeJson = strokeScreenFormToJson(
        strokeScreenFromUnknown(latest.strokeScreen),
        latest.strokeScreen
      );
      const sepsisJson = sepsisScreenFormToJson(
        sepsisScreenFromUnknown(latest.sepsisScreen),
        latest.sepsisScreen
      );
      const strokeScreenParsed = Object.keys(strokeJson).length > 0 ? strokeJson : null;
      const sepsisScreenParsed = Object.keys(sepsisJson).length > 0 ? sepsisJson : null;

      const lastKnownTriageUpdatedAt =
        typeof latest.updatedAt === "string"
          ? latest.updatedAt
          : latest.updatedAt
            ? new Date(latest.updatedAt as string).toISOString()
            : null;

      await apiFetch(`/encounters/${encounterId}/triage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chiefComplaint: (latest.chiefComplaint as string | undefined)?.trim() || null,
          onsetAt: latest.onsetAt ? new Date(latest.onsetAt as string).toISOString() : null,
          esi: latest.esi != null ? parseInt(String(latest.esi), 10) : null,
          vitalsJson: vitalsMerged,
          strokeScreen: strokeScreenParsed,
          sepsisScreen: sepsisScreenParsed,
          triageCompleteAt: latest.triageCompleteAt
            ? new Date(latest.triageCompleteAt as string).toISOString()
            : null,
          lastKnownTriageUpdatedAt,
          measuredAt,
        }),
        facilityId,
      });

      if (patientId && latest && hasVitalsJson(latest.vitalsJson) && latest.id) {
        const u = latest.updatedAt;
        const supersededSnapshot: PatientTriageVitalsSnapshot = {
          encounterId,
          encounterType: "EMERGENCY",
          triageId: latest.id as string,
          updatedAt: typeof u === "string" ? u : new Date(u as string).toISOString(),
          triageCompleteAt: latest.triageCompleteAt
            ? new Date(latest.triageCompleteAt as string).toISOString()
            : null,
          vitalsJson: { ...(latest.vitalsJson as object) } as Record<string, unknown>,
        };
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(MEDORA_PATIENT_VITALS_UPDATED, {
              detail: { patientId, supersededSnapshot },
            })
          );
        }
      }

      setMsgTone("success");
      setMsg(t("vitalsContext.saveSuccess"));
      await onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      setMsgTone("error");
      if (isTriageStaleConflictError(e)) {
        setMsg(t("erTriage.panel.staleConflict"));
      } else {
        const raw = e instanceof Error ? e.message : null;
        if (raw && /measuredAt cannot be in the future/i.test(raw)) {
          setMsg(t("vitalsContext.errors.futureMeasuredAt"));
        } else {
          setMsg(
            normalizeUserFacingError(raw, language) || t("erQuickVitals.saveError")
          );
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label={t("erQuickVitals.cancel")}
        onClick={() => {
          if (!saving) onClose();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          border: "none",
          background: "rgba(15, 23, 42, 0.35)",
          cursor: saving ? "wait" : "pointer",
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="er-quick-vitals-title"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          zIndex: 90,
          width: "min(440px, 100vw)",
          height: "100vh",
          maxHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f8fafc",
          borderLeft: "1px solid #bae6fd",
          boxShadow: "-8px 0 24px rgba(15, 23, 42, 0.12)",
          boxSizing: "border-box",
        }}
      >
        <header
          style={{
            flex: "0 0 auto",
            padding: "14px 16px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <p
            id="er-quick-vitals-title"
            style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0369c1" }}
          >
            {t("erQuickVitals.title")}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label={t("erQuickVitals.cancel")}
            style={{
              width: 32,
              height: 32,
              border: "none",
              borderRadius: 8,
              background: "#f1f5f9",
              color: "#475569",
              fontSize: 18,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            ×
          </button>
        </header>

        <div
          style={{
            flex: "1 1 auto",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "12px 14px 16px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <EmergencyTriageVitalsCompactSection
            values={draft}
            onChange={patch}
            disabled={false}
            saving={saving}
            onSaveVitals={() => void handleSave()}
            onClearVitals={handleClear}
            statusMessage={msg}
            statusTone={msgTone}
            showHeading={false}
          />

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 11,
              color: "#475569",
              fontWeight: 600,
              marginTop: 12,
            }}
          >
            {t("erQuickVitals.allergyNote")}
            <input
              type="text"
              value={draft.allergyNote}
              onChange={(e) => setDraft((d) => ({ ...d, allergyNote: e.target.value }))}
              disabled={saving}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                minHeight: 40,
              }}
            />
          </label>
        </div>
      </aside>
    </>
  );
}
