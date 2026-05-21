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
  formatActivationGovernanceError,
  requestBillingReviewActivation,
  type ActivationCandidateRow,
} from "@/lib/medicationActivationGovernanceApi";
import {
  formatActivationBlockerMessage,
  getActivationCandidateUiState,
} from "@/lib/medicationActivationGovernanceUi.util";

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
  const { t } = useI18n();
  const { ready, roles, facilityId } = useFacilityAndRoles();
  const isAdmin = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  const [items, setItems] = useState<ActivationCandidateRow[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const selectedUi = useMemo(
    () => (selected ? getActivationCandidateUiState(selected, t) : null),
    [selected, t]
  );

  const loadQueue = useCallback(async () => {
    if (!isAdmin || !facilityId) return;
    setLoading(true);
    setLoadError(null);
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
      setItems([]);
      setLoadError(
        formatActivationGovernanceError(err, t) || t("medicationGovernanceActivation.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin, facilityId, searchQ, t, selectedId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const runAction = async (fn: () => Promise<unknown>) => {
    if (!selected || !facilityId) return;
    if (!note.trim() || !confirmExact || !confirmDuplicate) {
      setActionError(t("medicationGovernanceActivation.errorConfirmations"));
      return;
    }
    setActing(true);
    setActionError(null);
    try {
      await fn();
      setConfirmExact(false);
      setConfirmDuplicate(false);
      setNote("");
      await loadQueue();
    } catch (err) {
      setActionError(formatActivationGovernanceError(err, t));
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

  const forwardDisabled = acting || (selectedUi?.forwardStepsDisabled ?? true);

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

      {loadError && items.length === 0 ? (
        <p style={{ color: "#b91c1c", fontSize: 14 }} role="alert">
          {loadError}
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
                    onClick={() => {
                      setSelectedId(row.productId);
                      setActionError(null);
                    }}
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

        {selected && selectedUi ? (
          <section style={cardStyle()}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: 15 }}>
              {t("medicationGovernanceActivation.detailTitle")}
            </h2>

            {!selectedUi.governanceActivationApproved ? (
              <div
                role="status"
                style={{
                  marginBottom: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "#fffbeb",
                  border: "1px solid #fcd34d",
                  fontSize: 13,
                  color: "#92400e",
                }}
              >
                <strong>
                  {selectedUi.governanceReviewRequired
                    ? t("medicationGovernanceActivation.governanceReviewRequired")
                    : t("medicationGovernanceActivation.governanceReviewRequiredBanner")}
                </strong>
                <p style={{ margin: "8px 0 0 0" }}>
                  {t("medicationGovernanceActivation.governanceApproveHint")}{" "}
                  <Link href="/app/admin/medication-governance">
                    {t("medicationGovernanceActivation.backGovernance")}
                  </Link>
                </p>
              </div>
            ) : null}

            {actionError ? (
              <div
                role="alert"
                style={{
                  marginBottom: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  fontSize: 13,
                  color: "#b91c1c",
                }}
              >
                <strong>{t("medicationGovernanceActivation.actionErrorTitle")}</strong>
                <p style={{ margin: "6px 0 0 0" }}>{actionError}</p>
              </div>
            ) : null}

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

            {selectedUi.blockerMessages.length > 0 ? (
              <div style={{ marginBottom: 12, fontSize: 12, color: "#92400e" }}>
                <strong>{t("medicationGovernanceActivation.blockers")}:</strong>
                <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                  {selectedUi.blockerMessages.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
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
                disabled={forwardDisabled}
              />
            </label>
            <label style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={confirmExact}
                onChange={(e) => setConfirmExact(e.target.checked)}
                disabled={forwardDisabled}
              />
              {t("medicationGovernanceActivation.confirmExactSource")}
            </label>
            <label style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={confirmDuplicate}
                onChange={(e) => setConfirmDuplicate(e.target.checked)}
                disabled={forwardDisabled}
              />
              {t("medicationGovernanceActivation.confirmDuplicateResolved")}
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                disabled={forwardDisabled}
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
                disabled={forwardDisabled}
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
                disabled={forwardDisabled}
                onClick={() =>
                  void runAction(() => enableMarActivation(selected.productId, facilityId, baseBody()))
                }
              >
                {t("medicationGovernanceActivation.actionEnableMar")}
              </button>
              <button
                type="button"
                disabled={forwardDisabled}
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
                  disabled={forwardDisabled}
                />
                <input
                  value={billingUnit}
                  onChange={(e) => setBillingUnit(e.target.value)}
                  placeholder={t("medicationGovernanceActivation.billingUnitPlaceholder")}
                  disabled={forwardDisabled}
                />
                <input
                  value={billingRole}
                  onChange={(e) => setBillingRole(e.target.value)}
                  placeholder={t("medicationGovernanceActivation.billingRolePlaceholder")}
                  disabled={forwardDisabled}
                />
                <button
                  type="button"
                  disabled={forwardDisabled || !billingCode.trim() || !billingUnit.trim()}
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
                disabled={acting || !selectedUi.canDisableRuntime}
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
