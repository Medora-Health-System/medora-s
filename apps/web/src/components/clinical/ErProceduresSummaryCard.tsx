"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import type { SupportedLanguage } from "@/i18n/config";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import {
  formatProcedureEnumField,
  lacerationAnesthesiaDisplayText,
  lacerationClosureDisplayText,
  lacerationIrrigationDisplayText,
  lacerationSiteDisplayText,
  lacerationSuturesDisplayText,
  lacerationWoundLengthDisplayText,
  procedurePerformerDisplayNameWithTitle,
  procedureTimelineCompactSuffix,
  procedureTypeDisplayName,
  readPayloadStr,
  type ProcedurePayload,
} from "@/lib/lacerationProcedurePayloadDisplay";

type CreatedBy = { firstName: string | null; lastName: string | null };

type ProcedureEntry = {
  id: string;
  createdAt: string;
  procedureType: string;
  performedAt: string | null;
  performerDisplayName: string | null;
  performerTitle: string | null;
  createdBy: CreatedBy | null;
  payload: ProcedurePayload;
};

function fillTpl(s: string, vars: Record<string, string>): string {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v);
  }
  return out;
}

function formatActor(firstName: string | null | undefined, lastName: string | null | undefined, dash: string): string {
  const s = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return s || dash;
}

function mergePayloadFromRow(x: Record<string, unknown>): ProcedurePayload {
  const base =
    x.payload && typeof x.payload === "object" && !Array.isArray(x.payload)
      ? ({ ...(x.payload as Record<string, unknown>) } as ProcedurePayload)
      : ({} as ProcedurePayload);
  const skip = new Set([
    "id",
    "createdAt",
    "payload",
    "createdBy",
    "performerDisplayName",
    "performerTitle",
    "performerRoleCode",
    "performedAt",
  ]);
  for (const [k, v] of Object.entries(x)) {
    if (skip.has(k)) continue;
    if ((base as Record<string, unknown>)[k] === undefined && v !== undefined) {
      (base as Record<string, unknown>)[k] = v;
    }
  }
  return base;
}

function parseProceduresPayload(raw: unknown): ProcedureEntry[] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const arr = o.entries;
  if (!Array.isArray(arr)) return null;
  const out: ProcedureEntry[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const x = row as Record<string, unknown>;
    const id = typeof x.id === "string" ? x.id : "";
    if (!id) continue;
    const cbRaw = x.createdBy;
    let createdBy: CreatedBy | null = null;
    if (cbRaw && typeof cbRaw === "object" && !Array.isArray(cbRaw)) {
      const c = cbRaw as Record<string, unknown>;
      createdBy = {
        firstName: typeof c.firstName === "string" ? c.firstName : null,
        lastName: typeof c.lastName === "string" ? c.lastName : null,
      };
    }
    const payload = mergePayloadFromRow(x);
    const performedAt =
      typeof x.performedAt === "string" && x.performedAt.trim()
        ? x.performedAt.trim()
        : typeof payload.performedAt === "string" && payload.performedAt.trim()
          ? String(payload.performedAt).trim()
          : null;
    const performerDisplayName =
      typeof x.performerDisplayName === "string" && x.performerDisplayName.trim()
        ? x.performerDisplayName.trim()
        : null;
    const performerTitle =
      typeof x.performerTitle === "string" && x.performerTitle.trim() ? x.performerTitle.trim() : null;
    out.push({
      id,
      createdAt: typeof x.createdAt === "string" ? x.createdAt : "",
      procedureType: typeof x.procedureType === "string" ? x.procedureType : "",
      performedAt,
      performerDisplayName,
      performerTitle,
      createdBy,
      payload,
    });
  }
  return out;
}

function boolLabel(v: unknown, t: (k: string) => string): string {
  if (v === true) return t("erProcedureLauncher.boolYes");
  if (v === false) return t("erProcedureLauncher.boolNo");
  return "—";
}

