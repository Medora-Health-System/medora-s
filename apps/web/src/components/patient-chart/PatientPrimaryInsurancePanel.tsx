"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";

type PayerOpt = { id: string; name: string; code: string | null };

type PrimaryRow = {
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

export function PatientPrimaryInsurancePanel({
  patientId,
  facilityId,
  canEdit,
  onSaved,
}: {
  patientId: string;
  facilityId: string;
  canEdit: boolean;
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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

  const load = useCallback(async () => {
    if (!facilityId || !patientId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = (await apiFetch(`/patients/${patientId}/insurance`, { facilityId })) as PrimaryRow[];
      const primary = Array.isArray(rows) ? rows.find((r) => r?.rank === "PRIMARY") : undefined;
      const p = primary;
      if (p) {
        setPayerId(p.payerId);
        setPayerNameFreeText(p.payerNameFreeText ?? "");
        setPlanName(p.planName ?? "");
        setMemberId(p.memberId ?? "");
        setGroupNumber(p.groupNumber ?? "");
        setSubscriberName(p.subscriberName ?? "");
        setRelationToSubscriber(p.relationToSubscriber ?? "");
        setPhone(p.phone ?? "");
        setNotes(p.notes ?? "");
        setUseFreeTextPayer(Boolean(p.payerNameFreeText?.trim()) && !p.payerId);
        setPayerQuery(p.payer?.name ?? "");
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
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null) || t("insurancePrimary.loadError"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, patientId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const q = payerQuery.trim();
    if (q.length < 2 || useFreeTextPayer) {
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
  }, [payerQuery, facilityId, useFreeTextPayer]);

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
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
      if (!hasAny) {
        body.clear = true;
      }
      await apiFetch(`/patients/${patientId}/insurance/primary`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        facilityId,
      });
      await load();
      onSaved?.();
    } catch (e) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : null) || t("insurancePrimary.saveError")
      );
    } finally {
      setSaving(false);
    }
  };

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
      }}
    >
      <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#333" }}>
        {t("insurancePrimary.sectionTitle")}
      </summary>
      <div style={{ marginTop: 12, fontSize: 13 }}>
        {loading && <div style={{ color: "#616161" }}>{t("common.loading")}</div>}
        {!loading && (
          <>
            {canEdit && (
              <>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("insurancePrimary.payerSearch")}</label>
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
                    {t("insurancePrimary.freeTextPayer")}
                  </label>
                </div>
                {!useFreeTextPayer ? (
                  <>
                    <input
                      type="text"
                      value={payerQuery}
                      onChange={(e) => {
                        setPayerQuery(e.target.value);
                        setPayerId(null);
                      }}
                      placeholder={t("insurancePrimary.payerPlaceholder")}
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
                    placeholder={t("insurancePrimary.freeTextPlaceholder")}
                    style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                  />
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("insurancePrimary.planName")}</label>
                    <input
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("insurancePrimary.memberId")}</label>
                    <input
                      type="text"
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("insurancePrimary.groupNumber")}</label>
                    <input
                      type="text"
                      value={groupNumber}
                      onChange={(e) => setGroupNumber(e.target.value)}
                      style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("insurancePrimary.subscriberName")}</label>
                    <input
                      type="text"
                      value={subscriberName}
                      onChange={(e) => setSubscriberName(e.target.value)}
                      style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("insurancePrimary.relationToSubscriber")}</label>
                    <input
                      type="text"
                      value={relationToSubscriber}
                      onChange={(e) => setRelationToSubscriber(e.target.value)}
                      style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("insurancePrimary.phone")}</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("insurancePrimary.notes")}</label>
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
                    {t("insurancePrimary.reset")}
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
                    {saving ? t("insurancePrimary.saving") : t("insurancePrimary.save")}
                  </button>
                </div>
              </>
            )}
            {!canEdit && (
              <div style={{ color: "#555", lineHeight: 1.5 }}>
                {payerId || payerNameFreeText?.trim() || planName || memberId ? (
                  <>
                    <div>
                      <strong>{t("insurancePrimary.payerLabel")}</strong>{" "}
                      {useFreeTextPayer || !payerId ? payerNameFreeText || t("common.dash") : payerQuery || t("common.dash")}
                    </div>
                    {planName && (
                      <div>
                        <strong>{t("insurancePrimary.planName")}</strong> {planName}
                      </div>
                    )}
                    {memberId && (
                      <div>
                        <strong>{t("insurancePrimary.memberId")}</strong> {memberId}
                      </div>
                    )}
                  </>
                ) : (
                  <span style={{ color: "#888" }}>{t("insurancePrimary.noneStored")}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}
