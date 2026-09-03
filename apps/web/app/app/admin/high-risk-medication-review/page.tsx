"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  approveHighRiskCatalogOnly,
  approveHighRiskProviderOrdering,
  fetchHighRiskMedicationQueue,
  rejectHighRiskMedication,
  type HighRiskMedicationQueueRow,
} from "@/lib/highRiskMedicationReviewApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { productUiBcp47Tag } from "@/i18n/config";

function cardStyle(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#fff",
  };
}

function bannerStyle(): CSSProperties {
  return {
    border: "1px solid #fcd34d",
    borderRadius: 10,
    padding: "10px 12px",
    background: "#fffbeb",
    color: "#92400e",
    fontSize: 13,
    lineHeight: 1.5,
  };
}

export default function HighRiskMedicationReviewPage() {
  const { t, language } = useI18n();
  const { ready, roles, facilityId, isPlatformOperator } = useFacilityAndRoles();
  const canReview =
    isPlatformOperator ||
    roles.includes("PHARMACY") ||
    roles.includes("MEDORA_SUPER_ADMIN");

  const [rows, setRows] = useState<HighRiskMedicationQueueRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [noteByProduct, setNoteByProduct] = useState<Record<string, string>>({});
  const [confirmProvider, setConfirmProvider] = useState<Record<string, boolean>>({});
  const [confirmMar, setConfirmMar] = useState<Record<string, boolean>>({});
  const [confirmBilling, setConfirmBilling] = useState<Record<string, boolean>>({});
  const [confirmInventory, setConfirmInventory] = useState<Record<string, boolean>>({});

  const loadQueue = useCallback(async () => {
    if (!facilityId || !canReview) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHighRiskMedicationQueue(facilityId);
      setRows(result.rows);
    } catch (e: unknown) {
      setRows([]);
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("highRiskMedicationReview.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, canReview, language, t]);

  useEffect(() => {
    if (!ready) return;
    void loadQueue();
  }, [ready, loadQueue]);

  const getNote = (productId: string) => noteByProduct[productId]?.trim() ?? "";

  const runAction = useCallback(
    async (
      row: HighRiskMedicationQueueRow,
      action: "catalog" | "provider" | "reject"
    ) => {
      if (!facilityId) return;
      const note = getNote(row.productId);
      if (!note) {
        setError(t("highRiskMedicationReview.errorNoteRequired"));
        return;
      }
      if (action === "provider") {
        if (
          !confirmProvider[row.productId] ||
          !confirmMar[row.productId] ||
          !confirmBilling[row.productId] ||
          !confirmInventory[row.productId]
        ) {
          setError(t("highRiskMedicationReview.errorConfirmRequired"));
          return;
        }
      }
      setBusy(true);
      setError(null);
      setSuccess(null);
      try {
        if (action === "catalog") {
          await approveHighRiskCatalogOnly(row.productId, { facilityId, note });
          setSuccess(t("highRiskMedicationReview.successCatalog"));
        } else if (action === "provider") {
          const out = await approveHighRiskProviderOrdering(row.productId, {
            facilityId,
            note,
            confirmProviderOrderingOnly: true,
            confirmMarRemainsOff: true,
            confirmBillingRemainsOff: true,
            confirmInventoryRemainsOff: true,
          });
          if (out.marEnabled || out.billingEnabled) {
            setError(t("highRiskMedicationReview.errorUnsafeActivation"));
          } else {
            setSuccess(t("highRiskMedicationReview.successProvider"));
          }
        } else {
          await rejectHighRiskMedication(row.productId, { facilityId, note });
          setSuccess(t("highRiskMedicationReview.successReject"));
        }
        await loadQueue();
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "";
        setError(normalizeUserFacingError(raw, language) || t("highRiskMedicationReview.errorAction"));
      } finally {
        setBusy(false);
      }
    },
    [
      facilityId,
      confirmProvider,
      confirmMar,
      confirmBilling,
      confirmInventory,
      noteByProduct,
      language,
      t,
      loadQueue,
    ]
  );

  if (!ready) {
    return <p>{t("highRiskMedicationReview.loading")}</p>;
  }

  if (!canReview) {
    return (
      <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        <p role="alert">{t("highRiskMedicationReview.accessDenied")}</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <p>
        <Link href="/app/admin">{t("highRiskMedicationReview.backAdmin")}</Link>
      </p>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>{t("highRiskMedicationReview.title")}</h1>
      <p style={{ color: "#64748b", marginBottom: 16 }}>{t("highRiskMedicationReview.intro")}</p>

      <div style={{ ...bannerStyle(), marginBottom: 16 }}>
        <p style={{ margin: 0 }}>{t("highRiskMedicationReview.bannerProviderOnly")}</p>
        <p style={{ margin: "6px 0 0 0" }}>{t("highRiskMedicationReview.bannerMarOff")}</p>
        <p style={{ margin: "6px 0 0 0" }}>{t("highRiskMedicationReview.bannerBillingOff")}</p>
        <p style={{ margin: "6px 0 0 0" }}>{t("highRiskMedicationReview.bannerInventoryOff")}</p>
      </div>

      <div style={{ marginBottom: 12 }}>
        <button type="button" onClick={() => void loadQueue()} disabled={loading || busy}>
          {t("highRiskMedicationReview.refresh")}
        </button>
      </div>

      {error && (
        <p style={{ color: "#b91c1c" }} role="alert">
          {error}
        </p>
      )}
      {success && (
        <p style={{ color: "#166534" }} role="status">
          {success}
        </p>
      )}

      {loading ? (
        <p>{t("highRiskMedicationReview.loading")}</p>
      ) : rows.length === 0 ? (
        <p>{t("highRiskMedicationReview.empty")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((row) => (
            <article key={row.productId} style={cardStyle()}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16 }}>
                    {row.medicationName} — {row.dose} — {row.form}
                  </h2>
                  <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#64748b" }}>
                    {t("highRiskMedicationReview.sourceLine")
                      .replace("{file}", row.sourceFilename)
                      .replace("{row}", String(row.sourceRowNumber))}
                  </p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#64748b" }}>
                    {t("highRiskMedicationReview.importedAt")}:{" "}
                    {new Date(row.importedAt).toLocaleString(productUiBcp47Tag(language))}
                  </p>
                  {row.facilityName && (
                    <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#64748b" }}>
                      {t("highRiskMedicationReview.facility")}: {row.facilityName}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {row.isHighAlert && (
                    <span
                      style={{
                        fontSize: 12,
                        padding: "2px 8px",
                        borderRadius: 9999,
                        background: "#fef2f2",
                        color: "#991b1b",
                      }}
                    >
                      {t("highRiskMedicationReview.badgeHighAlert")}
                    </span>
                  )}
                  {row.isControlled && (
                    <span
                      style={{
                        fontSize: 12,
                        padding: "2px 8px",
                        borderRadius: 9999,
                        background: "#fff7ed",
                        color: "#9a3412",
                      }}
                    >
                      {t("highRiskMedicationReview.badgeControlled")}
                    </span>
                  )}
                </div>
              </div>

              <p style={{ margin: "8px 0 0 0", fontSize: 13 }}>
                <strong>{t("highRiskMedicationReview.classification")}:</strong>{" "}
                {row.classificationReasonCodes.join(", ") || t("highRiskMedicationReview.classificationDefault")}
              </p>
              {row.duplicateWarning && (
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#b45309" }}>
                  {t("highRiskMedicationReview.duplicateWarning")}: {row.duplicateWarning}
                </p>
              )}

              <label style={{ display: "block", marginTop: 10, fontSize: 13 }}>
                {t("highRiskMedicationReview.noteLabel")}
                <textarea
                  value={noteByProduct[row.productId] ?? ""}
                  onChange={(e) =>
                    setNoteByProduct((prev) => ({ ...prev, [row.productId]: e.target.value }))
                  }
                  rows={2}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                />
              </label>

              <div style={{ marginTop: 8, fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={confirmProvider[row.productId] ?? false}
                    onChange={(e) =>
                      setConfirmProvider((prev) => ({ ...prev, [row.productId]: e.target.checked }))
                    }
                  />
                  {t("highRiskMedicationReview.confirmProviderOnly")}
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={confirmMar[row.productId] ?? false}
                    onChange={(e) =>
                      setConfirmMar((prev) => ({ ...prev, [row.productId]: e.target.checked }))
                    }
                  />
                  {t("highRiskMedicationReview.confirmMarOff")}
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={confirmBilling[row.productId] ?? false}
                    onChange={(e) =>
                      setConfirmBilling((prev) => ({ ...prev, [row.productId]: e.target.checked }))
                    }
                  />
                  {t("highRiskMedicationReview.confirmBillingOff")}
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={confirmInventory[row.productId] ?? false}
                    onChange={(e) =>
                      setConfirmInventory((prev) => ({ ...prev, [row.productId]: e.target.checked }))
                    }
                  />
                  {t("highRiskMedicationReview.confirmInventoryOff")}
                </label>
              </div>

              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction(row, "provider")}
                >
                  {t("highRiskMedicationReview.approveProvider")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction(row, "catalog")}
                >
                  {t("highRiskMedicationReview.approveCatalog")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction(row, "reject")}
                  style={{ color: "#b91c1c" }}
                >
                  {t("highRiskMedicationReview.reject")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