function buildProcedureDetailRows(
  row: ProcedureEntry,
  t: (k: string) => string,
  language: SupportedLanguage
): Array<{ k: string; v: string }> {
  const p = row.payload;
  const createdBy = row.createdBy ?? { firstName: null, lastName: null };
  const whenIso = row.performedAt ?? row.createdAt;
  let when = "—";
  try {
    when = whenIso ? formatEncounterChromeDateTime(whenIso, language) : "—";
  } catch {
    when = whenIso || "—";
  }
  const who = procedurePerformerDisplayNameWithTitle(p, createdBy, (fn, ln) =>
    formatActor(fn, ln, t("common.dash"))
  );
  const pt = readPayloadStr(p, "procedureType") || row.procedureType;
  const rows: Array<{ k: string; v: string }> = [
    { k: "summaryDetailProcedure", v: procedureTypeDisplayName(t, pt) },
    { k: "summaryDetailPerformedAt", v: when },
    { k: "summaryDetailPerformedBy", v: who },
  ];
  const fe = (field: string, other: string, group: string) => formatProcedureEnumField(p, field, other, group, t);

  if (pt === "LACERATION_REPAIR") {
    rows.splice(1, 0, { k: "summaryDetailSite", v: lacerationSiteDisplayText(p, t) });
    rows.push(
      { k: "summaryDetailWoundLength", v: lacerationWoundLengthDisplayText(p, t) },
      { k: "summaryDetailAnesthesia", v: lacerationAnesthesiaDisplayText(p, t) || "—" },
      { k: "summaryDetailIrrigation", v: lacerationIrrigationDisplayText(p, t) || "—" },
      { k: "summaryDetailAseptic", v: boolLabel(p.asepticTechnique, t) },
      { k: "summaryDetailClosure", v: lacerationClosureDisplayText(p, t) || "—" },
      { k: "summaryDetailSutures", v: lacerationSuturesDisplayText(p, t) || "—" },
      { k: "summaryDetailDressing", v: boolLabel(p.dressingApplied, t) },
      { k: "summaryDetailTolerated", v: boolLabel(p.toleratedWell, t) }
    );
  } else if (pt === "WOUND_CARE") {
    rows.splice(1, 0, { k: "summaryDetailSite", v: lacerationSiteDisplayText(p, t) });
    rows.push(
      { k: "summaryDetailWoundType", v: fe("woundType", "woundTypeOther", "woundType") || "—" },
      { k: "summaryDetailCleaningSolution", v: fe("cleaningSolution", "cleaningSolutionOther", "cleaningSolution") || "—" },
      { k: "summaryDetailDressingType", v: fe("dressingType", "dressingTypeOther", "dressingType") || "—" },
      { k: "summaryDetailTolerated", v: boolLabel(p.toleratedWell, t) }
    );
  } else if (pt === "INCISION_AND_DRAINAGE") {
    rows.splice(1, 0, { k: "summaryDetailSite", v: lacerationSiteDisplayText(p, t) });
    rows.push(
      { k: "summaryDetailAbscessSize", v: fe("abscessSize", "abscessSizeOther", "abscessSize") || "—" },
      { k: "summaryDetailAnesthesia", v: lacerationAnesthesiaDisplayText(p, t) || "—" },
      { k: "summaryDetailIncisionPerformed", v: boolLabel(p.incisionPerformed, t) },
      { k: "summaryDetailDrainageAmount", v: fe("drainageAmount", "drainageAmountOther", "drainageAmount") || "—" },
      { k: "summaryDetailPackingPlaced", v: boolLabel(p.packingPlaced, t) },
      { k: "summaryDetailDressing", v: boolLabel(p.dressingApplied, t) },
      { k: "summaryDetailTolerated", v: boolLabel(p.toleratedWell, t) }
    );
  } else if (pt === "SPLINT_APPLICATION") {
    rows.splice(1, 0, {
      k: "summaryDetailExtremitySite",
      v: fe("extremitySite", "extremitySiteOther", "extremitySite") || "—",
    });
    rows.push(
      { k: "summaryDetailSplintType", v: fe("splintType", "splintTypeOther", "splintType") || "—" },
      {
        k: "summaryDetailNeuroBefore",
        v: fe("neurovascularBefore", "neurovascularBeforeOther", "neurovascularStatus") || "—",
      },
      {
        k: "summaryDetailNeuroAfter",
        v: fe("neurovascularAfter", "neurovascularAfterOther", "neurovascularStatus") || "—",
      },
      { k: "summaryDetailTolerated", v: boolLabel(p.patientToleratedWell, t) },
      { k: "summaryDetailInstructionsGiven", v: boolLabel(p.instructionsGiven, t) }
    );
  } else if (pt === "FOLEY_CATHETER") {
    rows.push(
      { k: "summaryDetailCatheterSize", v: fe("catheterSize", "catheterSizeOther", "catheterSize") || "—" },
      { k: "summaryDetailFoleyIndication", v: fe("indication", "indicationOther", "foleyIndication") || "—" },
      { k: "summaryDetailUrineReturn", v: boolLabel(p.urineReturn, t) },
      { k: "summaryDetailUrineAppearance", v: fe("urineAppearance", "urineAppearanceOther", "urineAppearance") || "—" },
      { k: "summaryDetailBalloonVolume", v: fe("balloonVolume", "balloonVolumeOther", "balloonVolume") || "—" },
      { k: "summaryDetailTolerated", v: boolLabel(p.toleratedWell, t) }
    );
  } else if (pt === "EKG") {
    rows.push(
      { k: "summaryDetailEkgIndication", v: fe("indication", "indicationOther", "ekgIndication") || "—" },
      { k: "summaryDetailRhythm", v: fe("rhythm", "rhythmOther", "ekgRhythm") || "—" },
      { k: "summaryDetailRateRange", v: fe("rateRange", "rateRangeOther", "rateRange") || "—" },
      { k: "summaryDetailProviderNotified", v: boolLabel(p.providerNotified, t) },
      { k: "summaryDetailCopyInChart", v: boolLabel(p.copyPlacedInChart, t) }
    );
  } else if (pt === "GLUCOSE_CHECK") {
    rows.push(
      { k: "summaryDetailResultMgDl", v: readPayloadStr(p, "resultMgDl") ? `${readPayloadStr(p, "resultMgDl")} mg/dL` : "—" },
      { k: "summaryDetailSpecimenSource", v: fe("specimenSource", "specimenSourceOther", "specimenSource") || "—" },
      { k: "summaryDetailActionTaken", v: fe("actionTaken", "actionTakenOther", "glucoseAction") || "—" },
      { k: "summaryDetailProviderNotified", v: boolLabel(p.providerNotified, t) }
    );
  } else if (pt === "URINE_COLLECTION") {
    rows.push(
      { k: "summaryDetailUrineMethod", v: fe("method", "methodOther", "urineMethod") || "—" },
      { k: "summaryDetailSpecimenToLab", v: boolLabel(p.specimenSentToLab, t) },
      { k: "summaryDetailUrineAppearance", v: fe("urineAppearance", "urineAppearanceOther", "urineAppearance") || "—" }
    );
  } else if (pt === "PREGNANCY_TEST") {
    rows.push(
      { k: "summaryDetailPregnancySpecimen", v: fe("specimen", "specimenOther", "pregnancySpecimen") || "—" },
      { k: "summaryDetailTestResult", v: fe("result", "resultOther", "pregnancyResult") || "—" },
      { k: "summaryDetailProviderNotified", v: boolLabel(p.providerNotified, t) }
    );
  }

  const comp = typeof p.complications === "string" ? p.complications.trim() : "";
  const notes = typeof p.notes === "string" ? p.notes.trim() : "";
  if (comp) rows.push({ k: "summaryDetailComplications", v: comp });
  if (notes) rows.push({ k: "summaryDetailNotes", v: notes });
  return rows;
}

