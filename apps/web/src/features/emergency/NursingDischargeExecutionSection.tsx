"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import { MedoraCard, MedoraCardInner, MedoraCardTitle, MedoraCardIdentity } from "@/components/medora-card";
import {
  edDispositionTouchButtonStyle,
  resolveEdDispositionLayoutMode,
  type EdDispositionLayoutMode,
} from "@/features/emergency/edDispositionResponsiveLayout";
import {
  emptyNursingDischargeExecutionForm,
  hydrateNursingDischargeExecutionForm,
  mergeNursingDischargeExecutionIntoNursingAssessment,
  NURSING_DISCHARGE_CONDITIONS,
  NURSING_DISCHARGE_DESTINATIONS,
  NURSING_DISCHARGE_TEACHING_ITEMS,
  nursingDischargeFormToStored,
  readNursingDischargeExecutionStored,
} from "./nursingDischargeExecutionModel";
import {
  buildNursingDischargeVitalsSnapshot,
  isRecentVitalForDischarge,
  mergeNursingDischargeVitalsAssociationIntoNursingAssessment,
  NURSING_DISCHARGE_VITALS_EXCEPTION_REASONS,
  readNursingDischargeVitalsAssociation,
  validateNursingDischargeVitalsGate,
  type NursingDischargeVitalsExceptionReason,
} from "./nursingDischargeVitalsModel";
import {
  composeNursingDischargeNoteAppend,
  getNursingDischargeNoteText,
  NURSING_DISCHARGE_NOTE_PHRASES,
  NURSING_DISCHARGE_NOTE_TEMPLATES,
} from "./nursingDischargeNoteTemplates";
import {
  EmergencyTriageVitalsCompactSection,
  type TriageVitalsCompactValues,
} from "./EmergencyTriageVitalsCompactSection";
import { defaultVitalsEntryUnits } from "@/lib/vitalsEntryDefaults";
import { splitMeasuredAtLocal } from "@/lib/vitalsMeasurementContextDisplay";
import {
  MEDORA_PATIENT_VITALS_UPDATED,
  type PatientTriageVitalsResponse,
  type PatientTriageVitalsSnapshot,
  buildVitalsTimelineNewestFirst,
  hasVitalsJson,
} from "@/lib/patientVitals";
import { saveNursingDischargeVitals } from "./saveNursingDischargeVitals";
import { isTriageStaleConflictError } from "./triageConcurrency";

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontWeight: 600,
  fontSize: 12,
  color: "#475569",
};

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  color: "#0f172a",
  backgroundColor: "#fff",
};

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: "5px 10px",
  borderRadius: 9999,
  border: active ? "1px solid #0284c7" : "1px solid #cbd5e1",
  background: active ? "#e0f2fe" : "#fff",
  color: active ? "#0c4a6e" : "#334155",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
});

function emptyVitalsDraft(language: "en" | "fr"): TriageVitalsCompactValues {
  const units = defaultVitalsEntryUnits(language);
  const m = splitMeasuredAtLocal(new Date().toISOString());
  return {
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
    temperatureSite: "",
    oxygenDevice: "ROOM_AIR",
    oxygenFlowLpm: "",
    oxygenFiO2Percent: "",
    oxygenDeviceNotes: "",
    measuredDate: m.date,
    measuredTime: m.time,
  };
}

async function resolveActorDisplay(): Promise<{ name: string; title?: string }> {
  let name = "—";
  let title: string | undefined;
  try {
    const meRes = await fetch("/api/auth/me");
    const me = await parseApiResponse(meRes);
    if (me && typeof me === "object" && !Array.isArray(me)) {
      const fn = (me as { fullName?: string; firstName?: string; lastName?: string }).fullName?.trim();
      if (fn) name = fn;
      else {
        const first = (me as { firstName?: string }).firstName ?? "";
        const last = (me as { lastName?: string }).lastName ?? "";
        const combined = `${first} ${last}`.trim();
        if (combined) name = combined;
      }
      const roleTitle = (me as { roleTitle?: string }).roleTitle?.trim();
      if (roleTitle) title = roleTitle;
    }
  } catch {
    /* ignore */
  }
  return { name, title };
}

