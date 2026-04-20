"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";

type PayerOpt = { id: string; name: string; code: string | null };

export type CoverageRow = {
  id: string;
  rank: string;
  payerId: string | null;
  payerNameFreeText: string | null;
  planName: string | null;
  memberId: string | null;
  groupNumber: string | null;
  subscriberName: string | null;
  relationToSubscriber: string | null;
  phone: string | null;
  notes: string | null;
  payer: PayerOpt | null;
};

type MsgKeys = {
  sectionTitle: string;
  panelIntro: string;
  loadError: string;
  saveError: string;
  saveSuccess: string;
  payerSearch: string;
  payerPlaceholder: string;
  freeTextPayer: string;
  freeTextPlaceholder: string;
  payerLabel: string;
  planName: string;
  memberId: string;
  groupNumber: string;
  subscriberName: string;
  relationToSubscriber: string;
  phone: string;
  notes: string;
  reset: string;
  saving: string;
  save: string;
  noneStored: string;
  blockedUntilPrimary?: string;
};

const MSG: Record<"PRIMARY" | "SECONDARY", MsgKeys> = {
  PRIMARY: {
    sectionTitle: "insurancePrimary.sectionTitle",
    panelIntro: "insurancePrimary.panelIntro",
    loadError: "insurancePrimary.loadError",
    saveError: "insurancePrimary.saveError",
    saveSuccess: "insurancePrimary.saveSuccess",
    payerSearch: "insurancePrimary.payerSearch",
    payerPlaceholder: "insurancePrimary.payerPlaceholder",
    freeTextPayer: "insurancePrimary.freeTextPayer",
    freeTextPlaceholder: "insurancePrimary.freeTextPlaceholder",
    payerLabel: "insurancePrimary.payerLabel",
    planName: "insurancePrimary.planName",
    memberId: "insurancePrimary.memberId",
    groupNumber: "insurancePrimary.groupNumber",
    subscriberName: "insurancePrimary.subscriberName",
    relationToSubscriber: "insurancePrimary.relationToSubscriber",
    phone: "insurancePrimary.phone",
    notes: "insurancePrimary.notes",
    reset: "insurancePrimary.reset",
    saving: "insurancePrimary.saving",
    save: "insurancePrimary.save",
    noneStored: "insurancePrimary.noneStored",
  },
  SECONDARY: {
    sectionTitle: "insuranceSecondary.sectionTitle",
    panelIntro: "insuranceSecondary.panelIntro",
    loadError: "insuranceSecondary.loadError",
    saveError: "insuranceSecondary.saveError",
    saveSuccess: "insuranceSecondary.saveSuccess",
    payerSearch: "insuranceSecondary.payerSearch",
    payerPlaceholder: "insuranceSecondary.payerPlaceholder",
    freeTextPayer: "insuranceSecondary.freeTextPayer",
    freeTextPlaceholder: "insuranceSecondary.freeTextPlaceholder",
    payerLabel: "insuranceSecondary.payerLabel",
    planName: "insuranceSecondary.planName",
    memberId: "insuranceSecondary.memberId",
    groupNumber: "insuranceSecondary.groupNumber",
    subscriberName: "insuranceSecondary.subscriberName",
    relationToSubscriber: "insuranceSecondary.relationToSubscriber",
    phone: "insuranceSecondary.phone",
    notes: "insuranceSecondary.notes",
    reset: "insuranceSecondary.reset",
    saving: "insuranceSecondary.saving",
    save: "insuranceSecondary.save",
    noneStored: "insuranceSecondary.noneStored",
    blockedUntilPrimary: "insuranceSecondary.blockedUntilPrimary",
  },
};