function DetailDl({
  row,
  t,
  language,
}: {
  row: ProcedureEntry;
  t: (k: string) => string;
  language: SupportedLanguage;
}) {
  const rows = buildProcedureDetailRows(row, t, language);

  const dt: React.CSSProperties = {
    margin: 0,
    padding: "4px 0",
    fontSize: 10,
    fontWeight: 700,
    color: "#64748b",
    verticalAlign: "top",
    width: "38%",
  };
  const dd: React.CSSProperties = {
    margin: 0,
    padding: "4px 0",
    fontSize: 12,
    color: "#334155",
    lineHeight: 1.45,
  };

  return (
    <dl style={{ margin: "8px 0 0 0", display: "grid", gridTemplateColumns: "minmax(0, 38%) 1fr", columnGap: 10 }}>
      {rows.map((r) => (
        <React.Fragment key={r.k}>
          <dt style={dt}>{t(`erProcedureLauncher.${r.k}`)}</dt>
          <dd style={dd}>{r.v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

/**
 * Compact documented procedures for ER visit summary (S14A / S14B).
 */
export function ErProceduresSummaryCard({
  encounterId,
  facilityId,
  refreshToken,
  enabled,
}: {
  encounterId: string;
  facilityId: string;
  refreshToken: number;
  enabled: boolean;
}) {
  const { t, language } = useI18n();
  const [state, setState] = useState<{
    loading: boolean;
    error: boolean;
    entries: ProcedureEntry[];
  }>({ loading: false, error: false, entries: [] });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!enabled || !encounterId || !facilityId) {
      setState({ loading: false, error: false, entries: [] });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    void (async () => {
      try {
        const data = await apiFetch(`/encounters/${encounterId}/procedures`, { facilityId });
        if (cancelled) return;
        const parsed = parseProceduresPayload(data);
        if (!parsed) {
          setState({ loading: false, error: true, entries: [] });
          return;
        }
        setState({ loading: false, error: false, entries: parsed });
      } catch {
        if (!cancelled) {
          setState({ loading: false, error: true, entries: [] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, refreshToken, enabled]);

  if (!enabled) return null;

  if (state.loading) {
    return (
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          backgroundColor: "#ffffff",
          padding: "12px 14px",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          backgroundColor: "#fffbeb",
          padding: "12px 14px",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: "#92400e", fontWeight: 600 }}>
          {t("erProcedureLauncher.summaryLoadError")}
        </p>
      </div>
    );
  }

  if (state.entries.length === 0) return null;

  const sub: React.CSSProperties = {
    margin: "0 0 6px 0",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#64748b",
  };

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        backgroundColor: "#ffffff",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid #f1f5f9" }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          {t("erProcedureLauncher.summaryTitle")}
        </p>
      </div>
      <div style={{ padding: "10px 14px 12px" }}>
        <p style={sub}>{t("erProcedureLauncher.summaryRecent")}</p>
        <ul style={{ margin: "4px 0 0 0", paddingLeft: 0, listStyle: "none", fontSize: 12, color: "#334155" }}>
          {state.entries.slice(0, 8).map((row) => {
            const whenIso = row.performedAt ?? row.createdAt;
            const when = whenIso ? formatEncounterChromeDateTime(whenIso, language) : "—";
            const createdBy = row.createdBy ?? { firstName: null, lastName: null };
            const p = row.payload;
            const by = procedurePerformerDisplayNameWithTitle(p, createdBy, (fn, ln) =>
              formatActor(fn, ln, t("common.dash"))
            );
            const isOpen = Boolean(expanded[row.id]);
            return (
              <li
                key={row.id}
                style={{
                  marginBottom: 10,
                  paddingBottom: 10,
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <p style={{ margin: "0 0 6px 0", lineHeight: 1.45 }}>
                  {fillTpl(t("erProcedureLauncher.summaryLine"), {
                    name: procedureTypeDisplayName(t, row.procedureType),
                    site: procedureTimelineCompactSuffix(row.payload, t),
                    by,
                    time: when,
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
                  aria-expanded={isOpen}
                  style={{
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  {isOpen ? t("erProcedureLauncher.summaryCollapse") : t("erProcedureLauncher.summaryExpand")}
                </button>
                {isOpen ? <DetailDl row={row} t={t} language={language} /> : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
