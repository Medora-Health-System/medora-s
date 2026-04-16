"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrderCreateDto } from "@medora/shared";
import { apiFetch, asApiObject, parseApiResponse } from "@/lib/apiClient";
import { isEncounterMustBeOpenForOrderError, normalizeUserFacingError } from "@/lib/userFacingError";
import {
  erTraumaProtocolAssistContext,
  type ErTraumaLevel,
} from "@/features/emergency/medoraErTriageV1";

const PROTOCOL_NOTE_TRAUMA = "Assistant protocole trauma — saisie guidée (non automatique).";
const PROTOCOL_NOTE_SEPSIS = "Assistant protocole sepsis — saisie guidée (non automatique).";

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

const LAB_DEF: { id: ProtocolItemId; manualLabel: string }[] = [
  { id: "cbc", manualLabel: "NFS (CBC)" },
  { id: "cmp", manualLabel: "Bilan biologique (CMP / ionogramme)" },
  { id: "lactate", manualLabel: "Lactate" },
  { id: "type_screen", manualLabel: "Groupage / réserve (type & screen)" },
];

const IMAGING_DEF: { id: ProtocolItemId; manualLabel: string }[] = [
  { id: "ct_head", manualLabel: "TDM cérébrale" },
  { id: "ct_cspine", manualLabel: "TDM rachis cervical" },
  { id: "ct_cap", manualLabel: "TDM thorax / abdomen / bassin" },
];

const MED_DEF: { id: ProtocolItemId; manualLabel: string }[] = [
  { id: "txa", manualLabel: "Acide tranexamique (TXA)" },
  { id: "fluids", manualLabel: "Perfusion cristalloïdes (volume à adapter)" },
];

function traumaLevelTitleFr(level: ErTraumaLevel): string {
  if (level === "LEVEL_1") return "Niveau 1";
  if (level === "LEVEL_2") return "Niveau 2";
  if (level === "LEVEL_3") return "Niveau 3";
  if (level === "LEVEL_4") return "Niveau 4";
  return "—";
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

async function fetchPrescriberName(): Promise<string> {
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
  return "Prescripteur";
}

function mapOrderCreateError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  return normalizeUserFacingError(msg.trim() || null) || "Impossible de créer l'ordre.";
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
  const [applyMsg, setApplyMsg] = useState<string | null>(null);

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
    setApplyMsg(null);
    setApplying(true);
    try {
      try {
        const latestRaw = await apiFetch(`/encounters/${encounterId}`, { facilityId });
        const latest = asApiObject(latestRaw) as { status?: string } | null;
        if (latest && typeof latest.status === "string" && latest.status !== "OPEN") {
          await onRefetchEncounter?.();
          setApplyMsg("Impossible de créer un ordre : la consultation doit être ouverte.");
          return;
        }
      } catch {
        /* API will validate */
      }

      const labItems = LAB_DEF.filter((d) => provSel[d.id]).map((d) => ({
        catalogItemId: null,
        catalogItemType: "LAB_TEST" as const,
        manualLabel: d.manualLabel,
      }));
      const imgItems = IMAGING_DEF.filter((d) => provSel[d.id]).map((d) => ({
        catalogItemId: null,
        catalogItemType: "IMAGING_STUDY" as const,
        manualLabel: d.manualLabel,
      }));
      const medItemsRaw = MED_DEF.filter((d) => provSel[d.id]);

      if (!labItems.length && !imgItems.length && !medItemsRaw.length) {
        setApplyMsg("Aucun élément sélectionné.");
        return;
      }

      const protocolNote =
        assistDisplayMode === "sepsis" ? PROTOCOL_NOTE_SEPSIS : PROTOCOL_NOTE_TRAUMA;

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
          setApplyMsg(
            created
              ? "Ordres créés (analyses / imagerie). Les médicaments nécessitent un profil avec prescription."
              : "Les médicaments nécessitent un profil avec prescription — aucun ordre créé."
          );
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
        setApplyMsg("Aucun ordre créé.");
        return;
      }

      await onOrdersApplied?.();
      setApplyMsg("Protocole appliqué — ordres créés.");
      setProtocolPanelExpanded(false);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      if (isEncounterMustBeOpenForOrderError(raw)) {
        await onRefetchEncounter?.();
      }
      setApplyMsg(mapOrderCreateError(e));
    } finally {
      setApplying(false);
    }
  }, [
    assistDisplayMode,
    canPrescribe,
    encounterId,
    facilityId,
    onOrdersApplied,
    onRefetchEncounter,
    postOrder,
    provSel,
  ]);

  if (!ctx.visible) return null;

  const protocolTitleFr =
    assistDisplayMode === "sepsis"
      ? "Protocole sepsis — sélection assistée"
      : `Protocole trauma — ${traumaLevelTitleFr(ctx.traumaLevel)}`;

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
          Préparation trauma
        </p>
        <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          Liste de contrôle locale — ne remplace pas la prescription médicale.
        </p>
        <ul style={{ margin: "10px 0 0 0", paddingLeft: 18, fontSize: 13, color: "#334155" }}>
          {[
            ["iv2", "IV x2"],
            ["monitor", "Monitor"],
            ["o2", "O2"],
            ["tubes", "Tubes sanguins (prélèvements)"],
          ].map(([k, label]) => (
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
          Pré-remplir pour médecin
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
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#991b1b" }}>{protocolTitleFr}</p>
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
              Rouvrir le protocole
            </button>
          </div>
          {applyMsg ? (
            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: 12,
                color: applyMsg.includes("Impossible") || applyMsg.includes("nécessitent") ? "#b91c1c" : "#15803d",
              }}
            >
              {applyMsg}
            </p>
          ) : null}
        </div>
      );
    }

    return (
      <div style={shell}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#991b1b" }}>{protocolTitleFr}</p>
        <p style={{ margin: "6px 0 0 0", fontSize: 11, color: "#64748b" }}>
          Cocher les éléments puis appliquer — création d&apos;ordres via le flux existant (STAT).
        </p>

        <div style={{ marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#475569" }}>Analyses</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
            {LAB_DEF.map((d) => (
              <label
                key={d.id}
                style={{ fontSize: 13, color: "#334155", display: "flex", alignItems: "center", gap: 8 }}
              >
                <input
                  type="checkbox"
                  checked={provSel[d.id]}
                  onChange={() => toggleProv(d.id)}
                />
                {d.manualLabel}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#475569" }}>Imagerie</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
            {IMAGING_DEF.map((d) => (
              <label
                key={d.id}
                style={{ fontSize: 13, color: "#334155", display: "flex", alignItems: "center", gap: 8 }}
              >
                <input
                  type="checkbox"
                  checked={provSel[d.id]}
                  onChange={() => toggleProv(d.id)}
                />
                {d.manualLabel}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#475569" }}>Médicaments</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
            {MED_DEF.map((d) => (
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
              Prescription médicamenteuse non disponible pour ce compte — décochez les médicaments ou utilisez le
              dossier complet.
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
          {applying ? "Envoi…" : "Appliquer protocole"}
        </button>
        {applyMsg ? (
          <p
            style={{
              margin: "8px 0 0 0",
              fontSize: 12,
              color: applyMsg.includes("Impossible") || applyMsg.includes("nécessitent") ? "#b91c1c" : "#15803d",
            }}
          >
            {applyMsg}
          </p>
        ) : null}
      </div>
    );
  }

  return null;
}
