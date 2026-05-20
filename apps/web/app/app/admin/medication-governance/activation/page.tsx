"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  approveFormularyInactive,
  disableRuntimeActivation,
  enableBillingActivation,
  enableMarActivation,
  enableOrderSearchActivation,
  fetchActivationCandidates,
  requestBillingReviewActivation,
  type ActivationCandidateRow,
} from "@/lib/medicationActivationGovernanceApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

function cardStyle(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#fff",
  };
}

function StatusBadge({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 9999,
        marginRight: 6,
        marginBottom: 4,
        background: on ? "#dcfce7" : "#f1f5f9",
        color: on ? "#166534" : "#64748b",
      }}
    >
      {label}: {on ? "✓" : "—"}
    </span>
  );
}

export default function MedicationGovernanceActivationPage() {
  const { t, language } = useI18n();
  const { ready, roles, facilityId } = useFacilityAndRoles();
  const isAdmin = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  const [items, setItems] = useState<ActivationCandidateRow[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [confirmExact, setConfirmExact] = useState(false);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [billingCode, setBillingCode] = useState("");
  const [billingUnit, setBillingUnit] = useState("");
  const [billingRole, setBillingRole] = useState("PHARMACY");

  const selected = useMemo(
    () => items.find((r) => r.productId === selectedId) ?? null,
    [items, selectedId]
  );

  const loadQueue = useCallback(async () => {
    if (!isAdmin || !facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchActivationCandidates(facilityId, {
        q: searchQ.trim() || undefined,
        limit: 100,
      });
      const rows = Array.isArray(res.items) ? res.items : [];
      setItems(rows);
      if (rows.length && !rows.some((r) => r.productId === selectedId)) {
        setSelectedId(rows[0]?.productId ?? null);
      }
    } catch (err) {
      setError(
        normalizeUserFacingError((err as Error)?.message, language) ||
          t("medicationGovernanceActivation.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin, facilityId, searchQ, language, t, selectedId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const runAction = async (fn: () => Promise<unknown>) => {
    if (!selected || !facilityId) return;
    if (!note.trim() || !confirmExact || !confirmDuplicate) {
      setError(t("medicationGovernanceActivation.errorConfirmations"));
      return;
    }
    setActing(true);
    setError(null);
    try {
      await fn();
      setConfirmExact(false);
      setConfirmDuplicate(false);
      setNote("");
      await loadQueue();
    } catch (err) {
      setError(
        normalizeUserFacingError((err as Error)?.message, language) ||
          t("medicationGovernanceActivation.errorAction")
      );
    } finally {
      setActing(false);
    }
  };

  const baseBody = () => ({
    facilityId: facilityId!,
    note: note.trim(),
    confirmExactSourcePreserved: true as const,
    confirmDuplicateGovernanceResolved: true as const,
  });

  if (!ready) return null;

  if (!isAdmin) {
    return (
      <main style={{ padding: 24, maxWidth: 960 }}>
        <p>{t("medicationGovernanceActivation.accessDenied")}</p>
      </main>
    );
  }

  if (!facilityId) {
    return (
      <main style={{ padding: 24, maxWidth: 960 }}>
        <p>{t("medicationGovernanceActivation.errorFacility")}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <p style={{ margin: "0 0 8px 0", fontSize: 13 }}>
        <Link href="/app/admin/medication-governance">
          {t("medicationGovernanceActivation.backGovernance")}
        </Link>
        {" · "}
        <Link href="/app/admin">{t("medicationGovernanceActivation.backAdmin")}</Link>
      </p>
      <h1 style={{ margin: "0 0 8px 0", fontSize: 22 }}>{t("medicationGovernanceActivation.title")}</h1>
      <p style={{ margin: "0 0 12px 0", color: "#64748b", fontSize: 14 }}>
        {t("medicationGovernanceActivation.intro")}
      </p>
      <div
        style={{
          ...cardStyle(),
          background: "#fffbeb",
          borderColor: "#fcd34d",
          marginBottom: 16,
        }}
      >
        <strong>{t("medicationGovernanceActivation.safetyBanner")}</strong>
      </div>

      {error ? (
        <p style={{ color: "#b91c1c", fontSize: 14 }} role="alert">
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder={t("medicationGovernanceActivation.searchPlaceholder")}
          style={{ flex: 1, minWidth: 200, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
        />
        <button type="button" onClick={() => void loadQueue()} disabled={loading}>
          {loading ? t("medicationGovernanceActivation.loading") : t("medicationGovernanceActivation.refresh")}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16, alignItems: "start" }}>
        <section style={cardStyle()}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 15 }}>
            {t("medicationGovernanceActivation.candidatesTitle")} ({items.length})
          </h2>
          {items.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 13 }}>{t("medicationGovernanceActivation.noRows")}</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 480, overflow: "auto" }}>
              {items.map((row) => (
                <li key={row.productId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.productId)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      marginBottom: 4,
                      borderRadius: 8,
                      border:
                        selectedId === row.productId ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      background: selectedId === row.productId ? "#eff6ff" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {row.medicationDisplayName ?? row.exactSourceMedication ?? row.productCode}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{row.activationState}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {selected ? (
          <section style={cardStyle()}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: 15 }}>
              {t("medicationGovernanceActivation.detailTitle")}
            </h2>
            <p style={{ margin: "4px 0", fontSize: 13 }}>
              <strong>{t("medicationGovernanceActivation.colProduct")}:</strong> {selected.productCode}
            </p>
            <p style={{ margin: "4px 0", fontSize: 13 }}>
              <strong>{t("medicationGovernanceActivation.colSourceMedication")}:</strong>{" "}
              {selected.exactSourceMedication ?? "—"}
            </p>
            <p style={{ margin: "4px 0", fontSize: 13 }}>
              <strong>{t("medicationGovernanceActivation.colSourceDose")}:</strong>{" "}
              {selected.exactSourceDose ?? "—"}
            </p>
            <p style={{ margin: "4px 0", fontSize: 13 }}>
              <strong>{t("medicationGovernanceActivation.colSourceForm")}:</strong>{" "}
              {selected.exactSourceFormRoute ?? "—"}
            </p>
            <p style={{ margin: "4px 0", fontSize: 13 }}>
              <strong>{t("medicationGovernanceActivation.colGovernance")}:</strong> {selected.governanceStatus}
            </p>
            <p style={{ margin: "4px 0", fontSize: 13 }}>
              <strong>{t("medicationGovernanceActivation.colDuplicate")}:</strong>{" "}
              {selected.duplicateGovernanceStatus ?? "—"}{" "}
              {selected.duplicateGovernanceResolved
                ? t("medicationGovernanceActivation.duplicateResolved")
                : t("medicationGovernanceActivation.duplicateUnresolved")}
            </p>

            <div style={{ margin: "12px 0" }}>
              <StatusBadge label={t("medicationGovernanceActivation.statusFormulary")} on={selected.formularyOnFormulary} />
              <StatusBadge
                label={t("medicationGovernanceActivation.statusOrderSearch")}
                on={selected.runtime.orderSearchEnabled}
              />
              <StatusBadge label={t("medicationGovernanceActivation.statusMar")} on={selected.runtime.marEnabled} />
              <StatusBadge
                label={t("medicationGovernanceActivation.statusBilling")}
                on={selected.runtime.billingEnabled}
              />
            </div>

            {selected.blockerReasons.length > 0 ? (
              <div style={{ marginBottom: 12, fontSize: 12, color: "#92400e" }}>
                <strong>{t("medicationGovernanceActivation.blockers")}:</strong>{" "}
                {selected.blockerReasons.join(", ")}
              </div>
            ) : null}

            <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
              {t("medicationGovernanceActivation.noteLabel")}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8 }}
                placeholder={t("medicationGovernanceActivation.notePlaceholder")}
              />
            </label>
            <label style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 6 }}>
              <input type="checkbox" checked={confirmExact} onChange={(e) => setConfirmExact(e.target.checked)} />
              {t("medicationGovernanceActivation.confirmExactSource")}
            </label>
            <label style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={confirmDuplicate}
                onChange={(e) => setConfirmDuplicate(e.target.checked)}
              />
              {t("medicationGovernanceActivation.confirmDuplicateResolved")}
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  void runAction(() =>
                    approveFormularyInactive(selected.productId, facilityId, baseBody())
                  )
                }
              >
                {t("medicationGovernanceActivation.actionApproveFormulary")}
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  void runAction(() =>
                    enableOrderSearchActivation(selected.productId, facilityId, baseBody())
                  )
                }
              >
                {t("medicationGovernanceActivation.actionEnableOrderSearch")}
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  void runAction(() => enableMarActivation(selected.productId, facilityId, baseBody()))
                }
              >
                {t("medicationGovernanceActivation.actionEnableMar")}
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  void runAction(() =>
                    requestBillingReviewActivation(selected.productId, facilityId, baseBody())
                  )
                }
              >
                {t("medicationGovernanceActivation.actionRequestBillingReview")}
              </button>
              <div style={{ display: "grid", gap: 6, marginTop: 4 }}>
                <input
                  value={billingCode}
                  onChange={(e) => setBillingCode(e.target.value)}
                  placeholder={t("medicationGovernanceActivation.billingCodePlaceholder")}
                />
                <input
                  value={billingUnit}
                  onChange={(e) => setBillingUnit(e.target.value)}
                  placeholder={t("medicationGovernanceActivation.billingUnitPlaceholder")}
                />
                <input
                  value={billingRole}
                  onChange={(e) => setBillingRole(e.target.value)}
                  placeholder={t("medicationGovernanceActivation.billingRolePlaceholder")}
                />
                <button
                  type="button"
                  disabled={acting || !billingCode.trim() || !billingUnit.trim()}
                  onClick={() =>
                    void runAction(() =>
                      enableBillingActivation(selected.productId, facilityId, {
                        ...baseBody(),
                        reviewedBillingCode: billingCode.trim(),
                        reviewedBillingUnit: billingUnit.trim(),
                        reviewedByRole: billingRole.trim() || "PHARMACY",
                      })
                    )
                  }
                >
                  {t("medicationGovernanceActivation.actionEnableBilling")}
                </button>
              </div>
              <button
                type="button"
                disabled={acting}
                style={{ marginTop: 8, color: "#b91c1c" }}
                onClick={() =>
                  void runAction(() =>
                    disableRuntimeActivation(selected.productId, facilityId, baseBody())
                  )
                }
              >
                {t("medicationGovernanceActivation.actionDisableRuntime")}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
