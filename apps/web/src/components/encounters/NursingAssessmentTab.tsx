"use client";

import React, { useCallback, useMemo, useState } from "react";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { NURSING_ASSESSMENT_SECTION_LABELS_FR } from "@/components/patient-chart/patientChartHelpers";

type SectionDef = { id: string; label: string; chips: string[] };

/** Gabarit clinique — sections + `nursingEvalV1` pour résumé / dossier. */
const SECTIONS: SectionDef[] = [
  {
    id: "etatGeneral",
    label: "État général",
    chips: ["Stable", "Fièvre", "Fatigue", "Déshydratation suspectée", "Détresse apparente"],
  },
  {
    id: "neurologique",
    label: "Neurologique",
    chips: [
      "Alerte et orienté",
      "Confus",
      "Somnolent",
      "Céphalée",
      "Convulsions absentes",
      "Convulsions observées",
    ],
  },
  {
    id: "respiratoire",
    label: "Respiratoire",
    chips: ["Respiration régulière", "Dyspnée", "Toux", "Sibilants", "Détresse respiratoire"],
  },
  {
    id: "cardiaque",
    label: "Cardiaque",
    chips: ["Rythme régulier", "Tachycardie", "Douleur thoracique", "Palpitations"],
  },
  {
    id: "digestif",
    label: "Digestif",
    chips: ["Nausée", "Vomissements", "Diarrhée", "Douleur abdominale", "Tolérance orale réduite"],
  },
  {
    id: "genito",
    label: "Génito-urinaire",
    chips: ["Diurèse conservée", "Brûlure mictionnelle", "Oligurie"],
  },
  {
    id: "musculo",
    label: "Musculo-squelettique",
    chips: ["Motricité conservée", "Douleur articulaire", "Faiblesse", "Traumatisme noté"],
  },
  {
    id: "peau",
    label: "Peau / plaies",
    chips: ["Intégrité cutanée", "Plaie propre", "Rougeur", "Escarre à surveiller"],
  },
  {
    id: "douleur",
    label: "Douleur",
    chips: ["Absente", "Légère", "Modérée", "Intense", "Intensité 0–10", "Localisation"],
  },
  {
    id: "securite",
    label: "Risques / sécurité",
    chips: ["Risque faible", "Risque modéré", "Risque élevé", "Aide à la marche", "Barrières lit"],
  },
  {
    id: "interventionsInfirmieres",
    label: "Interventions infirmières",
    chips: [
      "Surveillance des signes vitaux",
      "Installation en salle",
      "Pose de voie veineuse",
      "Prélèvement effectué",
      "Médicament administré selon ordonnance",
      "Éducation du patient",
      "Préparation à la sortie",
    ],
  },
  {
    id: "notesInfirmieresLibres",
    label: "Note infirmière, autres",
    chips: [],
  },
];

type AssessmentState = Record<string, { text: string }>;

function sectionTextFromUnknown(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const t = (v as { text?: unknown }).text;
  return typeof t === "string" ? t : null;
}

/** Compatibilité : anciennes clés `cardiovasculaire`, `gastro`, `notesInfirmieres`, `observationsInfirmieres`. */
function parseAssessment(raw: unknown): AssessmentState {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const inner = o.nursingEvalV1;
  if (!inner || typeof inner !== "object") return {};
  const sections = (inner as Record<string, unknown>).sections;
  if (!sections || typeof sections !== "object") return {};
  const out: AssessmentState = {};
  for (const [k, v] of Object.entries(sections)) {
    const text = sectionTextFromUnknown(v)?.trim();
    if (text) out[k] = { text };
  }
  if (!out.cardiaque?.text && out.cardiovasculaire?.text) {
    out.cardiaque = { text: out.cardiovasculaire.text };
  }
  if (!out.digestif?.text && out.gastro?.text) {
    out.digestif = { text: out.gastro.text };
  }
  if (!out.notesInfirmieresLibres?.text && out.notesInfirmieres?.text) {
    out.notesInfirmieresLibres = { text: out.notesInfirmieres.text };
  }
  if (!out.notesInfirmieresLibres?.text && out.observationsInfirmieres?.text) {
    out.notesInfirmieresLibres = { text: out.observationsInfirmieres.text };
  }
  return out;
}

