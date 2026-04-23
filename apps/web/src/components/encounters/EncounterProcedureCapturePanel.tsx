"use client";

import React, { useCallback, useEffect, useState } from "react";
import { isProcedureCodeLikeForSystem } from "@medora/shared";
import {
  appendProcedureCapture,
  searchBillingProcedureCodes,
  type AppendProcedureCaptureResult,
  type BillingProcedureSearchHit,
} from "@/lib/chartApi";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";

export function EncounterProcedureCapturePanel({
  encounterId,
  facilityId,
  canCapture,
  isLocked,
}: {
  encounterId: string;
  facilityId: string;
  canCapture: boolean;
  isLocked: boolean;
}) {
  const { t, language } = useI18n();
  const [searchQ, setSearchQ] = useState("");
  const [systemFilter, setSystemFilter] = useState<"" | "CPT" | "HCPCS">("");
  const [hits, setHits] = useState<BillingProcedureSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualSystem, setManualSystem] = useState<"CPT" | "HCPCS">("CPT");
  const [manualDesc, setManualDesc] = useState("");
  const [mod1, setMod1] = useState("");
  const [mod2, setMod2] = useState("");
  const [units, setUnits] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const tP = useCallback((key: string) => t(`procedureCapture.${key}`), [t]);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const tmr = window.setTimeout(() => {
      setSearching(true);
      void searchBillingProcedureCodes(facilityId, q, 25, systemFilter || undefined)
        .then((res) => {
          if (!cancelled) setHits(Array.isArray(res.items) ? res.items : []);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(tmr);
    };
  }, [searchQ, facilityId, systemFilter]);

  const modifiersPayload = (): string[] | undefined => {
    const a = mod1.trim().slice(0, 8);
    const b = mod2.trim().slice(0, 8);
    const out = [a, b].filter(Boolean);
    return out.length ? out : undefined;
  };

  const unitsNum = (): number | undefined => {
    const n = Number.parseInt(units.trim(), 10);
    if (!Number.isFinite(n) || n < 1) return undefined;
    return n;
  };

  const pickCatalog = async (hit: BillingProcedureSearchHit) => {
    if (!canCapture || isLocked) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res: AppendProcedureCaptureResult = await appendProcedureCapture(facilityId, encounterId, {
        billingProcedureCodeId: hit.id,
        modifiers: modifiersPayload(),
        units: unitsNum(),
      });
      if (res.duplicateBlocked) {
        setError(tP("duplicateBlocked"));
        return;
      }
      setSearchQ("");
      setHits([]);
      setSuccess(tP("saved"));
      window.setTimeout(() => setSuccess(null), 2500);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : (e as { message?: string })?.message;
      setError(normalizeUserFacingError(raw, language) || tP("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const submitManual = async () => {
    if (!canCapture || isLocked) return;
    const code = manualCode.trim();
    if (!code) {
      setError(tP("manualCodeRequired"));
      return;
    }
    if (!isProcedureCodeLikeForSystem(code, manualSystem)) {
      setError(tP("invalidProcedureFormat"));
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res: AppendProcedureCaptureResult = await appendProcedureCapture(facilityId, encounterId, {
        manualNonCatalog: true,
        code,
        codeSystem: manualSystem,
        description: manualDesc.trim() || undefined,
        modifiers: modifiersPayload(),
        units: unitsNum(),
      });
      if (res.duplicateBlocked) {
        setError(tP("duplicateBlocked"));
        return;
      }
      setManualOpen(false);
      setManualCode("");
      setManualDesc("");
      setSuccess(tP("saved"));
      window.setTimeout(() => setSuccess(null), 2500);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : (e as { message?: string })?.message;
      setError(normalizeUserFacingError(raw, language) || tP("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const shell: React.CSSProperties = {
    backgroundColor: MEDORA_CARD_SHELL.background,
    border: MEDORA_CARD_SHELL.border,
    borderRadius: MEDORA_CARD_SHELL.radius,
    boxShadow: MEDORA_CARD_SHELL.boxShadow,
    padding: "14px 18px",
  };

  if (!canCapture) {
    return null;
  }

  const busy = saving || isLocked;

  return (
    <div style={shell}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{tP("heading")}</h3>
      <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>{tP("intro")}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10, alignItems: "center" }}>
        <label style={{ fontSize: 13, color: "#334155" }}>
          {tP("systemFilter")}
          <select
            value={systemFilter}
            onChange={(e) => setSystemFilter(e.target.value as "" | "CPT" | "HCPCS")}
            disabled={busy}
            style={{ marginLeft: 6, padding: "6px 8px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
          >
            <option value="">{tP("systemAll")}</option>
            <option value="CPT">{tP("cpt")}</option>
            <option value="HCPCS">{tP("hcpcs")}</option>
          </select>
        </label>
      </div>

      <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block" }}>
        {tP("searchLabel")}
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder={tP("searchPlaceholder")}
          disabled={busy}
          style={{
            display: "block",
            marginTop: 6,
            width: "100%",
            maxWidth: 480,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            fontSize: 14,
          }}
        />
      </label>
      {searching ? <div style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>{tP("searching")}</div> : null}
      {!searching && searchQ.trim().length >= 2 && hits.length === 0 ? (
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>{tP("noResults")}</div>
      ) : null}

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <label style={{ fontSize: 12, color: "#334155" }}>
          {tP("modifier1")}
          <input
            value={mod1}
            onChange={(e) => setMod1(e.target.value)}
            maxLength={8}
            disabled={busy}
            style={{ display: "block", marginTop: 4, padding: "6px 8px", width: 88, borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
        </label>
        <label style={{ fontSize: 12, color: "#334155" }}>
          {tP("modifier2")}
          <input
            value={mod2}
            onChange={(e) => setMod2(e.target.value)}
            maxLength={8}
            disabled={busy}
            style={{ display: "block", marginTop: 4, padding: "6px 8px", width: 88, borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
        </label>
        <label style={{ fontSize: 12, color: "#334155" }}>
          {tP("units")}
          <input
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            inputMode="numeric"
            disabled={busy}
            style={{ display: "block", marginTop: 4, padding: "6px 8px", width: 72, borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
        </label>
      </div>

      {hits.length > 0 ? (
        <ul
          style={{
            margin: "10px 0 0 0",
            padding: 0,
            listStyle: "none",
            maxHeight: 200,
            overflowY: "auto",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            background: "#fff",
          }}
        >
          {hits.map((h) => (
            <li key={h.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void pickCatalog(h)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  background: "transparent",
                  cursor: busy ? "not-allowed" : "pointer",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, color: "#0f172a" }}>
                  {h.code} <span style={{ color: "#64748b", fontWeight: 500 }}>({h.codeSystem})</span>
                </div>
                <div style={{ color: "#475569", marginTop: 2 }}>{h.shortDescription}</div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          disabled={busy}
          style={{
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: manualOpen ? "#e2e8f0" : "#fff",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {tP("manualToggle")}
        </button>
      </div>
      {manualOpen ? (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#b45309", lineHeight: 1.45 }}>{tP("manualWarning")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: "#334155" }}>
              {tP("manualSystem")}
              <select
                value={manualSystem}
                onChange={(e) => setManualSystem(e.target.value as "CPT" | "HCPCS")}
                disabled={busy}
                style={{ display: "block", marginTop: 4, padding: "6px 8px", borderRadius: 8, border: "1px solid #e2e8f0" }}
              >
                <option value="CPT">{tP("cpt")}</option>
                <option value="HCPCS">{tP("hcpcs")}</option>
              </select>
            </label>
          </div>
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder={tP("manualCodePh")}
            disabled={busy}
            style={{ display: "block", width: "100%", maxWidth: 360, padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 8 }}
          />
          <input
            value={manualDesc}
            onChange={(e) => setManualDesc(e.target.value)}
            placeholder={tP("manualDescPh")}
            disabled={busy}
            style={{ display: "block", width: "100%", maxWidth: 360, padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 8 }}
          />
          <button
            type="button"
            onClick={() => void submitManual()}
            disabled={busy}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {tP("manualSubmit")}
          </button>
        </div>
      ) : null}

      {error ? (
        <div role="alert" style={{ marginTop: 12, fontSize: 13, color: "#b91c1c" }}>
          {error}
        </div>
      ) : null}
      {success ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "#15803d" }}>
          {success}
        </div>
      ) : null}
    </div>
  );
}
