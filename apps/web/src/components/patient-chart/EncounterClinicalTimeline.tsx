"use client";

import React from "react";
import Link from "next/link";
import type { ChartSummaryEncounter, ChartSummaryOrderItem } from "@/lib/chartApi";
import type { FollowUpRow } from "@/lib/followUpsApi";
import { formatVitalsHeaderLine } from "@/lib/patientVitals";
import {
  diagnosisDisplayFr,
  parseAdmissionSummaryForChart,
  parseDischargeSummaryForChart,
  parseNursingAssessmentSectionsForChart,
} from "./patientChartHelpers";
import { parseNursingProceduresForChart } from "@/lib/nursingProcedures";
import { getOrderItemStatusLabel } from "@/constants/orderStatusLabels";
import {
  getEncounterStatusLabelFr,
  getEncounterTypeLabelFr,
  getFollowUpStatusLabelFr,
} from "@/lib/uiLabels";

const subTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#455a64",
  marginTop: 12,
  marginBottom: 6,
  letterSpacing: "0.02em",
};

const blockStyle: React.CSSProperties = {
  padding: "14px 16px",
  marginBottom: 14,
  backgroundColor: "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  borderLeft: "4px solid #1565c0",
};

const listStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  paddingLeft: 18,
  fontSize: 13,
  color: "#263238",
  lineHeight: 1.45,
};

function formatShortDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function physicianName(u: { firstName: string; lastName: string } | null | undefined): string | null {
  if (!u) return null;
  const s = `${u.firstName} ${u.lastName}`.trim();
  return s || null;
}

function medicationIntentLabelFr(intent: string | null): string | null {
  if (intent === "ADMINISTER_CHART") return "Administration au dossier";
  if (intent === "PHARMACY_DISPENSE") return "Dispensation pharmacie";
  return null;
}

function diagnosisStatusLabelFr(status: string): string {
  if (status === "ACTIVE") return "Actif";
  if (status === "RESOLVED") return "Résolu";
  return status;
}

function orderTypeHeadingFr(orderType: string): string {
  const m: Record<string, string> = {
    LAB: "Analyses demandées",
    IMAGING: "Imagerie demandée",
    MEDICATION: "Médicaments prescrits",
  };
  return m[orderType] ?? "Ordres";
}

function flattenOrderItems(enc: ChartSummaryEncounter): ChartSummaryOrderItem[] {
  const orders = enc.orders ?? [];
  const items: ChartSummaryOrderItem[] = [];
  for (const o of orders) {
    for (const it of o.items || []) items.push(it);
  }
  return items;
}

function OrderItemLine({
  it,
  showMode,
}: {
  it: ChartSummaryOrderItem;
  showMode: "request" | "result";
}) {
  if (showMode === "result") {
    const hasResult = !!(
      it.result?.resultText?.trim() ||
      it.result?.attachmentSummaryFr ||
      it.result?.verifiedAt ||
      it.status === "RESULTED" ||
      it.status === "VERIFIED"
    );
    if (!hasResult) return null;
    const crit = it.result?.criticalValue ? "Valeur critique — " : "";
    const txt = it.result?.resultText?.trim();
    const att = it.result?.attachmentSummaryFr;
    const statusFr = getOrderItemStatusLabel(it.status);
    const body = txt ? `${crit}${txt}` : att ? `${crit}${att}` : `${crit}${statusFr}`;
    return (
      <li>
        <strong>{it.displayLabel}</strong>
        {` — ${body}`}
        {it.result?.verifiedAt ? ` (${formatShortDateTime(it.result.verifiedAt)})` : null}
      </li>
    );
  }

  const statusFr = getOrderItemStatusLabel(it.status);
  const intentFr = it.catalogItemType === "MEDICATION" ? medicationIntentLabelFr(it.medicationFulfillmentIntent) : null;
  const extras: string[] = [];
  if (intentFr) extras.push(intentFr);
  extras.push(statusFr);

  return (
    <li>
      <strong>{it.displayLabel}</strong>
      {extras.length ? ` — ${extras.join(" · ")}` : null}
    </li>
  );
}

function NurseAdminLine({ it }: { it: ChartSummaryOrderItem }) {
  if (it.catalogItemType !== "MEDICATION" || !it.completedAt) return null;
  const who = physicianName(it.completedBy);
  return (
    <li>
      <strong>{it.displayLabel}</strong>
      {who ? (
        <>
          {" "}
          — Administré par {who}. Le {formatShortDateTime(it.completedAt)}.
        </>
      ) : (
        <>
          {" "}
          — Complété le {formatShortDateTime(it.completedAt)} ({getOrderItemStatusLabel(it.status)})
        </>
      )}
    </li>
  );
}