export function PatientInsuranceCoveragePanel({
  patientId,
  facilityId,
  canEdit,
  coverageRank,
  onSaved,
  syncVersion = 0,
}: {
  patientId: string;
  facilityId: string;
  canEdit: boolean;
  coverageRank: "PRIMARY" | "SECONDARY";
  onSaved?: () => void;
  /** Increment when any coverage changes so both panels reload (e.g. primary clear cascades secondary). */
  syncVersion?: number;
}) {
  const { t, language } = useI18n();
  const m = MSG[coverageRank];
  const apiPath = coverageRank === "PRIMARY" ? "primary" : "secondary";
  const payerSearchRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [open, setOpen] = useState(coverageRank === "PRIMARY");
  const [primaryRowExists, setPrimaryRowExists] = useState(false);

  const [payerId, setPayerId] = useState<string | null>(null);
  const [payerQuery, setPayerQuery] = useState("");
  const [payerSuggestions, setPayerSuggestions] = useState<PayerOpt[]>([]);
  const [payerNameFreeText, setPayerNameFreeText] = useState("");
  const [planName, setPlanName] = useState("");
  const [memberId, setMemberId] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [subscriberName, setSubscriberName] = useState("");
  const [relationToSubscriber, setRelationToSubscriber] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [useFreeTextPayer, setUseFreeTextPayer] = useState(false);

  const secondaryBlocked = coverageRank === "SECONDARY" && canEdit && !primaryRowExists && !loading;

  const load = useCallback(async () => {
    if (!facilityId || !patientId) return;
    setLoading(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const rows = (await apiFetch(`/patients/${patientId}/insurance`, { facilityId })) as CoverageRow[];
      const list = Array.isArray(rows) ? rows : [];
      setPrimaryRowExists(list.some((r) => r?.rank === "PRIMARY"));
      const row = list.find((r) => r?.rank === coverageRank);
      if (row) {
        setPayerId(row.payerId);
        setPayerNameFreeText(row.payerNameFreeText ?? "");
        setPlanName(row.planName ?? "");
        setMemberId(row.memberId ?? "");
        setGroupNumber(row.groupNumber ?? "");
        setSubscriberName(row.subscriberName ?? "");
        setRelationToSubscriber(row.relationToSubscriber ?? "");
        setPhone(row.phone ?? "");
        setNotes(row.notes ?? "");
        setUseFreeTextPayer(Boolean(row.payerNameFreeText?.trim()) && !row.payerId);
        setPayerQuery(row.payer?.name ?? "");
      } else {
        setPayerId(null);
        setPayerNameFreeText("");
        setPlanName("");
        setMemberId("");
        setGroupNumber("");
        setSubscriberName("");
        setRelationToSubscriber("");
        setPhone("");
        setNotes("");
        setUseFreeTextPayer(false);
        setPayerQuery("");
      }
    } catch (e) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t(m.loadError)
      );
    } finally {
      setLoading(false);
    }
  }, [facilityId, patientId, coverageRank, syncVersion, t, m.loadError, language]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open || loading) return;
    if (!canEdit) return;
    if (secondaryBlocked) return;
    const id = window.setTimeout(() => payerSearchRef.current?.focus(), 120);
    return () => window.clearTimeout(id);
  }, [open, loading, canEdit, secondaryBlocked]);

  useEffect(() => {
    const q = payerQuery.trim();
    if (q.length < 2 || useFreeTextPayer || secondaryBlocked) {
      setPayerSuggestions([]);
      return;
    }
    const tmr = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await apiFetch(`/insurance-payers?q=${encodeURIComponent(q)}&limit=15`, { facilityId });
          setPayerSuggestions(Array.isArray(data) ? data : []);
        } catch {
          setPayerSuggestions([]);
        }
      })();
    }, 280);
    return () => window.clearTimeout(tmr);
  }, [payerQuery, facilityId, useFreeTextPayer, secondaryBlocked]);

  const save = async () => {
    if (!canEdit) return;
    if (coverageRank === "SECONDARY" && !primaryRowExists) {
      setError(m.blockedUntilPrimary ? t(m.blockedUntilPrimary) : t("insuranceSecondary.blockedUntilPrimary"));
      return;
    }
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const body: Record<string, unknown> = {
        payerId: useFreeTextPayer ? null : payerId,
        payerNameFreeText: useFreeTextPayer ? payerNameFreeText.trim() || null : null,
        planName: planName.trim() || undefined,
        memberId: memberId.trim() || undefined,
        groupNumber: groupNumber.trim() || undefined,
        subscriberName: subscriberName.trim() || undefined,
        relationToSubscriber: relationToSubscriber.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      const hasAny =
        (!useFreeTextPayer && payerId) ||
        (useFreeTextPayer && payerNameFreeText.trim()) ||
        planName.trim() ||
        memberId.trim() ||
        groupNumber.trim() ||
        subscriberName.trim() ||
        relationToSubscriber.trim() ||
        phone.trim() ||
        notes.trim();
      const isClear = !hasAny;
      if (isClear) {
        body.clear = true;
      }
      await apiFetch(`/patients/${patientId}/insurance/${apiPath}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        facilityId,
      });
      await load();
      if (!isClear) {
        setSaveSuccess(true);
        window.setTimeout(() => setSaveSuccess(false), 3500);
      }
      onSaved?.();
    } catch (e) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t(m.saveError)
      );
    } finally {
      setSaving(false);
    }
  };

  const accent =
    coverageRank === "PRIMARY"
      ? "4px solid #1565c0"
      : "4px solid #00838f";

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      style={{
        marginBottom: 16,
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        background: "#fafafa",
        padding: "10px 14px",
        borderLeft: accent,
      }}
    >
      <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>
        {t(m.sectionTitle)}
      </summary>
      <div style={{ marginTop: 12, fontSize: 13 }}>
        <p style={{ margin: "0 0 12px 0", color: "#555", lineHeight: 1.45 }}>{t(m.panelIntro)}</p>
        {loading && <div style={{ color: "#616161" }}>{t("common.loading")}</div>}
        {!loading && saveSuccess && canEdit && !secondaryBlocked && (
          <div
            style={{
              marginBottom: 10,
              padding: "8px 10px",
              background: "#e8f5e9",
              color: "#1b5e20",
              borderRadius: 4,
              fontSize: 13,
            }}
            role="status"
          >
            {t(m.saveSuccess)}
          </div>
        )}
        {!loading && (
          <>
            {canEdit && secondaryBlocked && m.blockedUntilPrimary && (
              <div
                style={{
                  padding: "12px 12px",
                  background: "#fff8e1",
                  border: "1px solid #ffe082",
                  borderRadius: 6,
                  color: "#5d4037",
                  lineHeight: 1.45,
                }}
              >
                {t(m.blockedUntilPrimary)}
              </div>
            )}
            {canEdit && !secondaryBlocked && (
              <>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t(m.payerSearch)}</label>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 6 }}>
                    <input
                      type="checkbox"
                      checked={useFreeTextPayer}
                      onChange={(e) => {
                        setUseFreeTextPayer(e.target.checked);
                        if (e.target.checked) {
                          setPayerId(null);
                        }
                      }}
                    />
                    {t(m.freeTextPayer)}
                  </label>
                </div>
                {!useFreeTextPayer ? (
                  <>
                    <input
                      ref={payerSearchRef}
                      type="text"
                      value={payerQuery}
                      onChange={(e) => {
                        setPayerQuery(e.target.value);
                        setPayerId(null);
                      }}
                      placeholder={t(m.payerPlaceholder)}
                      style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                    {payerSuggestions.length > 0 && (
                      <ul
                        style={{
                          listStyle: "none",
                          margin: "6px 0 0 0",
                          padding: 0,
                          border: "1px solid #eee",
                          borderRadius: 4,
                          maxHeight: 160,
                          overflow: "auto",
                          background: "#fff",
                        }}
                      >
                        {payerSuggestions.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setPayerId(p.id);
                                setPayerQuery(p.name);
                                setPayerSuggestions([]);
                              }}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                padding: "8px 10px",
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: 13,
                              }}
                            >
                              {p.name}
                              {p.code ? ` · ${p.code}` : ""}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    value={payerNameFreeText}
                    onChange={(e) => setPayerNameFreeText(e.target.value)}
                    placeholder={t(m.freeTextPlaceholder)}
                    style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                  />
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t(m.planName)}</label>
                    <input
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t(m.memberId)}</label>
                    <input
                      type="text"
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t(m.groupNumber)}</label>
                    <input
                      type="text"
                      value={groupNumber}
                      onChange={(e) => setGroupNumber(e.target.value)}
                      style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t(m.subscriberName)}</label>
                    <input
                      type="text"
                      value={subscriberName}
                      onChange={(e) => setSubscriberName(e.target.value)}
                      style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t(m.relationToSubscriber)}</label>
                    <input
                      type="text"
                      value={relationToSubscriber}
                      onChange={(e) => setRelationToSubscriber(e.target.value)}
                      style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t(m.phone)}</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t(m.notes)}</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, resize: "vertical" }}
                  />
                </div>
                {error && (
                  <div style={{ marginTop: 10, padding: 10, background: "#ffebee", color: "#b71c1c", borderRadius: 4, fontSize: 13 }}>
                    {error}
                  </div>
                )}
                <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => void load()}
                    style={{ padding: "8px 14px", border: "1px solid #ccc", borderRadius: 4, background: "#fff", cursor: "pointer" }}
                  >
                    {t(m.reset)}
                  </button>
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving}
                    style={{
                      padding: "8px 14px",
                      border: "none",
                      borderRadius: 4,
                      background: "#1a1a1a",
                      color: "#fff",
                      cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? t(m.saving) : t(m.save)}
                  </button>
                </div>
              </>
            )}
            {!canEdit && (
              <div style={{ color: "#555", lineHeight: 1.5 }}>
                {payerId || payerNameFreeText?.trim() || planName || memberId ? (
                  <>
                    <div>
                      <strong>{t(m.payerLabel)}</strong>{" "}
                      {useFreeTextPayer || !payerId ? payerNameFreeText || t("common.dash") : payerQuery || t("common.dash")}
                    </div>
                    {planName && (
                      <div>
                        <strong>{t(m.planName)}</strong> {planName}
                      </div>
                    )}
                    {memberId && (
                      <div>
                        <strong>{t(m.memberId)}</strong> {memberId}
                      </div>
                    )}
                  </>
                ) : (
                  <span style={{ color: "#888" }}>{t(m.noneStored)}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}

export function PatientPrimaryInsurancePanel(
  props: Omit<React.ComponentProps<typeof PatientInsuranceCoveragePanel>, "coverageRank">
) {
  return <PatientInsuranceCoveragePanel {...props} coverageRank="PRIMARY" />;
}

export function PatientSecondaryInsurancePanel(
  props: Omit<React.ComponentProps<typeof PatientInsuranceCoveragePanel>, "coverageRank">
) {
  return <PatientInsuranceCoveragePanel {...props} coverageRank="SECONDARY" />;
}
