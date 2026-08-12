"use client";

import { useEffect, useState } from "react";
import type { InpatientNursingAssessmentV1 } from "@medora/shared";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";

/** Read-only legal-record projection; it never writes or owns nursing data. */
export function InpatientNursingOverviewCard({ encounterId, facilityId, onOpen }: { encounterId: string; facilityId: string; onOpen: () => void }) {
  const { language } = useI18n();
  const [latest, setLatest] = useState<InpatientNursingAssessmentV1 | null>(null);
  useEffect(() => {
    void apiFetch(`/encounters/${encodeURIComponent(encounterId)}/inpatient-nursing-assessment-events`, { facilityId })
      .then((response) => asApiObject<{ entries?: { assessment: InpatientNursingAssessmentV1 }[] }>(response)?.entries ?? [])
      .then((entries) => setLatest(entries.at(-1)?.assessment ?? null));
  }, [encounterId, facilityId]);
  const fr = language === "fr";
  const findings = latest?.structuredFindings ?? {};
  const lines: [string, unknown][] = latest ? [
    [fr ? "Neurologique" : "Neurological", latest.mentalStatus?.code ?? findings.levelOfConsciousness],
    [fr ? "Douleur" : "Pain", latest.pain?.score === undefined ? undefined : `${latest.pain.score}/10`],
    [fr ? "Respiratoire" : "Respiratory", findings.respiratoryConcerns ?? findings.respiratoryEffort],
    [fr ? "Cardiovasculaire" : "Cardiovascular", findings.cardiovascularConcerns ?? findings.rhythm],
    [fr ? "Gastro-intestinal / génito-urinaire" : "GI / GU", findings.giSymptoms ?? findings.guConcerns],
    [fr ? "Peau / plaies" : "Skin / wounds", findings.woundConcern ?? findings.pressureInjuryConcern],
    [fr ? "Mobilité / chute" : "Mobility / fall", latest.fallRisk?.level ?? findings.mobility],
    [fr ? "Voies / drains / dispositifs" : "Lines / drains / devices", findings.linesDrainsDevices],
    [fr ? "Sécurité" : "Safety", findings.safetyConcerns ?? findings.safetyPrecautions],
    [fr ? "Nutrition / hydratation" : "Nutrition / hydration", findings.hydrationConcerns ?? findings.diet],
    [fr ? "Ingestions et excrétions" : "Intake & output", findings.ioMonitoring],
    [fr ? "Événements significatifs" : "Significant events", findings.significantChange ?? latest.narrative],
  ] : [];
  return <section data-testid="inpatient-overview-nursing-authoritative-projection" style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: 14 }}>
    <h3 style={{ marginTop: 0 }}>{fr ? "Évaluation infirmière" : "Nursing Assessment"}</h3>
    {!latest ? <p>{fr ? "Aucune évaluation infirmière enregistrée." : "No saved nursing assessment."}</p> : <>
      <p><strong>{fr ? "Dernière évaluation" : "Latest assessment"}:</strong> {new Date(latest.clinicalEffectiveAt ?? latest.authoredAt).toLocaleString()} · {latest.authorDisplayName} · {latest.assessmentType ?? "REASSESSMENT"}</p>
      {lines.filter(([, value]) => value !== undefined && value !== "").map(([label, value]) => <p key={label} style={{ margin: "5px 0" }}><strong>{label}:</strong> {String(value).replaceAll("_", " ")}</p>)}
    </>}
    <button type="button" onClick={onOpen}>{fr ? "Ouvrir l’évaluation infirmière" : "Open Nursing Assessment"}</button>
  </section>;
}
