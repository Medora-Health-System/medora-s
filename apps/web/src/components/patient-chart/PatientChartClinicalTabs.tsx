"use client";

import React from "react";
import Link from "next/link";
import type { ChartSummary, ChartSummaryEncounter, ChartSummaryOrderItem } from "@/lib/chartApi";
import { getEncounterTypeLabelFr } from "@/lib/uiLabels";
import { getOrderItemStatusLabel } from "@/constants/orderStatusLabels";
import { nursingAssessmentDisplayLines, nursingAssessmentSignatureLineFr } from "./patientChartHelpers";
import { ClinicalResultViewer } from "@/components/clinical/ClinicalResultViewer";
import { clinicalResultFromChartOrderItem } from "@/lib/clinicalResultNormalize";

const emptyBox: React.CSSProperties = {
  padding: "16px 14px",
  fontSize: 14,
  color: "#555",
  backgroundColor: "#fafafa",
  border: "1px solid #eee",
  borderRadius: 6,
};

function formatDt(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function orderTypeFr(t: string): string {
  if (t === "LAB") return "Laboratoire";
  if (t === "IMAGING") return "Imagerie";
  if (t === "MEDICATION") return "Médicaments";
  return "Autre";
}

function flattenItems(enc: ChartSummaryEncounter): ChartSummaryOrderItem[] {
  const items: ChartSummaryOrderItem[] = [];
  for (const o of enc.orders ?? []) {
    for (const it of o.items || []) items.push(it);
  }
  return items;
}

function EncounterBlock({ enc, children }: { enc: ChartSummaryEncounter; children: React.ReactNode }) {
  const nursing = nursingAssessmentDisplayLines(enc.nursingAssessment);
  const nursingSig = nursingAssessmentSignatureLineFr(enc.nursingAssessment);
  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 14, marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        <Link href={`/app/encounters/${enc.id}`} style={{ color: "#0d47a1", textDecoration: "none" }}>
          {getEncounterTypeLabelFr(enc.type)} — le {formatDt(enc.createdAt)}
        </Link>
      </div>
      {nursing.length > 0 ? (
        <div style={{ marginBottom: 12, fontSize: 13, color: "#37474f" }}>
          <strong>Évaluation infirmière :</strong>
          <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
            {nursing.slice(0, 8).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          {nursingSig ? (
            <div style={{ fontSize: 12, color: "#546e7a", marginTop: 8, fontStyle: "italic" }}>{nursingSig}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function PatientOrdersTabContent({ chartSummary }: { chartSummary: ChartSummary | null }) {
  if (!chartSummary?.recentEncounters?.length) {
    return <div style={emptyBox}>Aucune consultation récente.</div>;
  }
  let hasRows = false;
  const blocks = chartSummary.recentEncounters.map((enc) => {
    const orders = enc.orders ?? [];
    if (orders.length === 0) return null;
    hasRows = true;
    return (
      <EncounterBlock enc={enc} key={enc.id}>
        {orders.map((o) => (
          <div key={o.id} style={{ marginBottom: 12, fontSize: 14 }}>
            <div style={{ fontWeight: 600, color: "#455a64" }}>{orderTypeFr(o.type)}</div>
            <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
              {(o.items || []).map((it) => (
                <li key={it.id}>
                  <strong>{it.displayLabel}</strong> — {getOrderItemStatusLabel(it.status)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </EncounterBlock>
    );
  });
  if (!hasRows) return <div style={emptyBox}>Aucun ordre enregistré sur les consultations récentes.</div>;
  return <div>{blocks}</div>;
}

export function PatientResultsTabContent({ chartSummary }: { chartSummary: ChartSummary | null }) {
  if (!chartSummary?.recentEncounters?.length) {
    return <div style={emptyBox}>Aucune consultation récente.</div>;
  }
  const blocks: React.ReactNode[] = [];
  for (const enc of chartSummary.recentEncounters) {
    const items = flattenItems(enc).filter((it) => it.catalogItemType === "LAB_TEST" || it.catalogItemType === "IMAGING_STUDY");
    const withResults = items.filter(
      (it) =>
        !!(
          it.result?.resultText?.trim() ||
          it.result?.attachmentSummaryFr ||
          (it.result?.attachments && it.result.attachments.length > 0) ||
          it.status === "RESULTED" ||
          it.status === "VERIFIED"
        )
    );
    if (withResults.length === 0) continue;
    blocks.push(
      <EncounterBlock enc={enc} key={`res-${enc.id}`}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#455a64" }}>Résultats</div>
        {withResults.map((it) => {
          const v = clinicalResultFromChartOrderItem({
            displayLabel: it.displayLabel,
            status: it.status,
            catalogItemType: it.catalogItemType,
            result: it.result,
          });
          return (
            <ClinicalResultViewer
              key={it.id}
              compact
              title={v.title}
              itemStatus={v.itemStatus}
              verifiedAt={v.verifiedAt}
              criticalValue={v.criticalValue}
              resultText={v.resultText}
              attachments={v.attachments}
              enteredByDisplayFr={v.enteredByDisplayFr}
              catalogItemType={v.catalogItemType}
            />
          );
        })}
      </EncounterBlock>
    );
  }
  if (blocks.length === 0) return <div style={emptyBox}>Aucun résultat laboratoire ou imagerie sur le dossier récent.</div>;
  return <div>{blocks}</div>;
}

export function PatientImagingTabContent({ chartSummary }: { chartSummary: ChartSummary | null }) {
  if (!chartSummary?.recentEncounters?.length) {
    return <div style={emptyBox}>Aucune consultation récente.</div>;
  }
  const blocks: React.ReactNode[] = [];
  for (const enc of chartSummary.recentEncounters) {
    const all = flattenItems(enc).filter((it) => it.catalogItemType === "IMAGING_STUDY");
    if (all.length === 0) continue;
    blocks.push(
      <EncounterBlock enc={enc} key={`img-${enc.id}`}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#455a64" }}>Imagerie demandée</div>
        <ul style={{ margin: "0 0 12px 0", paddingLeft: 18, fontSize: 14 }}>
          {all.map((it) => (
            <li key={it.id}>
              <strong>{it.displayLabel}</strong> — {getOrderItemStatusLabel(it.status)}
            </li>
          ))}
        </ul>
        {(() => {
          const withResults = all.filter(
            (it) =>
              !!(
                it.result?.resultText?.trim() ||
                it.result?.attachmentSummaryFr ||
                (it.result?.attachments && it.result.attachments.length > 0) ||
                it.status === "RESULTED" ||
                it.status === "VERIFIED"
              )
          );
          if (withResults.length === 0) return null;
          return (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#455a64" }}>Comptes rendus</div>
              {withResults.map((it) => {
                const v = clinicalResultFromChartOrderItem({
                  displayLabel: it.displayLabel,
                  status: it.status,
                  catalogItemType: it.catalogItemType,
                  result: it.result,
                });
                return (
                  <ClinicalResultViewer
                    key={`cr-${it.id}`}
                    compact
                    title={v.title}
                    itemStatus={v.itemStatus}
                    verifiedAt={v.verifiedAt}
                    criticalValue={v.criticalValue}
                    resultText={v.resultText}
                    attachments={v.attachments}
                    enteredByDisplayFr={v.enteredByDisplayFr}
                    catalogItemType={v.catalogItemType}
                  />
                );
              })}
            </>
          );
        })()}
      </EncounterBlock>
    );
  }
  if (blocks.length === 0) return <div style={emptyBox}>Aucune demande d’imagerie sur les consultations récentes.</div>;
  return <div>{blocks}</div>;
}

export function PatientMedicationsTabContent({ chartSummary }: { chartSummary: ChartSummary | null }) {
  if (!chartSummary?.recentEncounters?.length) {
    return <div style={emptyBox}>Aucune consultation récente.</div>;
  }
  const globalDisp = chartSummary.recentMedicationDispenses ?? [];
  const blocks: React.ReactNode[] = [];
  for (const enc of chartSummary.recentEncounters) {
    const medLines = flattenItems(enc).filter((it) => it.catalogItemType === "MEDICATION");
    const encDisp = enc.encounterMedicationDispenses ?? [];
    const administered = medLines.filter((it) => it.completedAt);
    if (medLines.length === 0 && encDisp.length === 0) continue;
    blocks.push(
      <EncounterBlock enc={enc} key={`med-${enc.id}`}>
        {medLines.length > 0 ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#455a64" }}>Prescriptions</div>
            <ul style={{ margin: "0 0 12px 0", paddingLeft: 18, fontSize: 14 }}>
              {medLines.map((it) => (
                <li key={it.id}>
                  <strong>{it.displayLabel}</strong> — {getOrderItemStatusLabel(it.status)}
                  <div style={{ fontSize: 12, color: "#616161", marginTop: 4 }}>
                    {it.medicationFulfillmentIntent === "ADMINISTER_CHART"
                      ? "À administrer au patient"
                      : "À envoyer à la pharmacie"}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {administered.length > 0 ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#455a64" }}>
              Médicaments administrés (dossier)
            </div>
            <ul style={{ margin: "0 0 12px 0", paddingLeft: 18, fontSize: 14 }}>
              {administered.map((it) => (
                <li key={`adm-${it.id}`}>
                  <strong>{it.displayLabel}</strong>
                  {it.completedAt && it.completedBy
                    ? ` — Administré par ${it.completedBy.firstName} ${it.completedBy.lastName} le ${formatDt(it.completedAt)}`
                    : it.completedAt
                      ? ` — le ${formatDt(it.completedAt)}`
                      : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {encDisp.length > 0 ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#455a64" }}>
              Médicaments délivrés par la pharmacie
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
              {encDisp.map((d) => {
                const label = d.catalogMedication.displayNameFr?.trim() || d.catalogMedication.name;
                const by = d.dispensedBy
                  ? `${d.dispensedBy.firstName} ${d.dispensedBy.lastName}`.trim()
                  : null;
                return (
                  <li key={d.id}>
                    <strong>{label}</strong> × {d.quantityDispensed}
                    {by ? ` — par ${by}` : null}
                    {` — le ${formatDt(d.dispensedAt)}`}
                    {d.dosageInstructions ? ` — ${d.dosageInstructions}` : null}
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </EncounterBlock>
    );
  }

  return wrapWithGlobalDispenseChart(blocks, globalDisp);
}

function wrapWithGlobalDispenseChart(blocks: React.ReactNode[], globalDisp: ChartSummary["recentMedicationDispenses"]) {
  const extra =
    globalDisp.length > 0 ? (
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Dernières dispensations (toutes consultations)</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
          {globalDisp.slice(0, 25).map((d) => {
            const label = d.catalogMedication.displayNameFr?.trim() || d.catalogMedication.name;
            const by = d.dispensedBy
              ? `${d.dispensedBy.firstName} ${d.dispensedBy.lastName}`.trim()
              : null;
            return (
              <li key={d.id}>
                <strong>{label}</strong> × {d.quantityDispensed}
                {by ? ` — par ${by}` : null}
                {` — le ${formatDt(d.dispensedAt)}`}
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  if (blocks.length === 0 && !extra) {
    return <div style={emptyBox}>Aucune prescription ni dispensation sur les consultations récentes.</div>;
  }

  return (
    <div>
      {extra}
      <div>{blocks}</div>
    </div>
  );
}
