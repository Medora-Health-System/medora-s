"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrderCreateDto } from "@medora/shared";
import { apiFetch, asApiObject, parseApiResponse } from "@/lib/apiClient";
import { isEncounterMustBeOpenForOrderError, normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import {
  erTraumaProtocolAssistContext,
  type ErTraumaLevel,
} from "@/features/emergency/medoraErTriageV1";

type ProtocolItemId =
  | "cbc"
  | "cmp"
  | "lactate"
  | "type_screen"
  | "ct_head"
  | "ct_cspine"
  | "ct_cap"
  | "txa"
  | "fluids";

function traumaLevelDisplay(t: (key: string) => string, level: ErTraumaLevel): string {
  if (level === "LEVEL_1") return t("erMseSmartAssist.traumaLevels.LEVEL_1");
  if (level === "LEVEL_2") return t("erMseSmartAssist.traumaLevels.LEVEL_2");
  if (level === "LEVEL_3") return t("erMseSmartAssist.traumaLevels.LEVEL_3");
  if (level === "LEVEL_4") return t("erMseSmartAssist.traumaLevels.LEVEL_4");
  return t("common.dash");
}

function initialSelection(level: ErTraumaLevel): Record<ProtocolItemId, boolean> {
  const base: Record<ProtocolItemId, boolean> = {
    cbc: true,
    cmp: true,
    lactate: true,
    type_screen: true,
    ct_head: true,
    ct_cspine: true,
    ct_cap: true,
    txa: true,
    fluids: true,
  };
  if (level === "LEVEL_3") {
    return { ...base, ct_cap: false };
  }
  if (level === "LEVEL_4") {
    return {
      cbc: true,
      cmp: false,
      lactate: true,
      type_screen: true,
      ct_head: false,
      ct_cspine: false,
      ct_cap: false,
      txa: true,
      fluids: true,
    };
  }
  return base;
}

/** CDS sepsis hint — subset of existing protocol checkboxes only (no API). */
function initialSelectionSepsisAssist(): Record<ProtocolItemId, boolean> {
  return {
    cbc: true,
    cmp: true,
    lactate: true,
    type_screen: true,
    ct_head: false,
    ct_cspine: false,
    ct_cap: false,
    txa: false,
    fluids: true,
  };
}

export function TraumaProtocolAssistPanel({
  encounterId,
  facilityId,
  encounterType,
  vitalsJson,
  roles,
  canPrescribe,
  onRefetchEncounter,
  onOrdersApplied,
  cdsIntent,
  onConsumeIntent,
}: {
  encounterId: string;
  facilityId: string;
  encounterType: string | null | undefined;
  vitalsJson: unknown;
  roles: string[];
  canPrescribe: boolean;
  onRefetchEncounter?: () => Promise<void>;
  onOrdersApplied?: () => void | Promise<void>;
  /** Rules-based CDS v2 — one-shot checkbox hint (no API). */
  cdsIntent?: string | null;
  onConsumeIntent?: () => void;
}) {
  const { t } = useI18n();

  const labDef = useMemo((): { id: ProtocolItemId; manualLabel: string }[] => {
    return [
      { id: "cbc", manualLabel: t("erProtocolAssist.orderLabelCbc") },
      { id: "cmp", manualLabel: t("erProtocolAssist.orderLabelCmp") },
      { id: "lactate", manualLabel: t("erProtocolAssist.orderLabelLactate") },
      { id: "type_screen", manualLabel: t("erProtocolAssist.orderLabelTypeScreen") },
    ];
  }, [t]);

  const imagingDef = useMemo((): { id: ProtocolItemId; manualLabel: string }[] => {
    return [
      { id: "ct_head", manualLabel: t("erProtocolAssist.orderLabelCtHead") },
      { id: "ct_cspine", manualLabel: t("erProtocolAssist.orderLabelCtCspine") },
      { id: "ct_cap", manualLabel: t("erProtocolAssist.orderLabelCtCap") },
    ];
  }, [t]);

  const medDef = useMemo((): { id: ProtocolItemId; manualLabel: string }[] => {
    return [
      { id: "txa", manualLabel: t("erProtocolAssist.orderLabelTxa") },
      { id: "fluids", manualLabel: t("erProtocolAssist.orderLabelFluids") },
    ];
  }, [t]);

  const rnChecklistItems = useMemo(
    () =>
      [
        ["iv2", t("erProtocolAssist.rnIv2")] as const,
        ["monitor", t("erProtocolAssist.rnMonitor")] as const,
        ["o2", t("erProtocolAssist.rnO2")] as const,
        ["tubes", t("erProtocolAssist.rnTubes")] as const,
      ],
    [t]
  );

  const mapOrderCreateError = useCallback(
    (err: unknown): string => {
      const msg = err instanceof Error ? err.message : "";
      return normalizeUserFacingError(msg.trim() || null) || t("erProtocolAssist.orderCreateFailed");
    },
    [t]
  );

  const fetchPrescriberName = useCallback(async (): Promise<string> => {
    try {
      const res = await fetch("/api/auth/me");
      const me = await parseApiResponse(res);
      if (me && typeof me === "object" && !Array.isArray(me)) {
        const fn = (me as { fullName?: string }).fullName?.trim();
        if (fn) return fn;
      }
    } catch {
      /* ignore */
    }
    return t("erProtocolAssist.prescriberFallback");
  }, [t]);

  const ctx = useMemo(() => erTraumaProtocolAssistContext(encounterType, vitalsJson), [encounterType, vitalsJson]);

  const isProviderLike = roles.includes("PROVIDER") || roles.includes("ADMIN");
  const isRn = roles.includes("RN");

  /** True after user toggles provider protocol checkboxes — CDS must not override. */
  const userModifiedProtocolRef = useRef(false);

  const [assistIntentFlash, setAssistIntentFlash] = useState(false);
  /** CDS / context label — sepsis assist uses the same checkbox UI but a distinct title. */
  const [assistDisplayMode, setAssistDisplayMode] = useState<"trauma" | "sepsis">("trauma");
  /** After a successful apply, collapse until user reopens or CDS fires again. */
  const [protocolPanelExpanded, setProtocolPanelExpanded] = useState(true);

  const [rnChecks, setRnChecks] = useState({
    iv2: true,
    monitor: true,
    o2: true,
    tubes: true,
  });

  const [provSel, setProvSel] = useState<Record<ProtocolItemId, boolean>>(() =>
    initialSelection(ctx.traumaLevel)
  );

  const [applying, setApplying] = useState(false);
  const [applyFeedback, setApplyFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  useEffect(() => {
    userModifiedProtocolRef.current = false;
    setProvSel(initialSelection(ctx.traumaLevel));
    setAssistDisplayMode("trauma");
  }, [ctx.traumaLevel, ctx.visible]);

  useEffect(() => {
    if (!cdsIntent || !onConsumeIntent) return;
    if (!ctx.visible) {
      onConsumeIntent();
      return;
    }
    if (!isProviderLike) {
      onConsumeIntent();
      return;
    }
    if (userModifiedProtocolRef.current) {
      onConsumeIntent();
      return;
    }
    if (cdsIntent === "stroke_pathway") {
      onConsumeIntent();
      return;
    }
    if (cdsIntent === "trauma_protocol") {
      setAssistDisplayMode("trauma");
      setProvSel(initialSelection(ctx.traumaLevel));
      setAssistIntentFlash(true);
      setProtocolPanelExpanded(true);
    } else if (cdsIntent === "sepsis_protocol") {
      setAssistDisplayMode("sepsis");
      setProvSel(initialSelectionSepsisAssist());
      setAssistIntentFlash(true);
      setProtocolPanelExpanded(true);
    }
    onConsumeIntent();
  }, [cdsIntent, ctx.traumaLevel, ctx.visible, isProviderLike, onConsumeIntent]);

  useEffect(() => {
    if (!assistIntentFlash) return;
    const id = window.setTimeout(() => setAssistIntentFlash(false), 2200);
    return () => window.clearTimeout(id);
  }, [assistIntentFlash]);

  const toggleProv = useCallback((id: ProtocolItemId) => {
    userModifiedProtocolRef.current = true;
    setProvSel((s) => ({ ...s, [id]: !s[id] }));
  }, []);

  const postOrder = useCallback(
    async (payload: OrderCreateDto) => {
      await apiFetch(`/encounters/${encounterId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      });
    },
    [encounterId, facilityId]
  );

  const handleApplyProtocol = useCallback(async () => {
    setApplyFeedback(null);
    setApplying(true);
    try {
      try {
        const latestRaw = await apiFetch(`/encounters/${encounterId}`, { facilityId });
        const latest = asApiObject(latestRaw) as { status?: string } | null;
        if (latest && typeof latest.status === "string" && latest.status !== "OPEN") {
          await onRefetchEncounter?.();
          setApplyFeedback({ message: t("erProtocolAssist.errEncounterNotOpen"), isError: true });
          return;
        }
      } catch {
        /* API will validate */
      }

      const labItems = labDef.filter((d) => provSel[d.id]).map((d) => ({
        catalogItemId: null,
        catalogItemType: "LAB_TEST" as const,
        manualLabel: d.manualLabel,
      }));
      const imgItems = imagingDef.filter((d) => provSel[d.id]).map((d) => ({
        catalogItemId: null,
        catalogItemType: "IMAGING_STUDY" as const,
        manualLabel: d.manualLabel,
      }));
      const medItemsRaw = medDef.filter((d) => provSel[d.id]);

      if (!labItems.length && !imgItems.length && !medItemsRaw.length) {
        setApplyFeedback({ message: t("erProtocolAssist.errNothingSelected"), isError: true });
        return;
      }

      const protocolNote =
        assistDisplayMode === "sepsis"
          ? t("erProtocolAssist.protocolNoteSepsis")
          : t("erProtocolAssist.protocolNoteTrauma");

      let created = false;
      if (labItems.length) {
        await postOrder({
          type: "LAB",
          priority: "STAT",
          notes: protocolNote,
          items: labItems,
        });
        created = true;
      }
      if (imgItems.length) {
        await postOrder({
          type: "IMAGING",
          priority: "STAT",
          notes: protocolNote,
          items: imgItems,
        });
        created = true;
      }
      if (medItemsRaw.length) {
        if (!canPrescribe) {
          if (created) {
            await onOrdersApplied?.();
            setProtocolPanelExpanded(false);
          }
          setApplyFeedback({
            message: created
              ? t("erProtocolAssist.errLabsImgCreatedMedNeedsRx")
              : t("erProtocolAssist.errMedNeedsRxNoOrders"),
            isError: true,
          });
          return;
        }
        const prescriberName = await fetchPrescriberName();
        await postOrder({
          type: "MEDICATION",
          priority: "STAT",
          notes: protocolNote,
          prescriberName,
          items: medItemsRaw.map((d) => ({
            catalogItemId: null,
            catalogItemType: "MEDICATION" as const,
            manualLabel: d.manualLabel,
            quantity: 1,
            medicationFulfillmentIntent: "ADMINISTER_CHART" as const,
          })),
        });
        created = true;
      }

      if (!created) {
        setApplyFeedback({ message: t("erProtocolAssist.errNoOrdersCreated"), isError: true });
        return;
      }

      await onOrdersApplied?.();
      setApplyFeedback({ message: t("erProtocolAssist.successProtocolApplied"), isError: false });
      setProtocolPanelExpanded(false);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      if (isEncounterMustBeOpenForOrderError(raw)) {
        await onRefetchEncounter?.();
      }
      setApplyFeedback({ message: mapOrderCreateError(e), isError: true });
    } finally {
      setApplying(false);
    }
  }, [
    assistDisplayMode,
    canPrescribe,
    encounterId,
    facilityId,
    fetchPrescriberName,
    imagingDef,
    labDef,
    mapOrderCreateError,
    medDef,
    onOrdersApplied,
    onRefetchEncounter,
    postOrder,
    provSel,
    t,
  ]);

  const protocolTitle = useMemo(() => {
    if (assistDisplayMode === "sepsis") return t("erProtocolAssist.protocolTitleSepsis");
    return t("erProtocolAssist.protocolTitleTraumaPrefix") + traumaLevelDisplay(t, ctx.traumaLevel);
  }, [assistDisplayMode, ctx.traumaLevel, t]);

  if (!ctx.visible) return null;

  const shell: React.CSSProperties = {
    marginBottom: 14,
    padding: "12px 14px",
    borderRadius: 10,
    border: assistIntentFlash ? "2px solid #2563eb" : "1px solid #fecaca",
    backgroundColor: "#fffafa",
  };

  if (isRn && !isProviderLike) {
    return (
      <div style={shell}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#991b1b" }}>
          {t("erProtocolAssist.rnTitle")}
        </p>
        <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          {t("erProtocolAssist.rnSubtitle")}
        </p>
        <ul style={{ margin: "10px 0 0 0", paddingLeft: 18, fontSize: 13, color: "#334155" }}>
          {rnChecklistItems.map(([k, label]) => (
            <li key={k} style={{ marginBottom: 6 }}>
              <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={rnChecks[k as keyof typeof rnChecks]}
                  onChange={() =>
                    setRnChecks((c) => ({ ...c, [k]: !c[k as keyof typeof rnChecks] }))
                  }
                />
                {label}
              </label>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {}}
          style={{
            marginTop: 10,
            padding: "6px 12px",
            fontSize: 12,
            borderRadius: 8,
            border: "1px dashed #cbd5e1",
            backgroundColor: "#fff",
            color: "#94a3b8",
            cursor: "default",
          }}
        >
          {t("erProtocolAssist.rnPrefillDisabled")}
        </button>
      </div>
    );
  }

  if (isProviderLike) {
    if (!protocolPanelExpanded) {
      return (
        <div style={shell}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#991b1b" }}>{protocolTitle}</p>
            <button
              type="button"
              onClick={() => setProtocolPanelExpanded(true)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #fecaca",
                backgroundColor: "#fff",
                color: "#b91c1c",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t("erProtocolAssist.reopenProtocol")}
            </button>
          </div>
          {applyFeedback ? (
            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: 12,
                color: applyFeedback.isError ? "#b91c1c" : "#15803d",
              }}
            >
              {applyFeedback.message}
            </p>
          ) : null}
        </div>
      );
    }

    return (
      <div style={shell}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#991b1b" }}>{protocolTitle}</p>
        <p style={{ margin: "6px 0 0 0", fontSize: 11, color: "#64748b" }}>{t("erProtocolAssist.checkboxHelper")}</p>

        <div style={{ marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#475569" }}>{t("erProtocolAssist.sectionLab")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
            {labDef.map((d) => (
              <label
                key={d.id}
                style={{ fontSize: 13, color: "#334155", display: "flex", alignItems: "center", gap: 8 }}
              >
                <input type="checkbox" checked={provSel[d.id]} onChange={() => toggleProv(d.id)} />
                {d.manualLabel}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#475569" }}>
            {t("erProtocolAssist.sectionImaging")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
            {imagingDef.map((d) => (
              <label
                key={d.id}
                style={{ fontSize: 13, color: "#334155", display: "flex", alignItems: "center", gap: 8 }}
              >
                <input type="checkbox" checked={provSel[d.id]} onChange={() => toggleProv(d.id)} />
                {d.manualLabel}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#475569" }}>
            {t("erProtocolAssist.sectionMedications")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
            {medDef.map((d) => (
              <label
                key={d.id}
                style={{ fontSize: 13, color: "#334155", display: "flex", alignItems: "center", gap: 8 }}
              >
                <input
                  type="checkbox"
                  checked={provSel[d.id]}
                  onChange={() => toggleProv(d.id)}
                  disabled={!canPrescribe}
                />
                {d.manualLabel}
              </label>
            ))}
          </div>
          {!canPrescribe ? (
            <p style={{ margin: "6px 0 0 0", fontSize: 11, color: "#b45309" }}>
              {t("erProtocolAssist.medNoPrescribeHint")}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void handleApplyProtocol()}
          disabled={applying}
          style={{
            marginTop: 12,
            padding: "8px 14px",
            borderRadius: 10,
            border: "none",
            backgroundColor: applying ? "#94a3b8" : "#b91c1c",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: applying ? "wait" : "pointer",
          }}
        >
          {applying ? t("erProtocolAssist.applySending") : t("erProtocolAssist.applyProtocol")}
        </button>
        {applyFeedback ? (
          <p
            style={{
              margin: "8px 0 0 0",
              fontSize: 12,
              color: applyFeedback.isError ? "#b91c1c" : "#15803d",
            }}
          >
            {applyFeedback.message}
          </p>
        ) : null}
      </div>
    );
  }

  return null;
}
