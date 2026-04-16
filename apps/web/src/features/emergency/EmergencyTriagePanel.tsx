"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import {
  hasVitalsJson,
  MEDORA_PATIENT_VITALS_UPDATED,
  type PatientTriageVitalsSnapshot,
} from "@/lib/patientVitals";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { ui } from "@/lib/uiLabels";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import {
  buildTriageDocumentationPreviewModel,
  emptySepsisScreenForm,
  emptyStrokeScreenForm,
  type ErSepsisScreenForm,
  type ErScreeningYnu,
  type ErStrokeScreenForm,
  sepsisScreenFormToJson,
  sepsisScreenFromUnknown,
  strokeScreenFormToJson,
  strokeScreenFromUnknown,
  type TriageDocPreviewFormSlice,
} from "./emergencyTriageDocPreview";
import { EmergencyTriageV1Sections } from "./EmergencyTriageV1Sections";
import { mergeVitalsJsonForSave } from "./emergencyTriageVitalsMerge";
import {
  emptyErTriageV1Form,
  erTriageV1FormFromVitalsJson,
  type ErTriageV1Form,
} from "./medoraErTriageV1";

type EncounterLite = {
  id: string;
  status?: string | null;
  type?: string | null;
  patient?: { id?: string; firstName?: string | null; lastName?: string | null } | null;
};

/** Form state aligned with `TriageVitalsTab` in `encounters/[id]/page.tsx` (same PUT body). */
type TriageFormState = {
  chiefComplaint: string;
  onsetAt: string;
  esi: string;
  tempC: string;
  hr: string;
  rr: string;
  bpSys: string;
  bpDia: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
  allergyNote: string;
  strokeScreen: ErStrokeScreenForm;
  sepsisScreen: ErSepsisScreenForm;
  triageCompleteAt: string;
  erV1: ErTriageV1Form;
};

const emptyForm = (): TriageFormState => ({
  chiefComplaint: "",
  onsetAt: "",
  esi: "",
  tempC: "",
  hr: "",
  rr: "",
  bpSys: "",
  bpDia: "",
  spo2: "",
  weightKg: "",
  heightCm: "",
  allergyNote: "",
  strokeScreen: emptyStrokeScreenForm(),
  sepsisScreen: emptySepsisScreenForm(),
  triageCompleteAt: "",
  erV1: emptyErTriageV1Form(),
});

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  color: "#0f172a",
  backgroundColor: "#fff",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontWeight: 600,
  fontSize: 13,
  color: "#475569",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 12,
};

const grid3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
};

const sectionHeading: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

const PREVIEW_SECTION_ACCENTS: Record<string, string> = {
  presentation: "#6366f1",
  etat_initial: "#b91c1c",
  signes_vitaux: "#059669",
  securite: "#7c3aed",
  meds: "#d97706",
  histoire: "#64748b",
  empty: "#cbd5e1",
};

const SCREENING_YNU_OPTIONS: { value: ErScreeningYnu; label: string }[] = [
  { value: "", label: "—" },
  { value: "yes", label: "Oui" },
  { value: "no", label: "Non" },
  { value: "unknown", label: "Inconnu" },
];

const SCREENING_YN_OPTIONS: { value: "" | "yes" | "no"; label: string }[] = [
  { value: "", label: "—" },
  { value: "yes", label: "Oui" },
  { value: "no", label: "Non" },
];

