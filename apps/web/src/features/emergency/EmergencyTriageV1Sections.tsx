"use client";

import React from "react";
import Link from "next/link";
import type { ErAbcOption, ErTraumaLevel, ErTriageV1Form, ErYesNoUnknown } from "./medoraErTriageV1";
import {
  ER_TRAUMA_ACTIVATION_CRITERIA_OPTIONS,
  emptyErTraumaActivationForm,
  erTriageV1FormHasAnyContent,
} from "./medoraErTriageV1";
import { MedoraCardBadge } from "@/components/medora-card";

const detailsShell: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "10px 12px",
  backgroundColor: "#fff",
};

const summaryRow: React.CSSProperties = {
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  color: "#334155",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  listStyle: "none",
};

const help: React.CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: 12,
  color: "#64748b",
  lineHeight: 1.45,
};

const abcOptions: { value: ErAbcOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "wnl", label: "Dans les limites (WNL)" },
  { value: "yes", label: "Oui" },
  { value: "no", label: "Non" },
  { value: "unknown", label: "Inconnu" },
];

const ynuOptions: { value: ErYesNoUnknown; label: string }[] = [
  { value: "", label: "—" },
  { value: "yes", label: "Oui" },
  { value: "no", label: "Non" },
  { value: "unknown", label: "Inconnu" },
];

const traumaLevelOptions: { value: ErTraumaLevel; label: string }[] = [
  { value: "", label: "—" },
  { value: "LEVEL_1", label: "Niveau 1" },
  { value: "LEVEL_2", label: "Niveau 2" },
  { value: "LEVEL_3", label: "Niveau 3" },
  { value: "LEVEL_4", label: "Niveau 4" },
];

function painOptions(): { value: string; label: string }[] {
  const o: { value: string; label: string }[] = [{ value: "", label: "—" }];
  for (let i = 0; i <= 10; i += 1) o.push({ value: String(i), label: `${i}/10` });
  return o;
}

export type EmergencyTriageV1SectionsProps = {
  er: ErTriageV1Form;
  patchErV1: (p: Partial<ErTriageV1Form>) => void;
  formDisabled: boolean;
  inputBase: React.CSSProperties;
  labelStyle: React.CSSProperties;
  grid2: React.CSSProperties;
  grid3: React.CSSProperties;
  sectionHeading: React.CSSProperties;
  patientChartHref?: string;
};

