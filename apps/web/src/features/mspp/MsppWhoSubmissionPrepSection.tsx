"use client";

import React from "react";
import { downloadJson } from "@/features/mspp/msppExportDownload";
import {
  buildWhoExportManifest,
  type WhoPackageValidationResult,
  type WhoReadinessLevel,
} from "@/features/mspp/msppWhoExportsValidate";
import type {
  WhoPriorityAlertsPayload,
  WhoValidationAnalyticsPayload,
  WhoWeeklySurveillancePayload,
} from "@/features/mspp/msppWhoExportsBuild";
import {
  MSPP_BTN_APPROVE,
  MSPP_SECTION_CARD,
  MSPP_SECTION_SUBTITLE,
  MSPP_SECTION_TITLE,
} from "@/features/mspp/msppUiChrome";

type TFn = (key: string) => string;

const MAX_LIST = 6;

function readinessLabel(t: TFn, r: WhoReadinessLevel): string {
  if (r === "READY") return t("msppExportsPage.readinessReady");
  if (r === "READY_WITH_WARNINGS") return t("msppExportsPage.readinessWarnings");
  return t("msppExportsPage.readinessIncomplete");
}

function profileTitle(t: TFn, kind: "weekly" | "priority" | "validation"): string {
  if (kind === "weekly") return t("msppExportsPage.whoHandoffProfileWeekly");
  if (kind === "priority") return t("msppExportsPage.whoHandoffProfilePriority");
  return t("msppExportsPage.whoHandoffProfileValidation");
}

function buildSummaryText(params: {
  t: TFn;
  title: string;
  validation: WhoPackageValidationResult | null;
}): string {
  const { t, title, validation } = params;
  const lines: string[] = [title, "", t("msppExportsPage.submissionSummaryHeading") + ""];

  if (!validation) {
    lines.push(t("msppExportsPage.submissionSummaryNoData"));
    return lines.join("\n");
  }

  lines.push(`${t("msppExportsPage.submissionSummaryStatus")} ${readinessLabel(t, validation.readiness)}`);
  lines.push(`${t("msppExportsPage.submissionSummaryCheckedAt")} ${validation.checkedAt}`);
  lines.push(`${t("msppExportsPage.submissionSummaryErrors")} ${validation.errors.length}`);
  lines.push(`${t("msppExportsPage.submissionSummaryWarnings")} ${validation.warnings.length}`);

  if (validation.errors.length > 0) {
    lines.push("", t("msppExportsPage.labelErrors") + ":");
    validation.errors.forEach((e) => lines.push(`- ${e}`));
  }
  if (validation.warnings.length > 0) {
    lines.push("", t("msppExportsPage.labelWarnings") + ":");
    validation.warnings.forEach((w) => lines.push(`- ${w}`));
  }

  return lines.join("\n");
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Silencieux : pas de toast requis en V1
  }
}

function packageFilenames(kind: "weekly" | "priority" | "validation", stamp: string): { pkg: string; manifest: string } {
  if (kind === "weekly") {
    return {
      pkg: `who-weekly-surveillance-${stamp}.json`,
      manifest: `who-weekly-surveillance-manifest-${stamp}.json`,
    };
  }
  if (kind === "priority") {
    return {
      pkg: `who-priority-alerts-${stamp}.json`,
      manifest: `who-priority-alerts-manifest-${stamp}.json`,
    };
  }
  return {
    pkg: `who-validation-analytics-${stamp}.json`,
    manifest: `who-validation-analytics-manifest-${stamp}.json`,
  };
}