export function NursingDischargeExecutionSection({
  encounterId,
  facilityId,
  patientId,
  nursingAssessment,
  onSaved,
  canEdit,
  readOnlyProviderDecisionLine,
}: {
  encounterId: string;
  facilityId: string;
  patientId?: string | null;
  nursingAssessment: unknown;
  onSaved: () => void | Promise<void>;
  canEdit: boolean;
  readOnlyProviderDecisionLine?: string | null;
}) {
  const { t, language } = useI18n();
  const stored = readNursingDischargeExecutionStored(nursingAssessment);
  const vitalsAssoc = readNursingDischargeVitalsAssociation(nursingAssessment);
  const [form, setForm] = useState(() => hydrateNursingDischargeExecutionForm(nursingAssessment));
  const [saving, setSaving] = useState(false);
  const [savingVitals, setSavingVitals] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [vitalsInfo, setVitalsInfo] = useState<string | null>(null);
  const [vitalsInfoTone, setVitalsInfoTone] = useState<"error" | "success" | "info">("error");
  const [layoutMode, setLayoutMode] = useState<EdDispositionLayoutMode>("desktopSplit");
  const [vitalsDraft, setVitalsDraft] = useState<TriageVitalsCompactValues>(() =>
    emptyVitalsDraft(language)
  );
  const [showNewVitals, setShowNewVitals] = useState(true);
  const [exceptionReason, setExceptionReason] = useState<NursingDischargeVitalsExceptionReason | "">(
    (vitalsAssoc.dischargeVitalsExceptionReason as NursingDischargeVitalsExceptionReason) || ""
  );
  const [exceptionNote, setExceptionNote] = useState(vitalsAssoc.dischargeVitalsExceptionNote ?? "");
  const [recentSnap, setRecentSnap] = useState<PatientTriageVitalsSnapshot | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyLayoutMode = () => {
      setLayoutMode(resolveEdDispositionLayoutMode(window.innerWidth));
    };
    applyLayoutMode();
    window.addEventListener("resize", applyLayoutMode);
    return () => window.removeEventListener("resize", applyLayoutMode);
  }, []);

  useEffect(() => {
    setForm(hydrateNursingDischargeExecutionForm(nursingAssessment));
    const assoc = readNursingDischargeVitalsAssociation(nursingAssessment);
    setExceptionReason((assoc.dischargeVitalsExceptionReason as NursingDischargeVitalsExceptionReason) || "");
    setExceptionNote(assoc.dischargeVitalsExceptionNote ?? "");
  }, [nursingAssessment]);

  useEffect(() => {
    if (!patientId || !facilityId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = (await apiFetch(`/patients/${patientId}/triage?latest=true`, {
          facilityId,
        })) as PatientTriageVitalsResponse;
        if (cancelled) return;
        const merged = buildVitalsTimelineNewestFirst(res.latest, res.history, []);
        const forEnc = merged.filter(
          (s) => s.encounterId === encounterId && hasVitalsJson(s.vitalsJson) && s.status !== "VOIDED"
        );
        const newest = forEnc[0] ?? null;
        if (
          newest?.measuredAt &&
          isRecentVitalForDischarge(newest.measuredAt) &&
          newest.readingId
        ) {
          setRecentSnap(newest);
          if (!vitalsAssoc.dischargeVitalReadingId && !vitalsAssoc.dischargeVitalsExceptionReason) {
            setShowNewVitals(false);
          }
        } else {
          setRecentSnap(null);
        }
      } catch {
        if (!cancelled) setRecentSnap(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    patientId,
    facilityId,
    encounterId,
    vitalsAssoc.dischargeVitalReadingId,
    vitalsAssoc.dischargeVitalsExceptionReason,
    nursingAssessment,
  ]);

  const toggleTeaching = (item: (typeof NURSING_DISCHARGE_TEACHING_ITEMS)[number]) => {
    setForm((prev) => {
      const has = prev.teachingReviewed.includes(item);
      return {
        ...prev,
        teachingReviewed:
          has ? prev.teachingReviewed.filter((x) => x !== item) : [...prev.teachingReviewed, item],
      };
    });
  };

  const appendTemplate = (id: string) => {
    const text = getNursingDischargeNoteText(id, language);
    if (!text) return;
    setForm((f) => {
      const already = f.selectedTemplateIds.includes(id);
      const selectedTemplateIds = already
        ? f.selectedTemplateIds.filter((x) => x !== id)
        : [...f.selectedTemplateIds, id];
      if (already) return { ...f, selectedTemplateIds };
      return {
        ...f,
        selectedTemplateIds,
        nursingDischargeNote: composeNursingDischargeNoteAppend(f.nursingDischargeNote, text),
      };
    });
  };

  const appendPhrase = (id: string) => {
    const text = getNursingDischargeNoteText(id, language);
    if (!text) return;
    setForm((f) => {
      const already = f.selectedPhraseIds.includes(id);
      const selectedPhraseIds = already
        ? f.selectedPhraseIds.filter((x) => x !== id)
        : [...f.selectedPhraseIds, id];
      if (already) return { ...f, selectedPhraseIds };
      return {
        ...f,
        selectedPhraseIds,
        nursingDischargeNote: composeNursingDischargeNoteAppend(f.nursingDischargeNote, text),
      };
    });
  };

  const clearGeneratedNote = () => {
    setForm((f) => ({
      ...f,
      nursingDischargeNote: "",
      selectedTemplateIds: [],
      selectedPhraseIds: [],
    }));
  };

  const persistVitalsAssociation = async (
    association: Parameters<typeof mergeNursingDischargeVitalsAssociationIntoNursingAssessment>[1]
  ) => {
    const payload = mergeNursingDischargeVitalsAssociationIntoNursingAssessment(
      nursingAssessment,
      association
    );
    await apiFetch(`/encounters/${encounterId}`, {
      method: "PATCH",
      facilityId,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nursingAssessment: payload }),
    });
  };

  const handleUseRecentAsDischargeVitals = async () => {
    if (!canEdit || stored || !recentSnap?.readingId || savingVitals) return;
    setSavingVitals(true);
    setVitalsInfo(null);
    try {
      const actor = await resolveActorDisplay();
      const snapshot = buildNursingDischargeVitalsSnapshot({
        vitalsJson: recentSnap.vitalsJson,
        measuredAt: recentSnap.measuredAt ?? recentSnap.updatedAt,
        enteredBy: recentSnap.recordedByDisplayName || recentSnap.recordedByInitials || null,
      });
      await persistVitalsAssociation({
        dischargeVitalReadingId: recentSnap.readingId,
        dischargeVitalsSelectedFromExisting: true,
        dischargeVitalsConfirmedByDisplayName: actor.name,
        dischargeVitalsConfirmedAt: new Date().toISOString(),
        dischargeVitalsSnapshot: snapshot,
      });
      await onSaved();
      setVitalsInfoTone("success");
      setVitalsInfo(t("nursingDischargeVitals.useRecentOk"));
      setShowNewVitals(false);
    } catch (e) {
      setVitalsInfoTone("error");
      setVitalsInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("nursingDischargeVitals.saveFailed")
      );
    } finally {
      setSavingVitals(false);
    }
  };

  const handleSaveDischargeVitals = async () => {
    if (!canEdit || stored || savingVitals) return;
    setSavingVitals(true);
    setVitalsInfo(null);
    setVitalsInfoTone("error");
    try {
      const actor = await resolveActorDisplay();
      const result = await saveNursingDischargeVitals({
        encounterId,
        facilityId,
        patientId,
        confirmedByDisplayName: actor.name,
        form: { ...vitalsDraft },
      });

      if (!result.ok) {
        setVitalsInfoTone("error");
        if (result.code === "INVALID_MEASURED_AT") {
          setVitalsInfo(t("vitalsContext.errors.invalidMeasuredAt"));
        } else if (result.code === "EMPTY_VITALS") {
          setVitalsInfo(t("vitalsContext.errors.emptyVitals"));
        } else if (result.code === "MISSING_CONTEXT") {
          setVitalsInfo(t("vitalsContext.errors.missingContext"));
        } else if (result.code === "READING_NOT_FOUND") {
          setVitalsInfo(t("nursingDischargeVitals.saveFailed"));
        } else {
          const cause = result.cause;
          const raw = cause instanceof Error ? cause.message : null;
          if (raw && /measuredAt cannot be in the future/i.test(raw)) {
            setVitalsInfo(t("vitalsContext.errors.futureMeasuredAt"));
          } else if (isTriageStaleConflictError(cause)) {
            setVitalsInfo(t("erTriage.panel.staleConflict"));
          } else if (raw && /closed|signed|not open/i.test(raw)) {
            setVitalsInfo(t("vitalsContext.errors.closedEncounter"));
          } else if (raw && /forbidden|not authorized|permission/i.test(raw)) {
            setVitalsInfo(t("nursingDischargeVitals.unauthorized"));
          } else {
            setVitalsInfo(
              normalizeUserFacingError(raw, language) || t("nursingDischargeVitals.saveFailed")
            );
          }
        }
        return;
      }

      if (patientId && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(MEDORA_PATIENT_VITALS_UPDATED, {
            detail: { patientId, supersededSnapshot: null },
          })
        );
      }

      await persistVitalsAssociation(result.association);
      await onSaved();
      setVitalsInfoTone("success");
      setVitalsInfo(t("nursingDischargeVitals.saveOk"));
      setShowNewVitals(false);
    } catch (e) {
      const raw = e instanceof Error ? e.message : null;
      setVitalsInfoTone("error");
      setVitalsInfo(normalizeUserFacingError(raw, language) || t("nursingDischargeVitals.saveFailed"));
    } finally {
      setSavingVitals(false);
    }
  };

  const handleSaveException = async () => {
    if (!canEdit || stored || savingVitals) return;
    if (!exceptionReason) {
      setVitalsInfo(t("nursingDischargeVitals.exceptionRequired"));
      return;
    }
    if (exceptionReason === "OTHER" && !exceptionNote.trim()) {
      setVitalsInfo(t("nursingDischargeVitals.exceptionOtherRequired"));
      return;
    }
    setSavingVitals(true);
    setVitalsInfo(null);
    try {
      const actor = await resolveActorDisplay();
      await persistVitalsAssociation({
        dischargeVitalsExceptionReason: exceptionReason,
        dischargeVitalsExceptionNote: exceptionNote.trim() || undefined,
        dischargeVitalsExceptionByDisplayName: actor.name,
        dischargeVitalsExceptionAt: new Date().toISOString(),
      });
      await onSaved();
      setVitalsInfoTone("success");
      setVitalsInfo(t("nursingDischargeVitals.exceptionSaved"));
    } catch (e) {
      setVitalsInfoTone("error");
      setVitalsInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("nursingDischargeVitals.saveFailed")
      );
    } finally {
      setSavingVitals(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!canEdit || stored) return;
    const assocNow = readNursingDischargeVitalsAssociation(nursingAssessment);
    const gate2 = validateNursingDischargeVitalsGate(assocNow);
    if (!gate2.ok) {
      setSaveInfo(
        gate2.code === "EXCEPTION_OTHER_TEXT"
          ? t("nursingDischargeVitals.exceptionOtherRequired")
          : t("nursingDischargeVitals.requiredBeforeConfirm")
      );
      return;
    }
    if (!form.nursingDischargeNote.trim()) {
      setSaveInfo(t("nursingDischargeNotes.noteRequired"));
      return;
    }

    setSaving(true);
    setSaveInfo(null);
    try {
      const actor = await resolveActorDisplay();
      const extras = {
        ...assocNow,
      };
      const payload = mergeNursingDischargeExecutionIntoNursingAssessment(
        nursingAssessment,
        nursingDischargeFormToStored(form, actor.name, actor.title, extras)
      );
      await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingAssessment: payload }),
      });
      await onSaved();
      setSaveInfo(t("providerDischargeDocumentation19Y.nursingSaveOk"));
    } catch (e) {
      setSaveInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("providerDischargeDocumentation19Y.nursingSaveFailed")
      );
    } finally {
      setSaving(false);
    }
  }, [
    canEdit,
    encounterId,
    facilityId,
    form,
    language,
    nursingAssessment,
    onSaved,
    stored,
    t,
  ]);

  const completeNoteTemplates = useMemo(
    () => NURSING_DISCHARGE_NOTE_TEMPLATES.filter((x) => x.category === "complete"),
    []
  );

  const phraseGroups = useMemo(() => {
    const cats = ["clinical", "teaching", "understanding", "mobility"] as const;
    return cats.map((cat) => ({
      cat,
      phrases: NURSING_DISCHARGE_NOTE_PHRASES.filter((p) => p.category === cat),
    }));
  }, []);

  return (
    <MedoraCard leftAccentColor="#0ea5e9" variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials="I">
          <MedoraCardTitle title={t("providerDischargeDocumentation19Y.nursingSectionTitle")} />
        </MedoraCardIdentity>

        {readOnlyProviderDecisionLine ?
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>{readOnlyProviderDecisionLine}</p>
        : null}

        {stored ?
          <div style={{ marginTop: 10, fontSize: 13, color: "#0f172a", lineHeight: 1.5 }}>
            <p style={{ margin: 0 }}>
              {t("providerDischargeDocumentation19Y.nursingCompletedLine")
                .replace("{name}", stored.dischargeSortieCompletedByDisplayName)
                .replace(
                  "{when}",
                  new Date(stored.dischargeSortieCompletedAt).toLocaleString(
                    language === "en" ? "en-US" : "fr-FR"
                  )
                )}
            </p>
            {stored.nursingDestination ?
              <p style={{ margin: "6px 0 0" }}>
                {t("providerDischargeDocumentation19Y.nursingDestinationLabel")}:{" "}
                {t(`providerDischargeDocumentation19Y.nursingDestination.${stored.nursingDestination}`)}
              </p>
            : null}
            {stored.dischargeVitalReadingId ?
              <p style={{ margin: "6px 0 0" }}>{t("nursingDischargeVitals.associatedReadingPresent")}</p>
            : null}
            {stored.dischargeVitalsExceptionReason ?
              <p style={{ margin: "6px 0 0" }}>
                {t("nursingDischargeVitals.exceptionLabel")}:{" "}
                {t(`nursingDischargeVitals.exception.${stored.dischargeVitalsExceptionReason}`)}
                {stored.dischargeVitalsExceptionNote ? ` — ${stored.dischargeVitalsExceptionNote}` : ""}
              </p>
            : null}
            {stored.dischargeSortieExecutionNote ?
              <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{stored.dischargeSortieExecutionNote}</p>
            : null}
          </div>
        : <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12, width: "100%", minWidth: 0 }}>
            <div>
              <label style={labelStyle}>{t("providerDischargeDocumentation19Y.nursingDestinationLabel")}</label>
              <select
                value={form.destination}
                disabled={!canEdit}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value as typeof f.destination }))}
                style={{ ...inputBase, backgroundColor: !canEdit ? "#f8fafc" : "#fff" }}
              >
                <option value="">—</option>
                {NURSING_DISCHARGE_DESTINATIONS.map((d) => (
                  <option key={d} value={d}>
                    {t(`providerDischargeDocumentation19Y.nursingDestination.${d}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t("providerDischargeDocumentation19Y.nursingDischargeAt")}</label>
              <input
                type="datetime-local"
                value={form.dischargeAtLocal}
                disabled={!canEdit}
                onChange={(e) => setForm((f) => ({ ...f, dischargeAtLocal: e.target.value }))}
                style={{ ...inputBase, backgroundColor: !canEdit ? "#f8fafc" : "#fff" }}
              />
            </div>

            {/* Discharge vitals */}
            <div
              style={{
                border: "1px solid #bae6fd",
                borderRadius: 10,
                padding: 12,
                background: "#f8fafc",
              }}
            >
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0369a1" }}>
                {t("nursingDischargeVitals.sectionTitle")}
              </p>

              {vitalsAssoc.dischargeVitalReadingId ?
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#15803d" }}>
                  {t("nursingDischargeVitals.associatedReadingPresent")}
                  {vitalsAssoc.dischargeVitalsConfirmedByDisplayName
                    ? ` — ${vitalsAssoc.dischargeVitalsConfirmedByDisplayName}`
                    : ""}
                </p>
              : null}

              {recentSnap && !vitalsAssoc.dischargeVitalReadingId ?
                <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
                  <p style={{ margin: 0 }}>
                    {t("nursingDischargeVitals.latestAvailable")
                      .replace(
                        "{when}",
                        new Date(recentSnap.measuredAt ?? recentSnap.updatedAt).toLocaleString(
                          language === "en" ? "en-US" : "fr-FR",
                          { dateStyle: "short", timeStyle: "short" }
                        )
                      )
                      .replace("{by}", recentSnap.recordedByInitials || recentSnap.recordedByDisplayName || "—")}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      disabled={!canEdit || savingVitals}
                      onClick={() => void handleUseRecentAsDischargeVitals()}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #0284c7",
                        background: "#fff",
                        color: "#0369a1",
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                        minHeight: 40,
                      }}
                    >
                      {t("nursingDischargeVitals.useAsDischarge")}
                    </button>
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setShowNewVitals(true)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        background: "#fff",
                        color: "#334155",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                        minHeight: 40,
                      }}
                    >
                      {t("nursingDischargeVitals.enterNew")}
                    </button>
                  </div>
                </div>
              : null}

              {showNewVitals || !recentSnap ?
                <div style={{ marginTop: 10 }}>
                  <EmergencyTriageVitalsCompactSection
                    values={vitalsDraft}
                    onChange={(patch) => setVitalsDraft((d) => ({ ...d, ...patch }))}
                    disabled={!canEdit}
                    saving={savingVitals}
                    onSaveVitals={() => void handleSaveDischargeVitals()}
                    onClearVitals={() => setVitalsDraft(emptyVitalsDraft(language))}
                    statusMessage={vitalsInfo}
                    statusTone={vitalsInfoTone}
                    showHeading={false}
                    saveLabel={t("nursingDischargeVitals.saveDischargeVitals")}
                  />
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: "#64748b" }}>
                    {t("nursingDischargeVitals.saveHint")}
                  </p>
                </div>
              : null}

              <div style={{ marginTop: 12, borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                <label style={labelStyle}>{t("nursingDischargeVitals.exceptionLabel")}</label>
                <select
                  value={exceptionReason}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setExceptionReason(e.target.value as NursingDischargeVitalsExceptionReason | "")
                  }
                  style={{ ...inputBase, backgroundColor: !canEdit ? "#f8fafc" : "#fff" }}
                >
                  <option value="">—</option>
                  {NURSING_DISCHARGE_VITALS_EXCEPTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {t(`nursingDischargeVitals.exception.${r}`)}
                    </option>
                  ))}
                </select>
                {exceptionReason === "OTHER" ?
                  <input
                    type="text"
                    value={exceptionNote}
                    disabled={!canEdit}
                    onChange={(e) => setExceptionNote(e.target.value)}
                    placeholder={t("nursingDischargeVitals.exceptionOtherPlaceholder")}
                    style={{ ...inputBase, marginTop: 8, backgroundColor: !canEdit ? "#f8fafc" : "#fff" }}
                  />
                : null}
                {canEdit && exceptionReason ?
                  <button
                    type="button"
                    disabled={savingVitals}
                    onClick={() => void handleSaveException()}
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #f59e0b",
                      background: "#fffbeb",
                      color: "#92400e",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: savingVitals ? "wait" : "pointer",
                      minHeight: 40,
                    }}
                  >
                    {t("nursingDischargeVitals.saveException")}
                  </button>
                : null}
              </div>

              {vitalsInfo && !(showNewVitals || !recentSnap) ?
                <p
                  role={vitalsInfoTone === "error" ? "alert" : "status"}
                  aria-live={vitalsInfoTone === "error" ? "assertive" : "polite"}
                  style={{
                    margin: "8px 0 0",
                    fontSize: 12,
                    color:
                      vitalsInfoTone === "success"
                        ? "#047857"
                        : vitalsInfoTone === "error"
                          ? "#b91c1c"
                          : "#0369a1",
                  }}
                >
                  {vitalsInfo}
                </p>
              : null}
            </div>

            <div>
              <label style={labelStyle}>{t("providerDischargeDocumentation19Y.nursingTeachingSectionLabel")}</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                {NURSING_DISCHARGE_TEACHING_ITEMS.map((item) => (
                  <label
                    key={item}
                    style={{ display: "flex", gap: 8, fontSize: 13, cursor: canEdit ? "pointer" : "not-allowed" }}
                  >
                    <input
                      type="checkbox"
                      checked={form.teachingReviewed.includes(item)}
                      disabled={!canEdit}
                      onChange={() => toggleTeaching(item)}
                    />
                    <span>{t(`providerDischargeDocumentation19Y.nursingTeaching.${item}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t("providerDischargeDocumentation19Y.nursingConditionLabel")}</label>
              <select
                value={form.conditionAtDischarge}
                disabled={!canEdit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, conditionAtDischarge: e.target.value as typeof f.conditionAtDischarge }))
                }
                style={{ ...inputBase, backgroundColor: !canEdit ? "#f8fafc" : "#fff" }}
              >
                <option value="">—</option>
                {NURSING_DISCHARGE_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {t(`providerDischargeDocumentation19Y.nursingCondition.${c}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Smart note builder */}
            <div>
              <label style={labelStyle}>{t("providerDischargeDocumentation19Y.nursingNote")}</label>
              <p style={{ margin: "0 0 6px", fontSize: 11, color: "#64748b" }}>
                {t("nursingDischargeNotes.builderHint")}
              </p>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => setTemplatesOpen((o) => !o)}
                style={{
                  marginBottom: 8,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {templatesOpen ? t("nursingDischargeNotes.hideTemplates") : t("nursingDischargeNotes.showTemplates")}
              </button>
              {templatesOpen ?
                <div style={{ marginBottom: 10 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                    {t("nursingDischargeNotes.quickTemplates")}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {completeNoteTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => appendTemplate(tpl.id)}
                        style={chipStyle(form.selectedTemplateIds.includes(tpl.id))}
                      >
                        {t(`nursingDischargeNotes.templateLabels.${tpl.id}`)}
                      </button>
                    ))}
                  </div>
                  {phraseGroups.map((group) => (
                    <div key={group.cat} style={{ marginTop: 10 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                        {t(`nursingDischargeNotes.categories.${group.cat}`)}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {group.phrases.map((ph) => (
                          <button
                            key={ph.id}
                            type="button"
                            disabled={!canEdit}
                            onClick={() => appendPhrase(ph.id)}
                            style={chipStyle(form.selectedPhraseIds.includes(ph.id))}
                          >
                            {t(`nursingDischargeNotes.phraseLabels.${ph.id}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              : null}
              <textarea
                value={form.nursingDischargeNote}
                disabled={!canEdit}
                rows={6}
                onChange={(e) => setForm((f) => ({ ...f, nursingDischargeNote: e.target.value }))}
                style={{ ...inputBase, minHeight: 120, resize: "vertical", backgroundColor: !canEdit ? "#f8fafc" : "#fff" }}
              />
              {canEdit ?
                <button
                  type="button"
                  onClick={clearGeneratedNote}
                  style={{
                    marginTop: 6,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {t("nursingDischargeNotes.clearGenerated")}
                </button>
              : null}
            </div>

            {canEdit ?
              <button
                type="button"
                disabled={saving || savingVitals}
                onClick={() => void handleSave()}
                style={edDispositionTouchButtonStyle(
                  {
                    alignSelf: layoutMode === "mobileStacked" ? "stretch" : "flex-start",
                    width: layoutMode === "mobileStacked" ? "100%" : undefined,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "#0ea5e9",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: saving ? "wait" : "pointer",
                  },
                  layoutMode
                )}
              >
                {saving ? t("common.saving") : t("providerDischargeDocumentation19Y.nursingSaveButton")}
              </button>
            : null}
          </div>
        }

        {saveInfo ?
          <p
            role="status"
            aria-live="polite"
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color:
                saveInfo.includes("impossible") ||
                saveInfo.includes("Unable") ||
                saveInfo.includes("required") ||
                saveInfo.includes("requis")
                  ? "#b91c1c"
                  : "#15803d",
            }}
          >
            {saveInfo}
          </p>
        : null}
      </MedoraCardInner>
    </MedoraCard>
  );
}