export function EmergencyTriageV1Sections({
  er,
  patchErV1,
  formDisabled,
  inputBase,
  labelStyle,
  grid2,
  grid3,
  sectionHeading,
  patientChartHref,
}: EmergencyTriageV1SectionsProps) {
  const v1Any = erTriageV1FormHasAnyContent(er);

  const sel = (key: keyof ErTriageV1Form, options: { value: string; label: string }[]) => (
    <select
      value={String(er[key] ?? "")}
      onChange={(e) => patchErV1({ [key]: e.target.value } as Partial<ErTriageV1Form>)}
      disabled={formDisabled}
      style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
    >
      {options.map((o) => (
        <option key={o.value === "" ? "empty" : o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {v1Any ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <MedoraCardBadge soft={{ bg: "#fef2f2", text: "#991b1b", border: "#fecaca" }}>Triage V1</MedoraCardBadge>
          <span style={{ fontSize: 12, color: "#64748b" }}>Champs étendus enregistrés avec le triage.</span>
        </div>
      ) : null}

      <details open style={detailsShell}>
        <summary style={summaryRow}>
          <span>1 — Triage rapide</span>
        </summary>
        <p style={help}>
          Narratif, EPI, évaluation ABC, douleur, orientation. La gravité principale reste l&apos;ESI ci-dessus.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
          <div>
            <p style={sectionHeading}>Narratif de triage</p>
            <textarea
              value={er.triageNarrative}
              onChange={(e) => patchErV1({ triageNarrative: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={8000}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", marginTop: 8, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              placeholder="Contexte court, évolution, examen ciblé…"
            />
          </div>
          <div>
            <label style={labelStyle}>EPI / précautions</label>
            <input
              type="text"
              value={er.ppeNote}
              onChange={(e) => patchErV1({ ppeNote: e.target.value })}
              disabled={formDisabled}
              style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              placeholder="Gants, masque, isolement, etc."
            />
          </div>
          <div style={grid2}>
            <div>
              <label style={labelStyle}>Voie aérienne</label>
              {sel("airway", abcOptions)}
            </div>
            <div>
              <label style={labelStyle}>Ventilation</label>
              {sel("breathing", abcOptions)}
            </div>
            <div>
              <label style={labelStyle}>Circulation</label>
              {sel("circulation", abcOptions)}
            </div>
            <div>
              <label style={labelStyle}>GCS 15</label>
              {sel("gcs15", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>Douleur (0–10)</label>
              {sel("painScale0to10", painOptions())}
            </div>
            <div>
              <label style={labelStyle}>Provenance / orientation</label>
              <input
                type="text"
                value={er.referralSource}
                onChange={(e) => patchErV1({ referralSource: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                placeholder="Auto, ambulance, autre établissement…"
              />
            </div>
            <div>
              <label style={labelStyle}>Heure de début du triage</label>
              <input
                type="datetime-local"
                value={er.triageStartedAt}
                onChange={(e) => patchErV1({ triageStartedAt: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
          </div>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              backgroundColor: "#fffafa",
            }}
          >
            <p style={{ ...sectionHeading, marginBottom: 8 }}>Activation trauma</p>
            {!er.traumaActivation.activated ? (
              <button
                type="button"
                onClick={() =>
                  patchErV1({
                    traumaActivation: { ...er.traumaActivation, activated: true },
                  })
                }
                disabled={formDisabled}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #b91c1c",
                  backgroundColor: formDisabled ? "#f1f5f9" : "#b91c1c",
                  color: formDisabled ? "#94a3b8" : "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: formDisabled ? "not-allowed" : "pointer",
                }}
              >
                Activer trauma
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#991b1b" }}>Trauma activé</span>
                  <button
                    type="button"
                    onClick={() => patchErV1({ traumaActivation: emptyErTraumaActivationForm() })}
                    disabled={formDisabled}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#64748b",
                      cursor: formDisabled ? "not-allowed" : "pointer",
                    }}
                  >
                    Désactiver
                  </button>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>Niveau trauma</label>
                    <select
                      value={er.traumaActivation.level}
                      onChange={(e) =>
                        patchErV1({
                          traumaActivation: {
                            ...er.traumaActivation,
                            level: e.target.value as ErTraumaLevel,
                          },
                        })
                      }
                      disabled={formDisabled}
                      style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                    >
                      {traumaLevelOptions.map((o) => (
                        <option key={o.value === "" ? "empty" : o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Heure d&apos;activation</label>
                    <input
                      type="datetime-local"
                      value={er.traumaActivation.activatedAt}
                      onChange={(e) =>
                        patchErV1({
                          traumaActivation: { ...er.traumaActivation, activatedAt: e.target.value },
                        })
                      }
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Critères d&apos;activation</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    {ER_TRAUMA_ACTIVATION_CRITERIA_OPTIONS.map((opt) => {
                      const on = er.traumaActivation.criteria.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            const cur = er.traumaActivation.criteria;
                            const id = opt.id;
                            const next = on ? cur.filter((x) => x !== id) : [...cur, id];
                            patchErV1({
                              traumaActivation: { ...er.traumaActivation, criteria: next },
                            });
                          }}
                          disabled={formDisabled}
                          style={{
                            padding: "6px 10px",
                            fontSize: 12,
                            borderRadius: 9999,
                            border: `1px solid ${on ? "#93c5fd" : "#e2e8f0"}`,
                            backgroundColor: on ? "#eff6ff" : "#fff",
                            color: "#0f172a",
                            cursor: formDisabled ? "not-allowed" : "pointer",
                          }}
                        >
                          {opt.labelFr}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Notes (trauma)</label>
                  <textarea
                    value={er.traumaActivation.notes}
                    onChange={(e) =>
                      patchErV1({
                        traumaActivation: { ...er.traumaActivation, notes: e.target.value },
                      })
                    }
                    disabled={formDisabled}
                    rows={2}
                    maxLength={4000}
                    style={{ ...inputBase, resize: "vertical", minHeight: 52, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                  />
                </div>
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Exceptions au profil attendu</label>
            <textarea
              value={er.triageExceptionsNote}
              onChange={(e) => patchErV1({ triageExceptionsNote: e.target.value })}
              disabled={formDisabled}
              rows={2}
              maxLength={4000}
              style={{ ...inputBase, minHeight: 56, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              placeholder="Écarts par rapport à un ABC/GCS attendu…"
            />
          </div>
        </div>
      </details>

      <details style={detailsShell}>
        <summary style={summaryRow}>
          <span>2 — Soins infirmiers et sécurité</span>
        </summary>
        <p style={help}>Repères de sécurité au box ; compléter l&apos;évaluation infirmière structurée via le dossier si besoin.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
          <div>
            <label style={labelStyle}>Soins / surveillance (résumé)</label>
            <textarea
              value={er.nursingCareNote}
              onChange={(e) => patchErV1({ nursingCareNote: e.target.value })}
              disabled={formDisabled}
              rows={2}
              maxLength={8000}
              style={{ ...inputBase, minHeight: 56, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
          </div>
          <div style={grid3}>
            <div>
              <label style={labelStyle}>Appel accessible</label>
              {sel("callLightInReach", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>Lit verrouillé / bas</label>
              {sel("bedLockedLow", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>Entourage au chevet</label>
              {sel("familyAtBedside", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>En vue du poste</label>
              {sel("inViewOfNursingStation", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>Plan expliqué</label>
              {sel("patientUpdatedOnPlan", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>Mesures de confort</label>
              {sel("comfortMeasuresProvided", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>Sécurité au domicile</label>
              {sel("feelsSafeAtHome", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>Voyage hors pays (&lt;14 j)</label>
              {sel("travelOutsideCountry14d", ynuOptions)}
            </div>
          </div>
          <div>
            <label style={labelStyle}>EPI — parcours aux urgences</label>
            <input
              type="text"
              value={er.edCoursePpeNote}
              onChange={(e) => patchErV1({ edCoursePpeNote: e.target.value })}
              disabled={formDisabled}
              style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
          </div>
          <div>
            <label style={labelStyle}>Notes infirmières / addendum</label>
            <textarea
              value={er.nursingNotesAddendum}
              onChange={(e) => patchErV1({ nursingNotesAddendum: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={8000}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
          </div>
        </div>
      </details>

      <details style={detailsShell}>
        <summary style={summaryRow}>
          <span>3 — Médicaments, allergies, vaccination</span>
        </summary>
        <p style={help}>
          Saisie unique des allergies ici (alimentaires, autres, précisions). Les enregistrements antérieurs sous
          « allergies médicamenteuses » restent inclus dans l&apos;aperçu s&apos;ils existent déjà.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
          <div>
            <label style={labelStyle}>Médicaments (résumé)</label>
            <textarea
              value={er.medicationsSummary}
              onChange={(e) => patchErV1({ medicationsSummary: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={8000}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
          </div>
          <div>
            <label style={labelStyle}>Allergies alimentaires / autres</label>
            <textarea
              value={er.foodAllergiesDetail}
              onChange={(e) => patchErV1({ foodAllergiesDetail: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={4000}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              placeholder="Alimentaires, latex, autres allergènes…"
            />
          </div>
          <div>
            <label style={labelStyle}>Allergies — précisions additionnelles</label>
            <textarea
              value={er.additionalAllergyInfo}
              onChange={(e) => patchErV1({ additionalAllergyInfo: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={4000}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              placeholder="Réactions, médicaments à éviter, détails…"
            />
          </div>
          <div style={grid2}>
            <div>
              <label style={labelStyle}>Pharmacie préférée</label>
              <input
                type="text"
                value={er.preferredPharmacy}
                onChange={(e) => patchErV1({ preferredPharmacy: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Vaccination / statut</label>
              <input
                type="text"
                value={er.immunizationStatusNote}
                onChange={(e) => patchErV1({ immunizationStatusNote: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                placeholder="À jour, partiel, inconnu…"
              />
            </div>
          </div>
        </div>
      </details>

      <details style={detailsShell}>
        <summary style={summaryRow}>
          <span>4 — Antécédents et contexte social</span>
        </summary>
        <p style={help}>
          {patientChartHref ? (
            <>
              Pour l&apos;historique structuré à long terme, utilisez aussi le{" "}
              <Link href={patientChartHref} style={{ color: "#1d4ed8", fontWeight: 600 }}>
                dossier patient
              </Link>
              .
            </>
          ) : (
            "Saisie libre pour le passage ; consolidation ultérieure au dossier patient."
          )}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
          <div style={grid2}>
            <div>
              <label style={labelStyle}>Antécédents médicaux</label>
              <textarea
                value={er.pastMedicalHistory}
                onChange={(e) => patchErV1({ pastMedicalHistory: e.target.value })}
                disabled={formDisabled}
                rows={3}
                maxLength={8000}
                style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Antécédents chirurgicaux</label>
              <textarea
                value={er.pastSurgicalHistory}
                onChange={(e) => patchErV1({ pastSurgicalHistory: e.target.value })}
                disabled={formDisabled}
                rows={3}
                maxLength={8000}
                style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Antécédents familiaux</label>
            <textarea
              value={er.familyHistory}
              onChange={(e) => patchErV1({ familyHistory: e.target.value })}
              disabled={formDisabled}
              rows={2}
              maxLength={4000}
              style={{ ...inputBase, minHeight: 52, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
          </div>
          <div style={grid3}>
            <div>
              <label style={labelStyle}>Tabagisme</label>
              <input
                type="text"
                value={er.smokingStatus}
                onChange={(e) => patchErV1({ smokingStatus: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                placeholder="Non, actif, sevré…"
              />
            </div>
            <div>
              <label style={labelStyle}>Alcool</label>
              <input
                type="text"
                value={er.alcoholUse}
                onChange={(e) => patchErV1({ alcoholUse: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Cannabis</label>
              <input
                type="text"
                value={er.marijuanaUse}
                onChange={(e) => patchErV1({ marijuanaUse: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Stimulants (ex. amphétamine, cocaïne)</label>
              <input
                type="text"
                value={er.stimulantUse}
                onChange={(e) => patchErV1({ stimulantUse: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Opioïdes / héroïne</label>
              <input
                type="text"
                value={er.opioidHeroinUse}
                onChange={(e) => patchErV1({ opioidHeroinUse: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Commentaires (social / contexte)</label>
            <textarea
              value={er.historySocialComments}
              onChange={(e) => patchErV1({ historySocialComments: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={8000}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
          </div>
        </div>
      </details>
    </div>
  );
}