export function EncounterClinicalTimeline({
  encounters,
  followUps,
}: {
  encounters: ChartSummaryEncounter[];
  followUps: FollowUpRow[];
}) {
  if (!encounters.length) {
    return (
      <div style={{ padding: 16, color: "#666", fontSize: 14, background: "#fafafa", borderRadius: 6 }}>
        Aucune consultation récente à afficher.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {encounters.map((enc) => {
        const consultWhen = formatShortDateTime(enc.createdAt);
        const nursingSections = parseNursingAssessmentSectionsForChart(enc.nursingAssessment);
        const nursingProcedureSections = parseNursingProceduresForChart(enc.nursingAssessment);
        const discharge = parseDischargeSummaryForChart(enc.dischargeSummaryJson);
        const admission = parseAdmissionSummaryForChart(enc.admissionSummaryJson);
        const items = flattenOrderItems(enc);
        const labItems = items.filter((i) => i.catalogItemType === "LAB_TEST");
        const imgItems = items.filter((i) => i.catalogItemType === "IMAGING_STUDY");
        const medItems = items.filter((i) => i.catalogItemType === "MEDICATION");
        const resultItemsPreview = items.filter((it) => {
          if (it.catalogItemType !== "LAB_TEST" && it.catalogItemType !== "IMAGING_STUDY") return false;
          return !!(
            it.result?.resultText?.trim() ||
            it.result?.attachmentSummaryFr ||
            it.result?.verifiedAt ||
            it.status === "RESULTED" ||
            it.status === "VERIFIED"
          );
        });
        const adminLines = medItems.filter((it) => it.completedAt);
        const encDisp = enc.encounterMedicationDispenses ?? [];
        const encDiags = enc.encounterDiagnoses ?? [];
        const encFollowUps = followUps.filter((fu) => fu.encounterId === enc.id);

        const vitals = (enc.triage?.vitalsJson || {}) as Record<string, number | string | null>;
        const vitalsLine = formatVitalsHeaderLine(vitals);
        const esi = enc.triage?.esi != null ? `ESI ${enc.triage.esi}` : null;
        const hasTriageBlock = !!(vitalsLine.trim() || enc.triage?.chiefComplaint || enc.triage?.esi != null);

        return (
          <div key={enc.id} style={blockStyle}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0d47a1" }}>
                <Link href={`/app/encounters/${enc.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                  Consultation — {getEncounterTypeLabelFr(enc.type)}
                </Link>
              </div>
              <div style={{ fontSize: 13, color: "#455a64", marginTop: 4 }}>
                Le {consultWhen}
                {enc.roomLabel ? ` · Salle : ${enc.roomLabel}` : null}
                {physicianName(enc.physicianAssigned ?? null)
                  ? ` · Médecin attribué : ${physicianName(enc.physicianAssigned ?? null)}`
                  : null}
              </div>
              <div style={{ fontSize: 12, color: "#757575", marginTop: 4 }}>
                {getEncounterStatusLabelFr(enc.status)}
                {esi ? ` · ${esi}` : null}
              </div>
              {enc.admittedAt ? (
                <div style={{ fontSize: 12, color: "#6a1b9a", fontWeight: 600, marginTop: 6 }}>
                  Hospitalisation — décision enregistrée le{" "}
                  {formatShortDateTime(
                    typeof enc.admittedAt === "string" ? enc.admittedAt : String(enc.admittedAt ?? "")
                  )}
                </div>
              ) : null}
            </div>

            {hasTriageBlock && (
              <>
                <div style={subTitle}>Signes vitaux et accueil (cette consultation)</div>
                <div style={{ fontSize: 13, color: "#263238", fontFamily: "ui-monospace, monospace" }}>
                  {vitalsLine.trim() ? vitalsLine : "—"}
                </div>
                {enc.triage?.esi != null ? (
                  <div style={{ fontSize: 13, marginTop: 6, color: "#546e7a" }}>{esi}</div>
                ) : null}
                {enc.triage?.chiefComplaint ? (
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    <span style={{ color: "#666" }}>Motif (accueil) : </span>
                    {enc.triage.chiefComplaint}
                  </div>
                ) : null}
              </>
            )}

            {(nursingSections.length > 0 || nursingProcedureSections.length > 0) && (
              <>
                <div style={subTitle}>Évaluation infirmière</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {nursingSections.map((s, i) => (
                    <div key={`nsec-${i}`}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#546e7a" }}>{s.labelFr}</div>
                      <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{s.text}</div>
                    </div>
                  ))}
                  {nursingProcedureSections.map((s) => (
                    <div key="proc-iv">
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#546e7a" }}>{s.labelFr}</div>
                      <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{s.text}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(enc.clinicianImpressionPreview || enc.treatmentPlanPreview || encDiags.length > 0) && (
              <>
                <div style={subTitle}>Évaluation médicale et diagnostics</div>
                {enc.clinicianImpressionPreview ? (
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: "#666" }}>Impression clinique : </span>
                    {enc.clinicianImpressionPreview}
                  </div>
                ) : null}
                {enc.treatmentPlanPreview ? (
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: "#666" }}>Plan thérapeutique : </span>
                    {enc.treatmentPlanPreview}
                  </div>
                ) : null}
                {encDiags.length > 0 ? (
                  <ul style={listStyle}>
                    {encDiags.map((d) => (
                      <li key={d.id}>
                        {diagnosisDisplayFr(d.description, d.code)} ({diagnosisStatusLabelFr(d.status)})
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}

            {admission && (
              <>
                <div style={subTitle}>Décision d&apos;admission (hospitalisation)</div>
                <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                  {admission.admissionReason ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>Motif d&apos;admission : </span>
                      {admission.admissionReason}
                    </div>
                  ) : null}
                  {admission.serviceUnit ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>Service / unité : </span>
                      {admission.serviceUnit}
                    </div>
                  ) : null}
                  {admission.admissionDiagnosis ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>Diagnostic d&apos;admission : </span>
                      {admission.admissionDiagnosis}
                    </div>
                  ) : null}
                  {admission.careLevel ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>Niveau de soins : </span>
                      {admission.careLevel}
                    </div>
                  ) : null}
                  {admission.conditionAtAdmission ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>Condition à l&apos;admission : </span>
                      <span style={{ whiteSpace: "pre-wrap" }}>{admission.conditionAtAdmission}</span>
                    </div>
                  ) : null}
                  {admission.initialPlan ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>Plan initial : </span>
                      <span style={{ whiteSpace: "pre-wrap" }}>{admission.initialPlan}</span>
                    </div>
                  ) : null}
                  {admission.responsiblePhysicianName ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>Médecin responsable : </span>
                      {admission.responsiblePhysicianName}
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {items.length > 0 && (
              <>
                <div style={subTitle}>Ordres</div>
                {labItems.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "#607d8b" }}>{orderTypeHeadingFr("LAB")}</div>
                    <ul style={listStyle}>
                      {labItems.map((it) => (
                        <OrderItemLine key={it.id} it={it} showMode="request" />
                      ))}
                    </ul>
                  </div>
                )}
                {imgItems.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "#607d8b" }}>{orderTypeHeadingFr("IMAGING")}</div>
                    <ul style={listStyle}>
                      {imgItems.map((it) => (
                        <OrderItemLine key={it.id} it={it} showMode="request" />
                      ))}
                    </ul>
                  </div>
                )}
                {medItems.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "#607d8b" }}>{orderTypeHeadingFr("MEDICATION")}</div>
                    <ul style={listStyle}>
                      {medItems.map((it) => (
                        <OrderItemLine key={it.id} it={it} showMode="request" />
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {resultItemsPreview.length > 0 && (
              <>
                <div style={subTitle}>Résultats (aperçu)</div>
                <ul style={listStyle}>
                  {resultItemsPreview.map((it) => (
                    <OrderItemLine key={`r-${it.id}`} it={it} showMode="result" />
                  ))}
                </ul>
              </>
            )}

            {(adminLines.length > 0 || encDisp.length > 0) && (
              <>
                <div style={subTitle}>Dispensation et administrations</div>
                {adminLines.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, color: "#607d8b", marginBottom: 4 }}>Ordres exécutés (administration)</div>
                    <ul style={listStyle}>
                      {adminLines.map((it) => (
                        <NurseAdminLine key={it.id} it={it} />
                      ))}
                    </ul>
                  </>
                )}
                {encDisp.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, color: "#607d8b", marginBottom: 4 }}>Dispensation enregistrée</div>
                    <ul style={listStyle}>
                      {encDisp.map((d) => {
                        const label =
                          d.catalogMedication.displayNameFr?.trim() || d.catalogMedication.name;
                        const by = physicianName(d.dispensedBy);
                        return (
                          <li key={d.id}>
                            <strong>{label}</strong> × {d.quantityDispensed}
                            {by ? ` — par ${by}` : null}
                            {` — le ${formatShortDateTime(d.dispensedAt)}`}
                            {d.dosageInstructions ? ` — ${d.dosageInstructions}` : null}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </>
            )}

            {discharge && (
              <>
                <div style={subTitle}>Sortie de consultation</div>
                <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                  {discharge.disposition ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>Disposition : </span>
                      {discharge.disposition}
                    </div>
                  ) : null}
                  {discharge.exitCondition ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>État à la sortie : </span>
                      {discharge.exitCondition}
                    </div>
                  ) : null}
                  {discharge.dischargeInstructions ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>Instructions de sortie : </span>
                      {discharge.dischargeInstructions}
                    </div>
                  ) : null}
                  {discharge.medicationsGiven ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>Médicaments remis / prescrits : </span>
                      {discharge.medicationsGiven}
                    </div>
                  ) : null}
                  {discharge.followUp ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>Suivi recommandé : </span>
                      {discharge.followUp}
                    </div>
                  ) : null}
                  {discharge.returnIfWorse ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>Retour si aggravation : </span>
                      {discharge.returnIfWorse}
                    </div>
                  ) : null}
                  {discharge.patientDestination ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>Destination du patient : </span>
                      {discharge.patientDestination}
                    </div>
                  ) : null}
                  {discharge.dischargeMode ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>Mode de sortie : </span>
                      {discharge.dischargeMode}
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {encFollowUps.length > 0 && (
              <>
                <div style={subTitle}>Suivis associés</div>
                <ul style={listStyle}>
                  {encFollowUps.map((fu) => (
                    <li key={fu.id}>
                      {formatShortDateTime(fu.dueDate)} — {fu.reason || "Suivi"}
                      {" — "}
                      {getFollowUpStatusLabelFr(fu.status)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