export function EmergencyTriagePanel({
  encounterId: _encounterId,
  facilityId,
  encounter,
  isLocked,
  encounterTriageTabHref,
  patientChartHref,
  onSaved,
}: {
  encounterId: string;
  facilityId: string;
  encounter: EncounterLite;
  isLocked: boolean;
  encounterTriageTabHref: string;
  /** Lien vers le dossier patient pour antécédents structurés (optionnel). */
  patientChartHref?: string;
  onSaved: () => void | Promise<void>;
}) {
  const [triage, setTriage] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState<TriageFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);

  const isReadOnly = encounter.status !== "OPEN";
  const formDisabled = isReadOnly || isLocked;

  const patchErV1 = useCallback((patch: Partial<ErTriageV1Form>) => {
    setFormData((f) => ({ ...f, erV1: { ...f.erV1, ...patch } }));
  }, []);

  const loadTriage = useCallback(async () => {
    setLoading(true);
    setSaveInfo(null);
    try {
      const data = await apiFetch(`/encounters/${encounter.id}/triage`, { facilityId });
      setTriage(data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const d = data as Record<string, unknown>;
        const v = (d.vitalsJson || {}) as Record<string, number | string | null>;
        setFormData({
          chiefComplaint: (d.chiefComplaint as string) || "",
          onsetAt: d.onsetAt ? new Date(d.onsetAt as string).toISOString().slice(0, 16) : "",
          esi: d.esi != null ? String(d.esi) : "",
          tempC: v.tempC?.toString() ?? "",
          hr: v.hr?.toString() ?? "",
          rr: v.rr?.toString() ?? "",
          bpSys: v.bpSys?.toString() ?? "",
          bpDia: v.bpDia?.toString() ?? "",
          spo2: v.spo2?.toString() ?? "",
          weightKg: v.weightKg?.toString() ?? "",
          heightCm: v.heightCm?.toString() ?? "",
          allergyNote: (v as { allergyNote?: string | null }).allergyNote ?? "",
          strokeScreen: strokeScreenFromUnknown(d.strokeScreen),
          sepsisScreen: sepsisScreenFromUnknown(d.sepsisScreen),
          triageCompleteAt: d.triageCompleteAt
            ? new Date(d.triageCompleteAt as string).toISOString().slice(0, 16)
            : "",
          erV1: erTriageV1FormFromVitalsJson(d.vitalsJson),
        });
      } else {
        setFormData(emptyForm());
      }
    } catch (e) {
      console.error(e);
      setTriage(null);
      setFormData(emptyForm());
      setSaveInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null) ||
          "Impossible de charger le triage."
      );
    } finally {
      setLoading(false);
    }
  }, [encounter.id, facilityId]);

  useEffect(() => {
    void loadTriage();
  }, [loadTriage]);

  const handleSave = async () => {
    if (formDisabled) return;
    setSaving(true);
    setSaveInfo(null);

    const strokeJson = strokeScreenFormToJson(formData.strokeScreen, triage?.strokeScreen);
    const sepsisJson = sepsisScreenFormToJson(formData.sepsisScreen, triage?.sepsisScreen);
    const strokeScreenParsed = Object.keys(strokeJson).length > 0 ? strokeJson : null;
    const sepsisScreenParsed = Object.keys(sepsisJson).length > 0 ? sepsisJson : null;

    try {
      const vitalsMerged = mergeVitalsJsonForSave(triage?.vitalsJson, formData);

      const payload: Record<string, unknown> = {
        chiefComplaint: formData.chiefComplaint.trim() || null,
        onsetAt: formData.onsetAt ? new Date(formData.onsetAt).toISOString() : null,
        esi: formData.esi ? parseInt(formData.esi, 10) : null,
        vitalsJson: vitalsMerged,
        strokeScreen: strokeScreenParsed,
        sepsisScreen: sepsisScreenParsed,
        triageCompleteAt: formData.triageCompleteAt ? new Date(formData.triageCompleteAt).toISOString() : null,
      };

      const res = await apiFetch(`/encounters/${encounter.id}/triage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      });

      const patientIdForEvent = encounter.patient?.id as string | undefined;
      let supersededSnapshot: PatientTriageVitalsSnapshot | null = null;
      if (
        patientIdForEvent &&
        triage &&
        hasVitalsJson(triage.vitalsJson) &&
        triage.id
      ) {
        const u = triage.updatedAt;
        supersededSnapshot = {
          encounterId: encounter.id,
          encounterType: encounter.type ?? "—",
          triageId: triage.id as string,
          updatedAt: typeof u === "string" ? u : new Date(u as string).toISOString(),
          triageCompleteAt: triage.triageCompleteAt
            ? new Date(triage.triageCompleteAt as string).toISOString()
            : null,
          vitalsJson: { ...(triage.vitalsJson as object) } as Record<string, unknown>,
        };
      }
      if (patientIdForEvent && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(MEDORA_PATIENT_VITALS_UPDATED, {
            detail: { patientId: patientIdForEvent, supersededSnapshot },
          })
        );
      }

      await loadTriage();
      await onSaved();
      const baseMsg =
        res && typeof res === "object" && (res as { queued?: boolean }).queued === true
          ? "En attente de synchronisation"
          : "Triage enregistré";
      setSaveInfo(baseMsg);
    } catch (e) {
      console.error(e);
      setSaveInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null) ||
          "Impossible d'enregistrer le triage."
      );
    } finally {
      setSaving(false);
    }
  };

  const updatedLine =
    triage?.updatedByDisplayFr && triage?.updatedAt
      ? `Dernière mise à jour par ${String(triage.updatedByDisplayFr).trim()} — ${new Date(
          triage.updatedAt as string
        ).toLocaleString("fr-FR")}`
      : null;

  const previewModel = useMemo(() => {
    const slice: TriageDocPreviewFormSlice = {
      chiefComplaint: formData.chiefComplaint,
      onsetAt: formData.onsetAt,
      esi: formData.esi,
      tempC: formData.tempC,
      hr: formData.hr,
      rr: formData.rr,
      bpSys: formData.bpSys,
      bpDia: formData.bpDia,
      spo2: formData.spo2,
      weightKg: formData.weightKg,
      heightCm: formData.heightCm,
      allergyNote: formData.allergyNote,
      triageCompleteAt: formData.triageCompleteAt,
    };
    return buildTriageDocumentationPreviewModel(slice, {
      strokeScreen: formData.strokeScreen,
      sepsisScreen: formData.sepsisScreen,
      erV1: formData.erV1,
    });
  }, [formData]);

  const [wideLayout, setWideLayout] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 960px)");
    const apply = () => setWideLayout(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const workspaceStyle: React.CSSProperties = wideLayout
    ? {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 400px)",
        gap: 20,
        alignItems: "start",
        width: "100%",
      }
    : {
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
      };

  const resumeColumnStyle: React.CSSProperties = wideLayout
    ? {
        position: "sticky",
        top: 12,
        alignSelf: "start",
        maxHeight: "calc(100vh - 100px)",
        overflowY: "auto",
        minWidth: 0,
      }
    : { minWidth: 0 };

  return (
    <MedoraCard leftAccentColor="#b91c1c" variant="default">
      <MedoraCardInner>
        <MedoraCardTitle
          title="Triage urgences"
          subline={
            <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
              Même enregistrement que le dossier de consultation.
            </p>
          }
        />

        {loading ? (
          <p style={{ margin: "12px 0 0 0", fontSize: 14, color: "#64748b" }}>{ui.common.loading}</p>
        ) : (
          <>
            {saveInfo ? (
              <p
                style={{
                  margin: "10px 0 0 0",
                  fontSize: 13,
                  color: saveInfo.includes("Impossible") ? "#b91c1c" : "#15803d",
                  lineHeight: 1.45,
                }}
              >
                {saveInfo}
              </p>
            ) : null}

            <div style={{ ...workspaceStyle, marginTop: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                <div>
                <p style={sectionHeading}>Plainte et gravité</p>
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Motif principal</label>
                    <input
                      type="text"
                      value={formData.chiefComplaint}
                      onChange={(e) => setFormData((f) => ({ ...f, chiefComplaint: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      placeholder="Plainte principale"
                    />
                  </div>
                  <div style={grid2}>
                    <div>
                      <label style={labelStyle}>ESI (1–5)</label>
                      <select
                        value={formData.esi}
                        onChange={(e) => setFormData((f) => ({ ...f, esi: e.target.value }))}
                        disabled={formDisabled}
                        style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                      >
                        <option value="">—</option>
                        <option value="1">1 — Réanimation</option>
                        <option value="2">2 — Émergent</option>
                        <option value="3">3 — Urgent</option>
                        <option value="4">4 — Moins urgent</option>
                        <option value="5">5 — Non urgent</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Début des symptômes</label>
                      <input
                        type="datetime-local"
                        value={formData.onsetAt}
                        onChange={(e) => setFormData((f) => ({ ...f, onsetAt: e.target.value }))}
                        disabled={formDisabled}
                        style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Triage complété à</label>
                      <input
                        type="datetime-local"
                        value={formData.triageCompleteAt}
                        onChange={(e) => setFormData((f) => ({ ...f, triageCompleteAt: e.target.value }))}
                        disabled={formDisabled}
                        style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p style={sectionHeading}>Signes vitaux</p>
                <div style={{ marginTop: 10, ...grid3 }}>
                  <div>
                    <label style={labelStyle}>Température (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.tempC}
                      onChange={(e) => setFormData((f) => ({ ...f, tempC: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>FC (bpm)</label>
                    <input
                      type="number"
                      value={formData.hr}
                      onChange={(e) => setFormData((f) => ({ ...f, hr: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>FR</label>
                    <input
                      type="number"
                      value={formData.rr}
                      onChange={(e) => setFormData((f) => ({ ...f, rr: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>TA systolique</label>
                    <input
                      type="number"
                      value={formData.bpSys}
                      onChange={(e) => setFormData((f) => ({ ...f, bpSys: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>TA diastolique</label>
                    <input
                      type="number"
                      value={formData.bpDia}
                      onChange={(e) => setFormData((f) => ({ ...f, bpDia: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>SpO₂ (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.spo2}
                      onChange={(e) => setFormData((f) => ({ ...f, spo2: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Poids (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.weightKg}
                      onChange={(e) => setFormData((f) => ({ ...f, weightKg: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Taille (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.heightCm}
                      onChange={(e) => setFormData((f) => ({ ...f, heightCm: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <p style={sectionHeading}>Triage urgences — complément V1</p>
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  Données stockées dans le triage (JSON). Un enregistrement depuis l&apos;onglet Signes vitaux du dossier qui
                  remplace entièrement les signes vitaux peut effacer cette extension — privilégier la sauvegarde depuis cette
                  page pour les passages urgences.
                </p>
                <div style={{ marginTop: 12 }}>
                  <EmergencyTriageV1Sections
                    er={formData.erV1}
                    patchErV1={patchErV1}
                    formDisabled={formDisabled}
                    inputBase={inputBase}
                    labelStyle={labelStyle}
                    grid2={grid2}
                    grid3={grid3}
                    sectionHeading={sectionHeading}
                    patientChartHref={patientChartHref}
                  />
                </div>
              </div>

              <details style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", backgroundColor: "#fff" }}>
                <summary style={{ cursor: formDisabled ? "default" : "pointer", fontWeight: 600, fontSize: 13, color: "#334155" }}>
                  Dépistages AVC / sepsis
                </summary>
                <p style={{ margin: "10px 0 8px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  Champs structurés enregistrés avec le triage (JSON côté serveur). Laissez vide si non applicable.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <p style={{ ...sectionHeading, marginBottom: 8 }}>Dépistage AVC</p>
                    <div style={{ ...grid2 }}>
                      <div>
                        <label style={labelStyle}>Asymétrie faciale</label>
                        <select
                          value={formData.strokeScreen.faceDroop}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: { ...f.strokeScreen, faceDroop: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {SCREENING_YNU_OPTIONS.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Faiblesse membre supérieur</label>
                        <select
                          value={formData.strokeScreen.armWeakness}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: { ...f.strokeScreen, armWeakness: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {SCREENING_YNU_OPTIONS.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Trouble de la parole</label>
                        <select
                          value={formData.strokeScreen.speechDifficulty}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: { ...f.strokeScreen, speechDifficulty: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {SCREENING_YNU_OPTIONS.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Dernière fois vu normal</label>
                        <input
                          type="datetime-local"
                          value={formData.strokeScreen.lastKnownWell}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: { ...f.strokeScreen, lastKnownWell: e.target.value },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Alerte AVC activée</label>
                        <select
                          value={formData.strokeScreen.strokeAlertActivated}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: {
                                ...f.strokeScreen,
                                strokeAlertActivated: e.target.value as "" | "yes" | "no",
                              },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {SCREENING_YN_OPTIONS.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <label style={labelStyle}>Commentaires (AVC)</label>
                      <textarea
                        value={formData.strokeScreen.comments}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            strokeScreen: { ...f.strokeScreen, comments: e.target.value },
                          }))
                        }
                        disabled={formDisabled}
                        rows={2}
                        style={{ ...inputBase, resize: "vertical", minHeight: 56, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
                  </div>

                  <div>
                    <p style={{ ...sectionHeading, marginBottom: 8 }}>Dépistage sepsis</p>
                    <div style={{ ...grid2 }}>
                      <div>
                        <label style={labelStyle}>Infection suspectée</label>
                        <select
                          value={formData.sepsisScreen.suspectedInfection}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, suspectedInfection: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {SCREENING_YNU_OPTIONS.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>FR ≥ 22/min</label>
                        <select
                          value={formData.sepsisScreen.rrGte22}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, rrGte22: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {SCREENING_YNU_OPTIONS.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>TA systolique ≤ 100</label>
                        <select
                          value={formData.sepsisScreen.sbpLte100}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, sbpLte100: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {SCREENING_YNU_OPTIONS.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Troubles de conscience</label>
                        <select
                          value={formData.sepsisScreen.alteredMentalStatus}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, alteredMentalStatus: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {SCREENING_YNU_OPTIONS.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Lactate prescrit / demandé</label>
                        <select
                          value={formData.sepsisScreen.lactateOrdered}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, lactateOrdered: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {SCREENING_YNU_OPTIONS.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Alerte sepsis activée</label>
                        <select
                          value={formData.sepsisScreen.sepsisAlertActivated}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: {
                                ...f.sepsisScreen,
                                sepsisAlertActivated: e.target.value as "" | "yes" | "no",
                              },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {SCREENING_YN_OPTIONS.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <label style={labelStyle}>Commentaires (sepsis)</label>
                      <textarea
                        value={formData.sepsisScreen.comments}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            sepsisScreen: { ...f.sepsisScreen, comments: e.target.value },
                          }))
                        }
                        disabled={formDisabled}
                        rows={2}
                        style={{ ...inputBase, resize: "vertical", minHeight: 56, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
                  </div>
                </div>
              </details>
              </div>

              <div style={resumeColumnStyle}>
                <p style={sectionHeading}>Triage résumé</p>
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  Aperçu structuré à partir des champs saisis — lecture seule.
                </p>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }} aria-live="polite">
                  {previewModel.sections.map((sec) => (
                    <MedoraCard
                      key={sec.id}
                      leftAccentColor={PREVIEW_SECTION_ACCENTS[sec.id] ?? "#94a3b8"}
                      variant="default"
                    >
                      <MedoraCardInner>
                        <MedoraCardIdentity initials={sec.title.charAt(0)}>
                          <MedoraCardTitle title={sec.title} />
                        </MedoraCardIdentity>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                          {sec.lines.map((line, i) => (
                            <p
                              key={`${sec.id}-${i}`}
                              style={{
                                margin: 0,
                                fontSize: 13,
                                color: "#334155",
                                lineHeight: 1.6,
                                wordBreak: "break-word",
                              }}
                            >
                              {line}
                            </p>
                          ))}
                        </div>
                      </MedoraCardInner>
                    </MedoraCard>
                  ))}
                  {previewModel.narrative.trim() ? (
                    <MedoraCard leftAccentColor="#0f172a" variant="default">
                      <MedoraCardInner>
                        <MedoraCardIdentity initials="R">
                          <MedoraCardTitle
                            title="Synthèse courte"
                            subline={
                              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                                Phrase générée à partir des éléments saisis (pas d&apos;inférence clinique).
                              </p>
                            }
                          />
                        </MedoraCardIdentity>
                        <p style={{ margin: "10px 0 0 0", fontSize: 14, color: "#0f172a", lineHeight: 1.55 }}>
                          {previewModel.narrative}
                        </p>
                      </MedoraCardInner>
                    </MedoraCard>
                  ) : null}

                  <MedoraCard leftAccentColor="#475569" variant="default">
                    <MedoraCardInner>
                      <MedoraCardIdentity initials="S">
                        <MedoraCardTitle
                          title="Signature triage"
                          subline={
                            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                              Données fournies par le serveur après enregistrement.
                            </p>
                          }
                        />
                      </MedoraCardIdentity>
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                        <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
                          {updatedLine ?? "Aucune mise à jour enregistrée côté serveur pour ce triage."}
                        </p>
                        {formData.triageCompleteAt ? (
                          <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                            Triage complété (saisi) :{" "}
                            {new Date(formData.triageCompleteAt).toLocaleString("fr-FR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </p>
                        ) : null}
                      </div>
                    </MedoraCardInner>
                  </MedoraCard>
                </div>
              </div>
            </div>

            <MedoraCardActions railBorderTopColor="#e2e8f0" gap={10} minWidth={0} alignItems="flex-start">
              {!formDisabled ? (
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "none",
                    backgroundColor: "#0f172a",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: saving ? "wait" : "pointer",
                    opacity: saving ? 0.85 : 1,
                  }}
                >
                  {saving ? "Enregistrement…" : "Enregistrer le triage"}
                </button>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "#92400e", lineHeight: 1.45 }}>
                  {isReadOnly
                    ? "Consultation fermée — triage en lecture seule."
                    : "Dossier médical signé — triage en lecture seule."}
                </p>
              )}
              <Link href={encounterTriageTabHref} style={{ ...linkPillStyle, alignSelf: "center" }}>
                Onglet triage (dossier complet)
              </Link>
            </MedoraCardActions>
          </>
        )}
      </MedoraCardInner>
    </MedoraCard>
  );
}

const linkPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  backgroundColor: "#f8fafc",
  color: "#334155",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
};