function buildSummaryLinesFr(state: AssessmentState): string[] {
  const lines: string[] = [];
  const used = new Set<string>();
  for (const sec of SECTIONS) {
    const t = state[sec.id]?.text?.trim();
    if (!t) continue;
    const short = t.length > 140 ? `${t.slice(0, 140)}…` : t;
    lines.push(`${sec.label} : ${short}`);
    used.add(sec.id);
  }
  for (const [k, v] of Object.entries(state)) {
    if (used.has(k)) continue;
    const t = v?.text?.trim();
    if (!t) continue;
    const label = NURSING_ASSESSMENT_SECTION_LABELS_FR[k] ?? "Note";
    const short = t.length > 140 ? `${t.slice(0, 140)}…` : t;
    lines.push(`${label} : ${short}`);
  }
  return lines.slice(0, 24);
}

function buildPayload(state: AssessmentState, savedByDisplayName: string) {
  const sections: AssessmentState = {};
  for (const [k, v] of Object.entries(state)) {
    const t = v?.text?.trim();
    if (t) sections[k] = { text: t };
  }
  const summaryLinesFr = buildSummaryLinesFr(state);
  const name = savedByDisplayName.trim() || "Professionnel";
  return {
    nursingAssessment: {
      nursingEvalV1: {
        sections,
        summaryLinesFr,
        templateVersion: "mvp2025b",
        signature: {
          savedAt: new Date().toISOString(),
          savedByDisplayName: name,
        },
      },
    },
  };
}

export function NursingAssessmentTab({
  encounterId,
  facilityId,
  encounter,
  onUpdate,
}: {
  encounterId: string;
  facilityId: string;
  encounter: any;
  onUpdate: () => void;
}) {
  const initial = useMemo(() => parseAssessment(encounter?.nursingAssessment), [encounter?.nursingAssessment]);
  const [state, setState] = useState<AssessmentState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  React.useEffect(() => {
    setState(parseAssessment(encounter?.nursingAssessment));
  }, [encounter?.nursingAssessment, encounter?.updatedAt]);

  const setSectionText = (id: string, text: string) => {
    setState((s) => ({ ...s, [id]: { text } }));
  };

  const appendChip = (id: string, chip: string) => {
    setState((s) => {
      const prev = s[id]?.text?.trim() ?? "";
      const add = prev && !prev.endsWith(".") ? `. ${chip}` : prev ? `${prev}. ${chip}` : chip;
      return { ...s, [id]: { text: add } };
    });
  };

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      let savedByDisplayName = "Professionnel";
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await parseApiResponse(meRes);
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) savedByDisplayName = fn;
        }
      } catch {
        /* repli */
      }
      const body = buildPayload(state, savedByDisplayName);
      await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setOk(true);
      onUpdate();
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null) || "Impossible d'enregistrer.");
    } finally {
      setSaving(false);
    }
  }, [encounterId, facilityId, onUpdate, state]);

  return (
    <div>
      <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "#555", lineHeight: 1.5 }}>
        <strong>Évaluation infirmière</strong> par systèmes — options rapides (puces) et complément libre. Enregistrement dans le
        dossier de la consultation ; synthèse visible au résumé et dans le dossier patient.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {SECTIONS.map((sec) => (
          <section
            key={sec.id}
            style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 14, backgroundColor: "#fafafa" }}
          >
            <h4 style={{ margin: "0 0 8px 0", fontSize: 15 }}>{sec.label}</h4>
            {sec.chips.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {sec.chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => appendChip(sec.id, chip)}
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 16,
                      border: "1px solid #bbb",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            ) : null}
            <textarea
              value={state[sec.id]?.text ?? ""}
              onChange={(e) => setSectionText(sec.id, e.target.value)}
              placeholder={
                sec.id === "notesInfirmieresLibres"
                  ? "Transmission, contexte, points de vigilance, suivi…"
                  : "Complément libre pour cette section…"
              }
              rows={sec.id === "notesInfirmieresLibres" ? 5 : 3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 10,
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: 14,
              }}
            />
          </section>
        ))}
      </div>
      <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          style={{
            padding: "10px 20px",
            backgroundColor: "#2e7d32",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "Enregistrement…" : "Enregistrer l'évaluation infirmière"}
        </button>
        {ok && !error && <span style={{ color: "#2e7d32", fontSize: 14 }}>Enregistré.</span>}
      </div>
      {error && (
        <p style={{ color: "#c62828", marginTop: 12 }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
