"use client";

/**
 * D4A.2 / D4A.2.1 — Disposition-specific nursing execution (non-HOME pathways).
 * ED.HOSP.1F: Observation/Admission use structured controls; other pathways keep existing fields.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ED_HOSP_1F_BELONGINGS_CODES,
  ED_HOSP_1F_CONDITION_CODES,
  ED_HOSP_1F_FALL_CODES,
  ED_HOSP_1F_INFUSION_CODES,
  ED_HOSP_1F_IV_CODES,
  ED_HOSP_1F_ORDER_ACK_CODES,
  ED_HOSP_1F_SKIN_CODES,
  ED_HOSP_1F_TRANSPORT_CODES,
  ED_HOSP_1F_UNIT_PENDING,
  OXYGEN_DELIVERY_DEVICES,
  decodeIvAccessCode,
  deriveInfusionPresence,
  deriveOrderAckFromOrders,
  emptyAdaptiveEdNursingExecution,
  encodeIvAccessValue,
  encodeReceivingNurse,
  evaluateAdaptiveNursingCompletion,
  hydrateObservationNursingDefaults,
  mergeAdaptiveEdNursingIntoNursingAssessment,
  nursingSectionsForPathway,
  parseEncounterOrdersForComposer,
  pathwayFromDispositionBadgeVariant,
  pathwayFromDispositionOutcomeUi,
  projectNursingDepartureReadiness,
  readAdaptiveEdNursingExecution,
  receivingUnitOptionsForPathway,
  edNursingHandoffStatusFromErHandoff,
  readErHandoffV1FromNursingAssessment,
  type AdaptiveNursingPathway,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { erDispositionBadgeFromEncounterJson } from "@/features/emergency/erTrackboardDispositionBadge";
import { fetchActiveInternalPlacement } from "@/features/emergency/internalPlacementApi";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { EdNursingDocumentationComposer } from "@/features/emergency/EdNursingDocumentationComposer";

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

function isoToDatetimeLocal(iso: string): string {
  if (!iso.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Chip({
  selected,
  disabled,
  onClick,
  children,
  testId,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "5px 10px",
        borderRadius: 999,
        border: selected ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
        background: selected ? "#eff6ff" : "#fff",
        color: selected ? "#1e3a8a" : "#334155",
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
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
    version?: number | null;
    chiefComplaint?: string | null;
    visitReason?: string | null;
    patient?: {
      firstName?: string | null;
      lastName?: string | null;
      mrn?: string | null;
    } | null;
    physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
    nurseAssigned?: { id?: string; firstName?: string | null; lastName?: string | null } | null;
  };
  outcomeUi?: string | null;
  admissionDecisionSigned: boolean;
  onSaved: () => void | Promise<void>;
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const { userId } = useFacilityAndRoles();
  const badge = erDispositionBadgeFromEncounterJson(encounter);
  const pathway = useMemo(() => {
    if (outcomeUi) return pathwayFromDispositionOutcomeUi(outcomeUi);
    return pathwayFromDispositionBadgeVariant(badge?.variant ?? null);
  }, [outcomeUi, badge?.variant]);

  const structured = pathway === "ADMISSION" || pathway === "OBSERVATION";
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
  const [firstInvalidId, setFirstInvalidId] = useState<string | null>(null);
  const fieldRefs = useRef<Record<string, HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement | null>>({});
  const [chartUnit, setChartUnit] = useState<string | null>(null);
  const [chartIv, setChartIv] = useState<string>("");
  const [infusionPresent, setInfusionPresent] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const next = readAdaptiveEdNursingExecution(encounter.nursingAssessment);
    setSections(
      Object.fromEntries(
        Object.entries(next?.sections ?? {}).map(([k, v]) => [k, v == null ? "" : String(v)])
      ) as Record<string, string>
    );
    hydratedRef.current = false;
  }, [encounter.nursingAssessment, pathway]);

  useEffect(() => {
    if (!structured) return;
    let cancelled = false;
    void (async () => {
      const [placement, ivRaw, ordersRaw] = await Promise.all([
        fetchActiveInternalPlacement(encounterId).catch(() => null),
        apiFetch(`/encounters/${encounterId}/iv-access`, { facilityId }).catch(() => null),
        apiFetch(`/encounters/${encounterId}/orders`, { facilityId }).catch(() => null),
      ]);
      if (cancelled) return;
      const unit = placement?.assignedUnitCode ?? null;
      const bed = placement?.assignedBedKey ?? null;
      const room = placement?.assignedRoomKey ?? null;
      setChartUnit(unit);
      const ivActive =
        ivRaw && typeof ivRaw === "object" && !Array.isArray(ivRaw) && Array.isArray((ivRaw as { active?: unknown }).active)
          ? ((ivRaw as { active: Array<{ site?: string; gauge?: string }> }).active ?? [])
          : [];
      const ivLines = ivActive.map((row) => ({ site: row.site, gauge: row.gauge, kind: "PERIPHERAL" }));
      setChartIv(
        ivLines.length === 0
          ? t("emergencyAdaptiveNursing.iv.NO_ACCESS")
          : ivLines.map((l) => [l.site, l.gauge].filter(Boolean).join(" ")).join(" · ")
      );
      const orders = parseEncounterOrdersForComposer(ordersRaw);
      const lite = orders.flatMap((o) => {
        const items = o.items?.length ? o.items : [null];
        return items.map((item) => {
          const display = [
            item?.manualLabel,
            item?.displayLabelEn,
            item?.displayLabelFr,
            o.type,
          ]
            .filter(Boolean)
            .join(" ");
          return {
            category: o.type,
            status: item?.status ?? o.status,
            displayName: display,
            isInfusion: /infusion|drip|perfusion|iv fluid|soluté/i.test(display),
          };
        });
      });
      setInfusionPresent(deriveInfusionPresence(lite));
      const ack = deriveOrderAckFromOrders(lite);
      if (!hydratedRef.current) {
        hydratedRef.current = true;
        setSections((prev) => {
          const next = hydrateObservationNursingDefaults({
            sections: prev,
            pathway: pathway === "ADMISSION" ? "ADMISSION" : "OBSERVATION",
            chart: {
              assignedUnitCode: unit,
              assignedBedKey: bed,
              assignedRoomKey: room,
              ivLines,
              oxygenDevice: null,
            },
          });
          if (!String(next.admissionOrderAck ?? "").trim()) next.admissionOrderAck = ack;
          if (!String(next.infusions ?? "").trim() && !deriveInfusionPresence(lite)) {
            next.infusions = "NONE";
          }
          return Object.fromEntries(
            Object.entries(next).map(([k, v]) => [k, v == null ? "" : String(v)])
          ) as Record<string, string>;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [structured, encounterId, facilityId, t, pathway]);

  const completion = useMemo(
    () =>
      evaluateAdaptiveNursingCompletion({
        pathway,
        sections,
        physicianPathway: pathway,
        admissionDecisionSigned,
        completing: false,
      }),
    [pathway, sections, admissionDecisionSigned]
  );

  const readiness = useMemo(
    () =>
      projectNursingDepartureReadiness({
        sections,
        requiredFieldIds: completion.items.filter((i) => i.required).map((i) => i.fieldId),
      }),
    [sections, completion.items]
  );

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
    setFirstInvalidId(null);
    try {
      const evaluation = evaluateAdaptiveNursingCompletion({
        pathway,
        sections,
        physicianPathway: pathway,
        admissionDecisionSigned,
        completing: complete,
      });
      if (complete && !evaluation.ok) {
        const firstMissing = evaluation.items.find(
          (i) => i.required && i.status !== "COMPLETE"
        )?.fieldId;
        setFirstInvalidId(firstMissing ?? null);
        if (firstMissing && fieldRefs.current[firstMissing]) {
          fieldRefs.current[firstMissing]?.focus();
        }
        const missingLabels = evaluation.missingCodes
          .map((code) => {
            const fieldId = code.replace(/^NURSING_MISSING_/, "");
            return t(sectionLabelKey(pathway, fieldId));
          })
          .filter(Boolean);
        setInfo(
          missingLabels.length > 0
            ? `${t("emergencyAdaptiveNursing.errors.NURSING_COMPLETION_INCOMPLETE")}: ${missingLabels.join(", ")}`
            : t(`emergencyAdaptiveNursing.errors.${evaluation.errors[0]}`) ||
                t("emergencyAdaptiveNursing.errors.NURSING_COMPLETION_INCOMPLETE")
        );
        return;
      }
      const prior = readAdaptiveEdNursingExecution(encounter.nursingAssessment);
      const payload = emptyAdaptiveEdNursingExecution(pathway);
      payload.sections = { ...sections };
      payload.revision = (prior?.revision ?? 0) + 1;
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

  const locked = !canEdit || saving;
  const unitOptions = useMemo(() => {
    const codes = receivingUnitOptionsForPathway({
      pathway: pathway === "ADMISSION" ? "ADMISSION" : "OBSERVATION",
      assignedUnitCode: chartUnit,
    });
    if (pathway !== "ADMISSION") return codes;
    return [ED_HOSP_1F_UNIT_PENDING, ...codes.filter((c) => c !== ED_HOSP_1F_UNIT_PENDING)];
  }, [pathway, chartUnit]);
  const patientName = `${encounter.patient?.firstName ?? ""} ${encounter.patient?.lastName ?? ""}`.trim();
  const providerName = `${encounter.physicianAssigned?.firstName ?? ""} ${encounter.physicianAssigned?.lastName ?? ""}`.trim();
  const assignedNurseName = `${encounter.nurseAssigned?.firstName ?? ""} ${encounter.nurseAssigned?.lastName ?? ""}`.trim();
  const diagnosis =
    encounter.admissionSummaryJson &&
    typeof encounter.admissionSummaryJson === "object" &&
    !Array.isArray(encounter.admissionSummaryJson)
      ? String(
          (encounter.admissionSummaryJson as { admissionDiagnosis?: unknown }).admissionDiagnosis ?? ""
        ).trim()
      : "";
  const sessionNurseValue = encodeReceivingNurse({
    userId,
    displayName: t("emergencyAdaptiveNursing.sessionNurse"),
    source: "SESSION",
  });
  const assignedNurseValue = assignedNurseName
    ? encodeReceivingNurse({
        userId: encounter.nurseAssigned?.id ?? null,
        displayName: assignedNurseName,
        source: "ASSIGNED",
      })
    : "";

  return (
    <div
      style={{ ...MEDORA_CARD_SHELL, padding: 14 }}
      data-testid="adaptive-disposition-nursing"
      data-pathway={pathway}
      data-structured={structured ? "true" : "false"}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
        {t(`emergencyAdaptiveNursing.title.${pathway}`)}
      </h3>

      {structured ? (
        <div
          data-testid="adaptive-nursing-completion-summary"
          style={{
            marginBottom: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 6,
          }}
          aria-live="polite"
        >
          <p style={{ margin: 0, fontWeight: 700, gridColumn: "1 / -1", fontSize: 12 }}>
            {t("emergencyAdaptiveNursing.departureTitle")}
          </p>
          {readiness.map((chip) => (
            <div
              key={chip.groupId}
              data-testid={`nursing-ready-${chip.groupId}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                fontSize: 12,
                background: chip.ready ? "#f0fdf4" : "#fff",
              }}
            >
              <span>{t(`emergencyAdaptiveNursing.groups.${chip.groupId}`)}</span>
              <strong>{chip.ready ? t("emergencyAdaptiveNursing.ready") : t("emergencyAdaptiveNursing.pending")}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div data-testid="adaptive-nursing-completion-summary" aria-live="polite" />
      )}

      {(pathway === "ADMISSION" || pathway === "OBSERVATION") && !admissionDecisionSigned ? (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#b45309", fontWeight: 600 }}>
          {t(
            pathway === "OBSERVATION"
              ? "emergencyAdaptiveNursing.awaitingSignedObservation"
              : "emergencyAdaptiveNursing.awaitingSignedAdmission"
          )}
        </p>
      ) : null}

      {structured ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label htmlFor="adaptive-nursing-field-receivingUnit" style={labelStyle}>
              {t(sectionLabelKey(pathway, "receivingUnit"))} *
            </label>
            <select
              id="adaptive-nursing-field-receivingUnit"
              ref={(el) => {
                fieldRefs.current.receivingUnit = el;
              }}
              value={sections.receivingUnit ?? ""}
              disabled={locked}
              data-testid="adaptive-nursing-receivingUnit"
              onChange={(e) => patch("receivingUnit", e.target.value)}
              style={inputBase}
            >
              {unitOptions.map((code) => (
                <option key={code} value={code}>
                  {t(`emergencyAdaptiveNursing.units.${code}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t(sectionLabelKey(pathway, "assignedBed"))}</label>
            <div data-testid="adaptive-nursing-assignedBed" style={{ ...inputBase, background: "#f8fafc" }}>
              {sections.assignedBed === "BED_PENDING" || !sections.assignedBed
                ? t("emergencyAdaptiveNursing.bedPending")
                : sections.assignedBed}
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t(sectionLabelKey(pathway, "receivingNurse"))} *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {assignedNurseValue ? (
                <Chip
                  selected={sections.receivingNurse === assignedNurseValue}
                  disabled={locked}
                  testId="adaptive-nursing-receivingNurse-assigned"
                  onClick={() => patch("receivingNurse", assignedNurseValue)}
                >
                  {t("emergencyAdaptiveNursing.assignedEdNurse")}: {assignedNurseName}
                </Chip>
              ) : null}
              <Chip
                selected={sections.receivingNurse === sessionNurseValue}
                disabled={locked}
                testId="adaptive-nursing-receivingNurse"
                onClick={() => patch("receivingNurse", sessionNurseValue)}
              >
                {t("emergencyAdaptiveNursing.sessionNurse")}
              </Chip>
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t(sectionLabelKey(pathway, "handoff"))} *</label>
            <div
              data-testid="nursing-handoff-facts"
              style={{
                display: "grid",
                gap: 4,
                fontSize: 12,
                padding: 8,
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                marginBottom: 6,
              }}
            >
              <div>
                <strong>{t("emergencyAdaptiveNursing.handoffFacts.patient")}: </strong>
                {patientName || t("emergencyAdaptiveNursing.handoffFacts.none")}
                {encounter.patient?.mrn ? ` · ${encounter.patient.mrn}` : ""}
              </div>
              <div>
                <strong>{t("emergencyAdaptiveNursing.handoffFacts.diagnosis")}: </strong>
                {diagnosis || encounter.chiefComplaint || encounter.visitReason || t("emergencyAdaptiveNursing.handoffFacts.none")}
              </div>
              <div>
                <strong>{t("emergencyAdaptiveNursing.handoffFacts.iv")}: </strong>
                {chartIv || t("emergencyAdaptiveNursing.handoffFacts.none")}
              </div>
              <div>
                <strong>{t("emergencyAdaptiveNursing.handoffFacts.destination")}: </strong>
                {sections.receivingUnit
                  ? t(`emergencyAdaptiveNursing.units.${sections.receivingUnit}` as Parameters<typeof t>[0])
                  : t("emergencyAdaptiveNursing.handoffFacts.none")}
              </div>
              <div>
                <strong>{t("emergencyAdaptiveNursing.handoffFacts.bed")}: </strong>
                {sections.assignedBed === "BED_PENDING"
                  ? t("emergencyAdaptiveNursing.bedPending")
                  : sections.assignedBed || t("emergencyAdaptiveNursing.handoffFacts.none")}
              </div>
              <div>
                <strong>{t("emergencyAdaptiveNursing.handoffFacts.provider")}: </strong>
                {providerName || t("emergencyAdaptiveNursing.handoffFacts.none")}
              </div>
            </div>
            <div
              data-testid="adaptive-nursing-handoff"
              style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a" }}
            >
              {t("emergencyAdaptiveNursing.groups.handoff")}:{" "}
              {t(
                `edHosp1fNursingDocumentation.handoffStatus.${edNursingHandoffStatusFromErHandoff(
                  readErHandoffV1FromNursingAssessment(encounter.nursingAssessment)
                )}`
              )}
              {sections.handoff === "HANDOFF_REVIEWED" ? ` · HANDOFF_REVIEWED` : ""}
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t(sectionLabelKey(pathway, "admissionOrderAck"))}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ED_HOSP_1F_ORDER_ACK_CODES.map((code) => (
                <Chip
                  key={code}
                  selected={sections.admissionOrderAck === code}
                  disabled={locked}
                  testId={`adaptive-nursing-admissionOrderAck-${code}`}
                  onClick={() => patch("admissionOrderAck", code)}
                >
                  {t(`emergencyAdaptiveNursing.orderAck.${code}`)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t(sectionLabelKey(pathway, "ivAccess"))} *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} data-testid="adaptive-nursing-ivAccess">
              {ED_HOSP_1F_IV_CODES.map((code) => (
                <Chip
                  key={code}
                  selected={decodeIvAccessCode(sections.ivAccess) === code}
                  disabled={locked}
                  onClick={() => patch("ivAccess", encodeIvAccessValue(code))}
                >
                  {t(`emergencyAdaptiveNursing.iv.${code}`)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t(sectionLabelKey(pathway, "oxygen"))} *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} data-testid="adaptive-nursing-oxygen">
              {OXYGEN_DELIVERY_DEVICES.filter((d) => d !== "UNKNOWN").map((code) => (
                <Chip
                  key={code}
                  selected={sections.oxygen === code}
                  disabled={locked}
                  onClick={() => patch("oxygen", code)}
                >
                  {t(`emergencyAdaptiveNursing.oxygen.${code}`)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t(sectionLabelKey(pathway, "infusions"))} *</label>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b" }}>
              {infusionPresent
                ? t("emergencyAdaptiveNursing.infusion.CONTINUING")
                : t("emergencyAdaptiveNursing.infusion.NONE")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} data-testid="adaptive-nursing-infusions">
              {ED_HOSP_1F_INFUSION_CODES.map((code) => (
                <Chip
                  key={code}
                  selected={sections.infusions === code}
                  disabled={locked}
                  onClick={() => patch("infusions", code)}
                >
                  {t(`emergencyAdaptiveNursing.infusion.${code}`)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t(sectionLabelKey(pathway, "fallRisk"))} *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} data-testid="adaptive-nursing-fallRisk">
              {ED_HOSP_1F_FALL_CODES.map((code) => (
                <Chip
                  key={code}
                  selected={sections.fallRisk === code}
                  disabled={locked}
                  onClick={() => patch("fallRisk", code)}
                >
                  {t(`emergencyAdaptiveNursing.fall.${code}`)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t(sectionLabelKey(pathway, "skinWounds"))} *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} data-testid="adaptive-nursing-skinWounds">
              {ED_HOSP_1F_SKIN_CODES.map((code) => (
                <Chip
                  key={code}
                  selected={sections.skinWounds === code}
                  disabled={locked}
                  onClick={() => patch("skinWounds", code)}
                >
                  {t(`emergencyAdaptiveNursing.skin.${code}`)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t(sectionLabelKey(pathway, "belongingsValuables"))} *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} data-testid="adaptive-nursing-belongingsValuables">
              {ED_HOSP_1F_BELONGINGS_CODES.map((code) => (
                <Chip
                  key={code}
                  selected={sections.belongingsValuables === code}
                  disabled={locked}
                  onClick={() => patch("belongingsValuables", code)}
                >
                  {t(`emergencyAdaptiveNursing.belongings.${code}`)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t(sectionLabelKey(pathway, "transportMethod"))} *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} data-testid="adaptive-nursing-transportMethod">
              {ED_HOSP_1F_TRANSPORT_CODES.map((code) => (
                <Chip
                  key={code}
                  selected={sections.transportMethod === code}
                  disabled={locked}
                  onClick={() => patch("transportMethod", code)}
                >
                  {t(`emergencyAdaptiveNursing.transport.${code}`)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t(sectionLabelKey(pathway, "conditionLeavingEd"))} *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} data-testid="adaptive-nursing-conditionLeavingEd">
              {ED_HOSP_1F_CONDITION_CODES.map((code) => (
                <Chip
                  key={code}
                  selected={sections.conditionLeavingEd === code}
                  disabled={locked}
                  onClick={() => patch("conditionLeavingEd", code)}
                >
                  {t(`emergencyAdaptiveNursing.condition.${code}`)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="adaptive-nursing-field-edDepartureAt" style={labelStyle}>
              {t(sectionLabelKey(pathway, "edDepartureAt"))} *
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                id="adaptive-nursing-field-edDepartureAt"
                type="datetime-local"
                ref={(el) => {
                  fieldRefs.current.edDepartureAt = el;
                }}
                value={isoToDatetimeLocal(sections.edDepartureAt ?? "")}
                disabled={locked}
                data-testid="adaptive-nursing-edDepartureAt"
                onChange={(e) => {
                  const v = e.target.value;
                  patch("edDepartureAt", v ? new Date(v).toISOString() : "");
                }}
                style={{ ...inputBase, maxWidth: 240 }}
              />
              <button
                type="button"
                disabled={locked}
                data-testid="adaptive-nursing-departure-now"
                onClick={() => patch("edDepartureAt", new Date().toISOString())}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: locked ? "not-allowed" : "pointer",
                }}
              >
                {t("emergencyAdaptiveNursing.documentNow")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sectionIds.map((id) => {
            const item = completion.items.find((i) => i.fieldId === id);
            const invalid = firstInvalidId === id;
            return (
              <div key={id}>
                <label htmlFor={`adaptive-nursing-field-${id}`} style={labelStyle}>
                  {t(sectionLabelKey(pathway, id))}
                  {item?.required ? " *" : ""}
                </label>
                <textarea
                  id={`adaptive-nursing-field-${id}`}
                  ref={(el) => {
                    fieldRefs.current[id] = el;
                  }}
                  rows={id.includes("handoff") || id.includes("Note") ? 3 : 2}
                  value={sections[id] ?? ""}
                  disabled={!canEdit || saving}
                  aria-invalid={invalid || undefined}
                  aria-required={item?.required || undefined}
                  onChange={(e) => patch(id, e.target.value)}
                  style={{
                    ...inputBase,
                    resize: "vertical",
                    backgroundColor: canEdit ? "#fff" : "#f8fafc",
                    borderColor: invalid ? "#dc2626" : "#cbd5e1",
                  }}
                  data-testid={`adaptive-nursing-${id}`}
                />
              </div>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <EdNursingDocumentationComposer
          encounterId={encounterId}
          facilityId={facilityId}
          encounter={encounter}
          pathway={pathway}
          canEdit={canEdit}
          onSaved={onSaved}
        />
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
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#334155" }} role="alert">
          {info}
        </p>
      ) : null}
    </div>
  );
}
