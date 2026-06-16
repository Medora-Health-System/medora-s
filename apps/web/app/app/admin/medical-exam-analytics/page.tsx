"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MedicalExamAnalyticsSection } from "@/components/admin/medicalExamAnalytics/MedicalExamAnalyticsSection";
import { MedicalExamFamilyCard } from "@/components/admin/medicalExamAnalytics/MedicalExamFamilyCard";
import { MedicalExamHealthCard } from "@/components/admin/medicalExamAnalytics/MedicalExamHealthCard";
import { MedicalExamMetricCard } from "@/components/admin/medicalExamAnalytics/MedicalExamMetricCard";
import { MedicalExamTemplateCard } from "@/components/admin/medicalExamAnalytics/MedicalExamTemplateCard";
import { MedicalExamTrendCard } from "@/components/admin/medicalExamAnalytics/MedicalExamTrendCard";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { buildMedicalExamAnalyticsPageModel } from "@/lib/medicalExamAnalyticsPageModel";

function formatPercent(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

function chipShortId(chipId: string): string {
  const parts = chipId.split(".");
  return parts[parts.length - 1] ?? chipId;
}

function governanceIndicatorLabel(t: (key: string) => string, key: string): string {
  const map: Record<string, string> = {
    ownerlessTemplateCount: "medicalExamAnalytics.govOwnerless",
    duplicateOwnerCount: "medicalExamAnalytics.govDuplicate",
    missingHumanDocRegistrationCount: "medicalExamAnalytics.govMissingHumanDoc",
    missingTrackCRegistrationCount: "medicalExamAnalytics.govMissingTrackC",
    missingMdm1RegistrationCount: "medicalExamAnalytics.govMissingMdm1",
    missingGovernanceModuleCount: "medicalExamAnalytics.govMissingModule",
    isolationViolationCount: "medicalExamAnalytics.govIsolation",
    governance_drift_score: "medicalExamAnalytics.govDriftScore",
  };
  return t(map[key] ?? "medicalExamAnalytics.sectionGovernance");
}

function healthStatusLabel(t: (key: string) => string, status: "pass" | "warning" | "fail" | "neutral"): string {
  if (status === "pass") return t("medicalExamAnalytics.healthStatusPass");
  if (status === "warning") return t("medicalExamAnalytics.healthStatusWarning");
  if (status === "fail") return t("medicalExamAnalytics.healthStatusFail");
  return t("medicalExamAnalytics.healthStatusNeutral");
}

export default function MedicalExamAnalyticsPage() {
  const { t } = useI18n();
  const { ready, roles } = useFacilityAndRoles();
  const canView = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  const model = useMemo(() => buildMedicalExamAnalyticsPageModel(), []);

  if (!ready) {
    return <div style={{ padding: 24 }}>{t("common.loading")}</div>;
  }

  if (!canView) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("medicalExamAnalytics.accessDenied")}</p>
        <Link href="/app/admin">{t("medicalExamAnalytics.backAdmin")}</Link>
      </div>
    );
  }

  const { executive, template, chip, mdm, governance, certification } = model;

  return (
    <div style={{ padding: 24, maxWidth: 1100 }} data-testid="medical-exam-analytics-page">
      <Link href="/app/admin" style={{ fontSize: 14 }}>
        {t("medicalExamAnalytics.backAdmin")}
      </Link>
      <h1 style={{ marginTop: 8, marginBottom: 4 }}>{t("medicalExamAnalytics.pageTitle")}</h1>
      <p style={{ color: "#555", margin: "0 0 8px" }}>{t("medicalExamAnalytics.pageSubtitle")}</p>
      <p
        data-testid="medical-exam-analytics-disclaimer"
        style={{
          margin: "0 0 20px",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          fontSize: 13,
          color: "#475569",
        }}
      >
        {t("medicalExamAnalytics.analyticsOnlyDisclaimer")}
      </p>

      <MedicalExamAnalyticsSection title={t("medicalExamAnalytics.sectionExecutive")} testId="medical-exam-analytics-executive">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
          <MedicalExamMetricCard
            testId="medical-exam-kpi-certified-templates"
            label={t("medicalExamAnalytics.kpiCertifiedTemplates")}
            value={executive.summary.certifiedTemplateCount}
            status="pass"
          />
          <MedicalExamMetricCard
            testId="medical-exam-kpi-certified-families"
            label={t("medicalExamAnalytics.kpiCertifiedFamilies")}
            value={executive.summary.certifiedFamilyCount}
            status="pass"
          />
          <MedicalExamMetricCard
            testId="medical-exam-kpi-track-c"
            label={t("medicalExamAnalytics.kpiTrackC")}
            value={formatPercent(executive.summary.trackCPassRate)}
            status="pass"
          />
          <MedicalExamMetricCard
            testId="medical-exam-kpi-human-doc"
            label={t("medicalExamAnalytics.kpiHumanDoc")}
            value={formatPercent(executive.summary.humanDocPassRate)}
            status="pass"
          />
          <MedicalExamMetricCard
            testId="medical-exam-kpi-mdm1"
            label={t("medicalExamAnalytics.kpiMdm1")}
            value={formatPercent(executive.summary.mdm1PassRate)}
            status="pass"
          />
          <MedicalExamMetricCard
            testId="medical-exam-kpi-governance"
            label={t("medicalExamAnalytics.kpiGovernance")}
            value={formatPercent(executive.summary.governancePassRate)}
            status="pass"
          />
          <MedicalExamTrendCard
            testId="medical-exam-kpi-readiness"
            label={t("medicalExamAnalytics.kpiDashboardReadiness")}
            currentValue={executive.dashboardCompletionRate}
            previousValue={null}
            direction="flat"
          />
        </div>
      </MedicalExamAnalyticsSection>

      <MedicalExamAnalyticsSection title={t("medicalExamAnalytics.sectionTemplate")} testId="medical-exam-analytics-template">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 13, margin: "0 0 8px", color: "#64748b" }}>{t("medicalExamAnalytics.mostUsedTemplates")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {template.mostUsedTemplates.slice(0, 5).map((item, index) => (
                <MedicalExamTemplateCard
                  key={item.templateId}
                  testId={`medical-exam-template-most-${index}`}
                  templateId={item.templateId}
                  familyId={item.familyId}
                  governanceOwnerId={item.governanceOwnerId}
                  usageCount={item.usageCount}
                  completionRate={item.completionRate}
                  abandonmentCount={item.abandonmentCount}
                  catalogChipCount={item.catalogChipCount}
                  rankLabel={`#${index + 1}`}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: 13, margin: "0 0 8px", color: "#64748b" }}>{t("medicalExamAnalytics.leastUsedTemplates")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {template.leastUsedTemplates.slice(0, 5).map((item, index) => (
                <MedicalExamTemplateCard
                  key={item.templateId}
                  testId={`medical-exam-template-least-${index}`}
                  templateId={item.templateId}
                  familyId={item.familyId}
                  governanceOwnerId={item.governanceOwnerId}
                  usageCount={item.usageCount}
                  completionRate={item.completionRate}
                  abandonmentCount={item.abandonmentCount}
                  catalogChipCount={item.catalogChipCount}
                  rankLabel={`#${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div>
            <h3 style={{ fontSize: 13, margin: "0 0 8px", color: "#64748b" }}>{t("medicalExamAnalytics.highestCompletion")}</h3>
            {template.highestCompletionRate.slice(0, 3).map((item) => (
              <div key={item.templateId} style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
                {item.templateId} — {formatPercent(item.completionRate)}
              </div>
            ))}
          </div>
          <div>
            <h3 style={{ fontSize: 13, margin: "0 0 8px", color: "#64748b" }}>{t("medicalExamAnalytics.highestAbandonment")}</h3>
            {template.highestAbandonmentRate.slice(0, 3).map((item) => (
              <div key={item.templateId} style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
                {item.templateId} — {item.abandonmentCount}
              </div>
            ))}
          </div>
        </div>
      </MedicalExamAnalyticsSection>

      <MedicalExamAnalyticsSection title={t("medicalExamAnalytics.sectionFamily")} testId="medical-exam-analytics-family">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
          {template.familyAdoptionBreakdown.map((family) => (
            <MedicalExamFamilyCard
              key={family.familyId}
              testId={`medical-exam-family-${family.familyId}`}
              displayName={family.displayName}
              auditPhase={family.auditPhase}
              templateCount={family.templateCount}
              usageCount={family.usageCount}
              completionRate={family.completionRate}
              totalChipCount={family.totalChipCount}
            />
          ))}
        </div>
      </MedicalExamAnalyticsSection>

      <MedicalExamAnalyticsSection title={t("medicalExamAnalytics.sectionChip")} testId="medical-exam-analytics-chip">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {(
            [
              ["hpi", chip.mostInsertedHpiChips, t("medicalExamAnalytics.topHpiChips")],
              ["ros", chip.mostInsertedRosChips, t("medicalExamAnalytics.topRosChips")],
              ["exam", chip.mostInsertedExamChips, t("medicalExamAnalytics.topExamChips")],
              ["mdm", chip.mostInsertedMdmChips, t("medicalExamAnalytics.topMdmChips")],
            ] as const
          ).map(([category, items, title]) => (
            <div key={category}>
              <h3 style={{ fontSize: 13, margin: "0 0 8px", color: "#64748b" }}>{title}</h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569" }}>
                {items.slice(0, 5).map((item) => (
                  <li key={item.chipId}>{chipShortId(item.chipId)} ({item.templateId})</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 13, margin: "0 0 8px", color: "#64748b" }}>{t("medicalExamAnalytics.unusedChips")}</h3>
          <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 6px" }}>
            {chip.unusedChips.length} — {t("medicalExamAnalytics.unusedChipsBaseline")}
          </p>
          <div style={{ fontSize: 11, color: "#94a3b8", maxHeight: 80, overflow: "auto" }}>
            {chip.unusedChips.slice(0, 8).map((item) => chipShortId(item.chipId)).join(" · ")}
          </div>
        </div>
      </MedicalExamAnalyticsSection>

      <MedicalExamAnalyticsSection title={t("medicalExamAnalytics.sectionMdm")} testId="medical-exam-analytics-mdm">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {mdm.sectionSummaries.map((section) => (
            <MedicalExamMetricCard
              key={section.sectionId}
              testId={`medical-exam-mdm-${section.sectionId}`}
              label={section.label}
              value={formatPercent(section.completionRate)}
              status={section.readinessScore >= 100 ? "pass" : "warning"}
            />
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 10 }}>
          {t("medicalExamAnalytics.mdmReadinessScore")}: {mdm.overallReadinessScore}
        </p>
      </MedicalExamAnalyticsSection>

      <MedicalExamAnalyticsSection title={t("medicalExamAnalytics.sectionGovernance")} testId="medical-exam-analytics-governance">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {governance.indicators.map((indicator) => (
            <MedicalExamHealthCard
              key={indicator.key}
              testId={`medical-exam-governance-${indicator.key}`}
              label={governanceIndicatorLabel(t, indicator.key)}
              count={indicator.count}
              status={indicator.status}
              statusLabel={healthStatusLabel(t, indicator.status)}
            />
          ))}
        </div>
      </MedicalExamAnalyticsSection>

      <MedicalExamAnalyticsSection title={t("medicalExamAnalytics.sectionCertification")} testId="medical-exam-analytics-certification">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
          {certification.familyStatuses.map((family) => (
            <div
              key={family.familyId}
              data-testid={`medical-exam-cert-${family.familyId}`}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                background: family.status === "certified" ? "#f0fdf4" : "#fff",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>{family.displayName}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{family.auditPhase ?? "—"}</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 8, display: "grid", gap: 4 }}>
                <span>
                  {t("medicalExamAnalytics.certTrackC")} : {formatPercent(family.trackCPassRate)}
                </span>
                <span>
                  {t("medicalExamAnalytics.certHumanDoc")} : {formatPercent(family.humanDocPassRate)}
                </span>
                <span>
                  {t("medicalExamAnalytics.certMdm1")} : {formatPercent(family.mdm1PassRate)}
                </span>
                <span>
                  {t("medicalExamAnalytics.certGovernance")} : {formatPercent(family.governancePassRate)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </MedicalExamAnalyticsSection>
    </div>
  );
}
