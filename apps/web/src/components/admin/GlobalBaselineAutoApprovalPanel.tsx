"use client";

import { useCallback, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  runGlobalBaselineTieredAutoApprove,
  type GlobalBaselineAutoApproveResult,
} from "@/lib/medicationGlobalBaselineApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

type Props = {
  facilityId: string | undefined;
  isAdmin: boolean;
};

export function GlobalBaselineAutoApprovalPanel({ facilityId, isAdmin }: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = useState<GlobalBaselineAutoApproveResult | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [commitConfirm, setCommitConfirm] = useState(false);

  const setApiError = useCallback(
    (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        normalizeUserFacingError(msg, "fr") ||
          t("medicationGovernance.globalBaselineAutoApprove.errorRun")
      );
    },
    [t]
  );

  const runDryRun = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    setCommitConfirm(false);
    try {
      const result = await runGlobalBaselineTieredAutoApprove({
        dryRun: true,
        source: "PRIORITY_ER_INVENTORY",
        facilityId,
        limit: 200,
      });
      setDryRunResult(result);
    } catch (e) {
      setApiError(e);
      setDryRunResult(null);
    } finally {
      setLoading(false);
    }
  }, [facilityId, setApiError]);

  const runCommit = useCallback(async () => {
    if (!facilityId || !dryRunResult) return;
    const note = adminNote.trim();
    if (note.length < 3) {
      setError(t("medicationGovernance.globalBaselineAutoApprove.errorNote"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await runGlobalBaselineTieredAutoApprove({
        dryRun: false,
        source: "PRIORITY_ER_INVENTORY",
        facilityId,
        limit: 200,
        adminNote: note,
      });
      setDryRunResult(result);
    } catch (e) {
      setApiError(e);
    } finally {
      setLoading(false);
    }
  }, [facilityId, dryRunResult, adminNote, t, setApiError]);

  if (!isAdmin) return null;

  const canCommit =
    Boolean(dryRunResult?.dryRun) &&
    (dryRunResult?.tier1AutoApprovable ?? 0) > 0 &&
    commitConfirm &&
    adminNote.trim().length >= 3 &&
    !loading;

  return (
    <section
      style={{
        marginBottom: 20,
        padding: "14px 16px",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        background: "#fffbeb",
      }}
    >
      <h2 style={{ margin: "0 0 6px 0", fontSize: 16 }}>
        {t("medicationGovernance.globalBaselineAutoApprove.title")}
      </h2>
      <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#78350f" }}>
        {t("medicationGovernance.globalBaselineAutoApprove.warning")}
      </p>

      <button type="button" onClick={() => void runDryRun()} disabled={loading || !facilityId}>
        {t("medicationGovernance.globalBaselineAutoApprove.runDryRun")}
      </button>

      {error ? (
        <p style={{ color: "#b91c1c", fontSize: 13, marginTop: 10 }}>{error}</p>
      ) : null}

      {dryRunResult ? (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <p style={{ margin: "0 0 8px 0" }}>
            {t("medicationGovernance.globalBaselineAutoApprove.summary")
              .replace("{total}", String(dryRunResult.totalCandidates))
              .replace("{tier1}", String(dryRunResult.tier1AutoApprovable))
              .replace("{tier2}", String(dryRunResult.tier2ManualReview))}
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              {t("medicationGovernance.globalBaselineAutoApprove.skippedDuplicates")}:{" "}
              {dryRunResult.skippedDuplicates}
            </li>
            <li>
              {t("medicationGovernance.globalBaselineAutoApprove.skippedHighRisk")}:{" "}
              {dryRunResult.skippedHighRisk}
            </li>
            <li>
              {t("medicationGovernance.globalBaselineAutoApprove.skippedControlled")}:{" "}
              {dryRunResult.skippedControlled}
            </li>
            <li>
              {t("medicationGovernance.globalBaselineAutoApprove.skippedAmbiguousDose")}:{" "}
              {dryRunResult.skippedAmbiguousDose}
            </li>
            <li>
              {t("medicationGovernance.globalBaselineAutoApprove.skippedMissing")}:{" "}
              {dryRunResult.skippedMissingRequiredFields}
            </li>
          </ul>

          {dryRunResult.sampleRows.length > 0 ? (
            <table style={{ width: "100%", marginTop: 10, fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: 4 }}>{t("medicationGovernance.colCode")}</th>
                  <th style={{ padding: 4 }}>{t("medicationGovernance.globalBaselineAutoApprove.colTier")}</th>
                  <th style={{ padding: 4 }}>{t("medicationGovernance.globalBaselineAutoApprove.colReasons")}</th>
                </tr>
              </thead>
              <tbody>
                {dryRunResult.sampleRows.slice(0, 8).map((row) => (
                  <tr key={row.productId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: 4 }}>{row.productCode}</td>
                    <td style={{ padding: 4 }}>{row.tier}</td>
                    <td style={{ padding: 4 }}>{row.tier2Reasons.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {!dryRunResult.dryRun && dryRunResult.committedCount != null ? (
            <p style={{ marginTop: 10, color: "#166534" }}>
              {t("medicationGovernance.globalBaselineAutoApprove.committed").replace(
                "{count}",
                String(dryRunResult.committedCount)
              )}
            </p>
          ) : (
            <>
              <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
                {t("medicationGovernance.globalBaselineAutoApprove.noteLabel")}
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={2}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  placeholder={t("medicationGovernance.globalBaselineAutoApprove.notePlaceholder")}
                />
              </label>
              <label style={{ display: "flex", gap: 6, marginTop: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={commitConfirm}
                  onChange={(e) => setCommitConfirm(e.target.checked)}
                />
                {t("medicationGovernance.globalBaselineAutoApprove.confirmCommit")}
              </label>
              <button
                type="button"
                style={{ marginTop: 8 }}
                onClick={() => void runCommit()}
                disabled={!canCommit}
              >
                {t("medicationGovernance.globalBaselineAutoApprove.commitTier1")}
              </button>
            </>
          )}
        </div>
      ) : (
        <p style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
          {t("medicationGovernance.globalBaselineAutoApprove.dryRunRequired")}
        </p>
      )}
    </section>
  );
}