function HandoffRow(props: {
  t: TFn;
  kind: "weekly" | "priority" | "validation";
  pkg: WhoWeeklySurveillancePayload | WhoPriorityAlertsPayload | WhoValidationAnalyticsPayload | null;
  validation: WhoPackageValidationResult | null;
  loading: boolean;
  stamp: string;
}) {
  const { t, kind, pkg, validation, loading, stamp } = props;
  const title = profileTitle(t, kind);
  const names = packageFilenames(kind, stamp);

  const onDlPkg = () => {
    if (!pkg) return;
    downloadJson(names.pkg, pkg);
  };
  const onDlManifest = () => {
    if (!pkg || !validation) return;
    const manifest = buildWhoExportManifest(pkg, validation);
    downloadJson(names.manifest, manifest);
  };
  const onCopy = () => {
    void copyText(
      buildSummaryText({
        t,
        title,
        validation,
      })
    );
  };

  const disabled = loading || !pkg;
  const statusText =
    loading || !pkg ? t("msppExportsPage.readinessPending") : validation ? readinessLabel(t, validation.readiness) : "—";

  const errs = validation?.errors ?? [];
  const warns = validation?.warnings ?? [];

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        background: "#fff",
        marginBottom: 10,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>{title}</div>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}>
        <span style={{ fontWeight: 600 }}>{t("msppExportsPage.labelTransmissionReadiness")}</span> {statusText}
      </p>

      {validation?.readiness === "READY" ? (
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#15803d" }}>{t("msppExportsPage.readyToTransmitHint")}</p>
      ) : null}

      {errs.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#991b1b" }}>{t("msppExportsPage.labelErrors")}</div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: "#64748b" }}>
            {errs.slice(0, MAX_LIST).map((e, i) => (
              <li key={`e-${i}`}>{e}</li>
            ))}
            {errs.length > MAX_LIST ? <li>…</li> : null}
          </ul>
        </div>
      ) : null}

      {warns.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#a16207" }}>{t("msppExportsPage.labelWarnings")}</div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: "#64748b" }}>
            {warns.slice(0, MAX_LIST).map((w, i) => (
              <li key={`w-${i}`}>{w}</li>
            ))}
            {warns.length > MAX_LIST ? <li>…</li> : null}
          </ul>
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button type="button" style={MSPP_BTN_APPROVE} disabled={disabled} onClick={onDlPkg}>
          {t("msppExportsPage.btnDownloadWhoPackage")}
        </button>
        <button type="button" style={MSPP_BTN_APPROVE} disabled={disabled || !validation} onClick={onDlManifest}>
          {t("msppExportsPage.btnDownloadWhoManifest")}
        </button>
        <button type="button" style={MSPP_BTN_APPROVE} disabled={disabled} onClick={onCopy}>
          {t("msppExportsPage.btnCopySubmissionSummary")}
        </button>
      </div>
    </div>
  );
}

export function MsppWhoSubmissionPrepSection(props: {
  t: TFn;
  loading: boolean;
  stamp: string;
  weeklyPkg: WhoWeeklySurveillancePayload | null;
  weeklyValidation: WhoPackageValidationResult | null;
  priorityPkg: WhoPriorityAlertsPayload | null;
  priorityValidation: WhoPackageValidationResult | null;
  validationPkg: WhoValidationAnalyticsPayload | null;
  validationValidation: WhoPackageValidationResult | null;
}) {
  const {
    t,
    loading,
    stamp,
    weeklyPkg,
    weeklyValidation,
    priorityPkg,
    priorityValidation,
    validationPkg,
    validationValidation,
  } = props;

  return (
    <div style={MSPP_SECTION_CARD}>
      <h2 style={MSPP_SECTION_TITLE}>{t("msppExportsPage.sectionSubmissionPrepTitle")}</h2>
      <p style={MSPP_SECTION_SUBTITLE}>{t("msppExportsPage.sectionSubmissionPrepIntro")}</p>

      {loading ? (
        <p style={{ color: "#64748b", margin: 0 }}>{t("msppExportsPage.loading")}</p>
      ) : (
        <>
          <HandoffRow
            t={t}
            kind="weekly"
            pkg={weeklyPkg}
            validation={weeklyValidation}
            loading={loading}
            stamp={stamp}
          />
          <HandoffRow
            t={t}
            kind="priority"
            pkg={priorityPkg}
            validation={priorityValidation}
            loading={loading}
            stamp={stamp}
          />
          <HandoffRow
            t={t}
            kind="validation"
            pkg={validationPkg}
            validation={validationValidation}
            loading={loading}
            stamp={stamp}
          />
        </>
      )}
    </div>
  );
}
