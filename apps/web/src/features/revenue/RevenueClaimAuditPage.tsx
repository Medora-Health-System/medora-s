"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { fetchRevenueClaimAudit } from "@/features/revenue/revenueClaimAuditApi";
import {
  RevenueClaimAuditStatusBadge,
  RevenueClaimAuditSummary,
} from "@/features/revenue/RevenueClaimAuditSummary";
import { RevenueClaimAuditTimeline } from "@/features/revenue/RevenueClaimAuditTimeline";
import { revenueClaimAuditHref } from "@/features/revenue/revenueClaimSubmissionNavigation";
import type { RevenueClaimAuditDto } from "@medora/shared";

type RevenueClaimAuditPageProps = {
  facilityId?: string | null;
  claimId: string;
};

function submissionStatusLabel(t: (k: string) => string, status: string): string {
  const key = `revenueClaimSubmission.submissionStatus.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

const fieldRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(120px, 160px) 1fr",
  gap: 8,
  fontSize: 13,
  padding: "6px 0",
};

export function RevenueClaimAuditPage({ facilityId, claimId }: RevenueClaimAuditPageProps) {
  const { t, language } = useI18n();
  const [audit, setAudit] = useState<RevenueClaimAuditDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadAudit = useCallback(async () => {
    if (!facilityId || !claimId) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const result = await fetchRevenueClaimAudit(facilityId, claimId);
      setAudit(result);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : t("revenueClaimAudit.loadError"));
      setAudit(null);
    } finally {
      setIsLoading(false);
    }
  }, [claimId, facilityId, t]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  return (
    <div
      data-testid="revenue-claim-audit-page"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, color: "#0f172a" }}>
            {t("revenueClaimAudit.title")}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", maxWidth: 720 }}>
            {t("revenueClaimAudit.intro")}
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Link
            href="/app/admin/revenue-cycle/claims"
            style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
          >
            {t("revenueClaimAudit.backSubmission")}
          </Link>
          <Link
            href="/app/admin"
            style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
          >
            {t("revenueClaimAudit.backAdmin")}
          </Link>
        </div>
      </header>

      {isLoading ? (
        <p data-testid="revenue-claim-audit-loading" style={{ color: "#64748b", fontSize: 13 }}>
          {t("revenueClaimAudit.loading")}
        </p>
      ) : fetchError ? (
        <p data-testid="revenue-claim-audit-error" style={{ color: "#b91c1c", fontSize: 13 }}>
          {fetchError}
        </p>
      ) : audit ? (
        <>
          <RevenueClaimAuditSummary counts={audit.facilitySummary} />

          <section
            data-testid="revenue-claim-audit-identity"
            style={{
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              background: "#fff",
              padding: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>
                {t("revenueClaimAudit.sections.identity")}
              </h2>
              <RevenueClaimAuditStatusBadge status={audit.auditStatus} />
            </div>
            <div style={fieldRowStyle}>
              <span style={{ color: "#64748b" }}>{t("revenueClaimAudit.fields.claimId")}</span>
              <span data-testid="revenue-claim-audit-claim-id">{audit.claim.claimId}</span>
            </div>
            <div style={fieldRowStyle}>
              <span style={{ color: "#64748b" }}>{t("revenueClaimAudit.fields.encounter")}</span>
              <span>{audit.claim.encounterId}</span>
            </div>
            <div style={fieldRowStyle}>
              <span style={{ color: "#64748b" }}>{t("revenueClaimAudit.fields.patient")}</span>
              <span>{audit.patient.patientName}</span>
            </div>
            <div style={fieldRowStyle}>
              <span style={{ color: "#64748b" }}>{t("revenueClaimAudit.fields.mrn")}</span>
              <span>{audit.patient.mrn ?? t("common.dash")}</span>
            </div>
            <div style={fieldRowStyle}>
              <span style={{ color: "#64748b" }}>{t("revenueClaimAudit.fields.provider")}</span>
              <span>{audit.provider.providerName ?? t("common.dash")}</span>
            </div>
            <div style={fieldRowStyle}>
              <span style={{ color: "#64748b" }}>{t("revenueClaimAudit.fields.payer")}</span>
              <span>{audit.payer.payerName ?? t("common.dash")}</span>
            </div>
            <div style={fieldRowStyle}>
              <span style={{ color: "#64748b" }}>{t("revenueClaimAudit.fields.currentStatus")}</span>
              <span>{submissionStatusLabel(t, audit.claim.submissionStatus)}</span>
            </div>
            <div style={fieldRowStyle}>
              <span style={{ color: "#64748b" }}>{t("revenueClaimAudit.fields.claimAmount")}</span>
              <span>
                {audit.claim.claimAmount != null
                  ? audit.claim.claimAmount.toFixed(2)
                  : t("common.dash")}
              </span>
            </div>
            <div style={fieldRowStyle}>
              <span style={{ color: "#64748b" }}>{t("revenueClaimAudit.fields.submittedAt")}</span>
              <span>
                {audit.claim.submittedAt
                  ? formatEncounterChromeDateTime(audit.claim.submittedAt, language)
                  : t("common.dash")}
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
              <Link
                href={audit.ledgerHref}
                data-testid="revenue-claim-audit-ledger-link"
                style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
              >
                {t("revenueClaimAudit.actions.viewLedger")}
              </Link>
            </div>
          </section>

          {audit.correctionNeeded ? (
            <section
              data-testid="revenue-claim-audit-correction"
              style={{
                borderRadius: 16,
                border: "1px solid #fed7aa",
                background: "#fff7ed",
                padding: 14,
              }}
            >
              <h2 style={{ margin: "0 0 8px", fontSize: 15, color: "#9a3412" }}>
                {t("revenueClaimAudit.sections.correctionNeeded")}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#c2410c" }}>
                {t("revenueClaimAudit.correctionNotice")}
              </p>
            </section>
          ) : null}

          {audit.rejectionHistory.length > 0 ? (
            <section data-testid="revenue-claim-audit-rejections">
              <h2 style={{ margin: "0 0 10px", fontSize: 15, color: "#0f172a" }}>
                {t("revenueClaimAudit.sections.rejectionHistory")}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {audit.rejectionHistory.map((rejection, index) => (
                  <article
                    key={`${rejection.code ?? "rej"}-${rejection.occurredAt}-${index}`}
                    data-testid="revenue-claim-audit-rejection-card"
                    style={{
                      borderRadius: 12,
                      border: "1px solid #fecaca",
                      background: "#fff",
                      padding: 12,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {formatEncounterChromeDateTime(rejection.occurredAt, language)}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#b91c1c", marginTop: 4 }}>
                      {rejection.code ?? t("common.dash")}
                    </div>
                    {rejection.description ? (
                      <p style={{ margin: "6px 0 0", fontSize: 13, color: "#334155" }}>
                        {rejection.description}
                      </p>
                    ) : null}
                    {rejection.clearinghouseMessage ? (
                      <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
                        {t("revenueClaimAudit.rejection.clearinghouseMessage")}:{" "}
                        {rejection.clearinghouseMessage}
                      </p>
                    ) : null}
                    {rejection.correctionGuidance ? (
                      <p
                        data-testid="revenue-claim-audit-correction-guidance"
                        style={{ margin: "8px 0 0", fontSize: 13, color: "#0f172a" }}
                      >
                        {t("revenueClaimAudit.rejection.correctionGuidance")}:{" "}
                        {rejection.correctionGuidance}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, color: "#0f172a" }}>
              {t("revenueClaimAudit.sections.timeline")}
            </h2>
            <RevenueClaimAuditTimeline entries={audit.timeline} />
          </section>

          <section>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, color: "#0f172a" }}>
              {t("revenueClaimAudit.sections.attemptHistory")}
            </h2>
            {audit.attemptHistory.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: 13 }}>{t("revenueClaimAudit.attempts.empty")}</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155" }}>
                {audit.attemptHistory.map((attempt) => (
                  <li key={attempt.attemptId} data-testid={`revenue-claim-audit-attempt-${attempt.attemptId}`}>
                    {formatEncounterChromeDateTime(attempt.createdAt, language)} —{" "}
                    {attempt.ok
                      ? t("revenueClaimAudit.attempts.ok")
                      : t("revenueClaimAudit.attempts.failed")}{" "}
                    ({attempt.transport})
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, color: "#0f172a" }}>
              {t("revenueClaimAudit.sections.ackHistory")}
            </h2>
            {audit.acknowledgmentHistory.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: 13 }}>{t("revenueClaimAudit.acks.empty")}</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155" }}>
                {audit.acknowledgmentHistory.map((ack) => (
                  <li key={ack.ackId} data-testid={`revenue-claim-audit-ack-${ack.ackId}`}>
                    {formatEncounterChromeDateTime(ack.receivedAt, language)} — {ack.kind}{" "}
                    {ack.statusCode ?? t("common.dash")}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <p
        data-testid="revenue-claim-audit-read-only-notice"
        style={{ margin: 0, fontSize: 12, color: "#64748b" }}
      >
        {t("revenueClaimAudit.readOnlyNotice")}
      </p>
      <span data-testid="revenue-claim-audit-route-marker" hidden>
        {revenueClaimAuditHref(claimId)}
      </span>
    </div>
  );
}
