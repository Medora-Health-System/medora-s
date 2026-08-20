"use client";

/**
 * MEDUI.INP.2F — Encounter medical-record Summary (read-only projection).
 * Reuses existing GET engines. Does not persist a duplicate Summary clinical store.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  humanizeClinicalLabel,
  projectInpatientNursingAssessmentOverview,
  projectNursingAdmissionOverview,
  type InpatientNursingAssessmentV1,
  type MedSurgNursingAdmissionDocV1,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { apiFetch } from "@/lib/apiClient";
import { fetchOrdersForEncounter } from "@/lib/clinicalWorklistApi";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  snapshotsToVitalSummaryReadings,
  VitalSummaryPanel,
} from "@/components/patients/VitalSummaryPanel";
import type { PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import { parseVitalsHistoryEntries } from "@/lib/encounterClinicalSafetyUi";
import { EmergencyResultsPanel } from "@/features/emergency/EmergencyResultsPanel";
import {
  fetchNursingAdmissionDocumentation,
  fetchProviderClinicalSynthesis,
  fetchProviderWorkspace,
} from "@/features/hospital-care/inpatientOperationsApi";
import {
  printEncounterChartLivePreview,
} from "@/components/encounters/EncounterChartLivePreview";
import { buildRxPrintFacilityIdentity } from "@/components/pharmacy/RxPrintLayout";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";

type EncounterLite = {
  id: string;
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
    dob?: string | Date | null;
    sexAtBirth?: string | null;
  } | null;
};

type Props = {
  encounterId: string;
  facilityId: string;
  encounter: EncounterLite | null;
  room?: string | null;
  admittedAt?: string | null;
  attendingName?: string | null;
  assignedRnName?: string | null;
  codeStatus?: string | null;
  isolation?: string[] | null;
  admissionDiagnosis?: string | null;
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
};

const card = { ...MEDORA_CARD_SHELL, padding: "10px 12px", marginBottom: 10 } as const;

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function displayOrDash(v: unknown, dash: string): string {
  if (v == null) return dash;
  const s = String(v).trim();
  return s ? s : dash;
}

/** Prefer order item clinical labels; fall back to order type (never invent medication names). */
function orderSummaryLabel(order: Record<string, unknown>, dash: string): string {
  const top =
    order.displayLabel ??
    order.label ??
    order.name ??
    order.medicationName ??
    order.displayName ??
    order.manualLabel;
  if (typeof top === "string" && top.trim()) return top.trim();
  const items = Array.isArray(order.items) ? order.items : [];
  const names: string[] = [];
  for (const it of items) {
    const row = asRecord(it);
    if (!row) continue;
    const n =
      row.displayName ??
      row.medicationName ??
      row.medicationLabelSnapshot ??
      row.manualLabel ??
      row.name ??
      row.label ??
      row.catalogName ??
      row.description ??
      row.notes;
    if (typeof n === "string" && n.trim()) names.push(n.trim());
  }
  if (names.length) return names.join(", ");
  if (typeof order.notes === "string" && order.notes.trim()) return order.notes.trim();
  const typ = displayOrDash(order.type ?? order.orderType, dash);
  const route = items.length ? asRecord(items[0])?.route : null;
  if (typeof route === "string" && route.trim() && typ !== dash) return `${typ} (${route.trim()})`;
  return typ;
}

export function InpatientEncounterMedicalRecordSummaryView({
  encounterId,
  facilityId,
  encounter,
  room,
  admittedAt,
  attendingName,
  assignedRnName,
  codeStatus,
  isolation,
  admissionDiagnosis,
  onNavigateSection,
}: Props) {
  const { t, language } = useI18n();
  const { facilities, careProfileJson } = useFacilityAndRoles();
  const dash = t("common.dash");
  const [printBusy, setPrintBusy] = useState(false);
  const [nursingAdmission, setNursingAdmission] = useState<string | null>(null);
  const [nursingAssessment, setNursingAssessment] = useState<string | null>(null);
  const [providerLines, setProviderLines] = useState<string[]>([]);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [marLines, setMarLines] = useState<string[]>([]);
  const [ioLine, setIoLine] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [vitalsSnaps, setVitalsSnaps] = useState<PatientTriageVitalsSnapshot[]>([]);
  const [triage, setTriage] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState(false);

  const patientId = encounter?.patient?.id ?? "";
  const patientName = [encounter?.patient?.firstName, encounter?.patient?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadError(false);
      try {
        const [
          admissionSettled,
          nursingSettled,
          providerSettled,
          synSettled,
          ordersSettled,
          marSettled,
          vitalsSettled,
          triageSettled,
        ] = await Promise.allSettled([
          fetchNursingAdmissionDocumentation(encounterId),
          apiFetch(
            `/encounters/${encodeURIComponent(encounterId)}/inpatient-nursing-assessment-events`,
            { facilityId },
          ),
          fetchProviderWorkspace(encounterId),
          fetchProviderClinicalSynthesis(encounterId),
          fetchOrdersForEncounter(facilityId, encounterId),
          apiFetch(`/encounters/${encodeURIComponent(encounterId)}/medication-administrations`, {
            facilityId,
          }),
          apiFetch(`/encounters/${encodeURIComponent(encounterId)}/vitals-history`, { facilityId }),
          apiFetch(`/encounters/${encodeURIComponent(encounterId)}/triage`, { facilityId }),
        ]);
        if (cancelled) return;

        if (admissionSettled.status === "fulfilled") {
          const documentation = (
            admissionSettled.value as unknown as { documentation?: MedSurgNursingAdmissionDocV1 }
          )?.documentation;
          const ov = projectNursingAdmissionOverview(documentation ?? null);
          if (ov.availability === "READY") {
            const sig = documentation?.nurseSignature;
            const bits = [
              ov.signed ? t("inpatientMedicalRecordSummaryInp2f.signed") : null,
              typeof sig?.displayName === "string" ? sig.displayName : null,
              typeof sig?.credentials === "string" ? sig.credentials : null,
              ov.admissionSource ? humanizeClinicalLabel(String(ov.admissionSource)) : null,
              ov.modeOfArrival ? humanizeClinicalLabel(String(ov.modeOfArrival)) : null,
              ov.conditionOnArrival ? humanizeClinicalLabel(String(ov.conditionOnArrival)) : null,
              ov.clinicalDocumentedAt,
              typeof sig?.signedAt === "string" ? sig.signedAt : null,
            ].filter((x) => typeof x === "string" && x.trim());
            setNursingAdmission(bits.length ? bits.map(String).join(" · ") : t("inpatientMedicalRecordSummaryInp2f.empty"));
          } else {
            setNursingAdmission(null);
          }
        }

        if (nursingSettled.status === "fulfilled") {
          const raw = nursingSettled.value;
          const entries = Array.isArray(asRecord(raw)?.entries)
            ? (asRecord(raw)?.entries as Array<{ assessment?: InpatientNursingAssessmentV1 }>)
            : [];
          // Event payload: `{ assessment: InpatientNursingAssessmentV1 }` (no nested `.assessment`).
          const latest = entries.at(-1)?.assessment ?? null;
          const ov = latest ? projectInpatientNursingAssessmentOverview(latest) : null;
          if (ov) {
            setNursingAssessment(
              [
                ov.assessmentType,
                ov.status,
                ov.mentalStatus,
                ov.narrativeExcerpt,
                ov.rn.displayName,
                ov.rn.role,
                ov.lastAssessmentAt,
              ]
                .filter((x) => x != null && String(x).trim())
                .map((x) => humanizeClinicalLabel(String(x)))
                .join(" · ") || null
            );
          } else {
            setNursingAssessment(null);
          }
        }

        const providerLinesAcc: string[] = [];
        if (providerSettled.status === "fulfilled") {
          const doc = asRecord(providerSettled.value.documentation);
          const hp = asRecord(doc?.hpDraft);
          if (hp) {
            const status = displayOrDash(hp.status, dash);
            providerLinesAcc.push(
              `${t("inpatientMedicalRecordSummaryInp2f.sections.provider")}: ${humanizeClinicalLabel(status)}`
            );
          }
          const notes = Array.isArray(doc?.progressNotes) ? doc!.progressNotes : [];
          for (const n of notes as Array<Record<string, unknown>>) {
            const text = typeof n.text === "string" ? n.text.trim() : "";
            if (!text) continue;
            const st = humanizeClinicalLabel(String(n.status ?? ""));
            providerLinesAcc.push(`${st}: ${text.slice(0, 240)}`);
          }
        }
        setProviderLines(providerLinesAcc);

        if (synSettled.status === "fulfilled") {
          const syn = asRecord(asRecord(synSettled.value)?.synthesis);
          const io = asRecord(syn?.intakeOutput);
          if (io && io.documentationPresent) {
            setIoLine(
              [
                io.intake24hMl != null ? `In ${io.intake24hMl} mL` : null,
                io.output24hMl != null ? `Out ${io.output24hMl} mL` : null,
                io.balance24hMl != null ? `Net ${io.balance24hMl} mL` : null,
              ]
                .filter(Boolean)
                .join(" · ") || null
            );
          } else {
            setIoLine(null);
          }
          const ev = Array.isArray(syn?.events) ? syn!.events : [];
          setEvents(
            (ev as Array<Record<string, unknown>>).map((e) => {
              const summary = displayOrDash(e.summary, dash);
              const at = displayOrDash(e.occurredAt, dash);
              return `${humanizeClinicalLabel(String(e.type ?? ""))} · ${at} · ${summary}`;
            })
          );
        }

        if (ordersSettled.status === "fulfilled") {
          const items = Array.isArray(ordersSettled.value)
            ? (ordersSettled.value as Array<Record<string, unknown>>)
            : [];
          setOrders(items);
        }

        if (marSettled.status === "fulfilled") {
          const rows = Array.isArray(marSettled.value)
            ? marSettled.value
            : Array.isArray(asRecord(marSettled.value)?.items)
              ? (asRecord(marSettled.value)?.items as unknown[])
              : [];
          setMarLines(
            (rows as Array<Record<string, unknown>>).map((row) => {
              const adminBy = asRecord(row.administeredBy);
              const byFromUser =
                adminBy &&
                [adminBy.firstName, adminBy.lastName]
                  .filter((x) => typeof x === "string" && String(x).trim())
                  .join(" ")
                  .trim();
              const name = displayOrDash(
                row.medicationLabelSnapshot ??
                  row.medicationName ??
                  row.displayName ??
                  row.drug,
                dash
              );
              const at = displayOrDash(
                row.effectiveAdministeredAt ?? row.administeredAt ?? row.clinicalTime,
                dash
              );
              const by = displayOrDash(
                row.administeredByDisplayName ?? row.performerDisplayName ?? byFromUser,
                dash
              );
              return `${name} · ${at} · ${by}`;
            })
          );
        }

        if (vitalsSettled.status === "fulfilled") {
          const parsed = parseVitalsHistoryEntries(vitalsSettled.value);
          setVitalsSnaps(
            parsed.map((entry, idx) => ({
              encounterId,
              encounterType: "INPATIENT",
              triageId: `vh-${idx}-${entry.recordedAt}`,
              vitalsJson: entry.vitals as Record<string, unknown>,
              updatedAt: entry.recordedAt,
              triageCompleteAt: entry.recordedAt,
              measuredAt: entry.recordedAt,
            }))
          );
        }

        if (triageSettled.status === "fulfilled") {
          setTriage(asRecord(triageSettled.value));
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [dash, encounterId, facilityId, t]);

  const vitalReadings = useMemo(
    () => snapshotsToVitalSummaryReadings(vitalsSnaps, language, t),
    [language, t, vitalsSnaps]
  );

  const facilityIdentity = useMemo(() => {
    const fac = facilities.find((f) => f.id === facilityId);
    return buildRxPrintFacilityIdentity({
      facilityName: fac?.name ?? null,
      careProfileJson: fac?.careProfileJson ?? careProfileJson,
    });
  }, [careProfileJson, facilities, facilityId]);

  const printChart = useCallback(async () => {
    if (!encounter) return;
    setPrintBusy(true);
    try {
      await printEncounterChartLivePreview({
        encounter: encounter as unknown as Record<string, unknown>,
        triage,
        orders,
        facilityId,
        facilityName: facilityIdentity.name,
        facilityIdentity,
        language,
        legalMedicalRecord: true,
      });
    } finally {
      setPrintBusy(false);
    }
  }, [encounter, facilityId, facilityIdentity, language, orders, triage]);

  const medOrders = orders.filter((o) => {
    const typ = String(o.type ?? o.orderType ?? "").toUpperCase();
    return typ.includes("MED") || typ.includes("RX") || typ.includes("PHARM");
  });

  return (
    <div data-testid="inpatient-panel-summary-live" data-readonly="true">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 16 }}>{t("inpatientMedicalRecordSummaryInp2f.title")}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("inpatientMedicalRecordSummaryInp2f.subtitle")}
          </p>
        </div>
        <button
          type="button"
          data-testid="inpatient-summary-print-entire-chart"
          onClick={() => void printChart()}
          disabled={printBusy}
          className="no-print"
          style={{
            height: 36,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontWeight: 600,
            cursor: printBusy ? "wait" : "pointer",
          }}
        >
          {printBusy
            ? t("inpatientMedicalRecordSummaryInp2f.printing")
            : t("inpatientMedicalRecordSummaryInp2f.printEntireChart")}
        </button>
      </div>
      {loadError ? (
        <p style={{ color: "#9a3412", fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.unavailable")}</p>
      ) : null}

      <section style={card} data-testid="summary-demographics">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.demographics")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {displayOrDash(patientName, dash)} · {t("inpatientProviderD4a26.header.dob")}{" "}
          {displayOrDash(encounter?.patient?.dob, dash)} · MRN{" "}
          {displayOrDash(encounter?.patient?.mrn, dash)}
        </p>
      </section>

      <section style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.facility")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {displayOrDash(facilityIdentity.name, dash)} · {displayOrDash(admittedAt, dash)} ·{" "}
          {displayOrDash(room, dash)} · {displayOrDash(admissionDiagnosis, dash)}
        </p>
      </section>

      <section style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.careTeam")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {displayOrDash(attendingName, dash)}
          {assignedRnName ? ` · RN ${assignedRnName}` : ""}
        </p>
      </section>

      <section style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.codeStatus")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {codeStatus ? humanizeClinicalLabel(codeStatus) : t("inpatientMedicalRecordSummaryInp2f.empty")}
        </p>
      </section>

      <section style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.isolation")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {isolation?.length
            ? isolation.map((x) => humanizeClinicalLabel(x)).join(", ")
            : t("inpatientMedicalRecordSummaryInp2f.empty")}
        </p>
      </section>

      <section style={card} data-testid="summary-nursing-admission">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.nursingAdmission")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {nursingAdmission ?? t("inpatientMedicalRecordSummaryInp2f.empty")}
        </p>
        <button type="button" className="no-print" onClick={() => onNavigateSection?.("admission")}>
          {t("inpatientMedicalRecordSummaryInp2f.openSource")}
        </button>
      </section>

      <section style={card} data-testid="summary-nursing-assessment">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.nursingAssessment")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {nursingAssessment ?? t("inpatientMedicalRecordSummaryInp2f.empty")}
        </p>
        <button type="button" className="no-print" onClick={() => onNavigateSection?.("nursing")}>
          {t("inpatientMedicalRecordSummaryInp2f.openSource")}
        </button>
      </section>

      <section style={card} data-testid="summary-vitals">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.vitals")}
        </h2>
        {vitalReadings.length ? (
          <VitalSummaryPanel readings={vitalReadings} actionsEnabled={false} />
        ) : (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.empty")}</p>
        )}
      </section>

      <section style={card} data-testid="summary-provider">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.provider")}
        </h2>
        {providerLines.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {providerLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.empty")}</p>
        )}
      </section>

      <section style={card} data-testid="summary-orders">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.orders")}
        </h2>
        {orders.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {orders.slice(0, 40).map((o, i) => (
              <li key={typeof o.id === "string" ? o.id : i}>
                {orderSummaryLabel(o, dash)} · {humanizeClinicalLabel(String(o.status ?? ""))}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.empty")}</p>
        )}
        <button type="button" className="no-print" onClick={() => onNavigateSection?.("orders")}>
          {t("inpatientMedicalRecordSummaryInp2f.openSource")}
        </button>
      </section>

      <section style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.medications")}
        </h2>
        {medOrders.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {medOrders.slice(0, 40).map((o, i) => (
              <li key={typeof o.id === "string" ? o.id : i}>{orderSummaryLabel(o, dash)}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.empty")}</p>
        )}
      </section>

      <section style={card} data-testid="summary-mar">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.mar")}
        </h2>
        {marLines.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {marLines.slice(0, 80).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.empty")}</p>
        )}
        <button type="button" className="no-print" onClick={() => onNavigateSection?.("medications")}>
          {t("inpatientMedicalRecordSummaryInp2f.openSource")}
        </button>
      </section>

      <section style={card} data-testid="summary-results">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.results")}
        </h2>
        <EmergencyResultsPanel
          encounterId={encounterId}
          facilityId={facilityId}
          refreshToken={0}
          canAcknowledgeResults={false}
          patient={
            encounter?.patient
              ? {
                  firstName: encounter.patient.firstName ?? null,
                  lastName: encounter.patient.lastName ?? null,
                  mrn: encounter.patient.mrn ?? null,
                  dob:
                    encounter.patient.dob instanceof Date
                      ? encounter.patient.dob.toISOString()
                      : (encounter.patient.dob ?? null),
                  sexAtBirth: encounter.patient.sexAtBirth ?? null,
                }
              : null
          }
          encounterMeta={{
            id: encounterId,
            createdAt: new Date().toISOString(),
          }}
        />
      </section>

      <section style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.intakeOutput")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {ioLine ?? t("inpatientMedicalRecordSummaryInp2f.empty")}
        </p>
      </section>

      <section style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.events")}
        </h2>
        {events.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {events.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.empty")}</p>
        )}
      </section>

      {patientId ? <span data-testid="summary-patient-id-hidden" hidden>{patientId}</span> : null}
    </div>
  );
}
