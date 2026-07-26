"use client";

/**
 * MEDUI.D4B.1 — Reusable clinical document UI primitives (foundation only).
 * No full discipline workspaces in this phase.
 */

import React from "react";
import type {
  EnterpriseClinicalDocumentCompletenessState,
  EnterpriseClinicalDocumentLifecycleState,
  EnterpriseClinicalDocumentValidationIssue,
} from "@medora/shared";
import { MedoraCardBadge } from "@/components/medora-card";
import type { PriorityBadgeSoft } from "@/components/medora-card/medoraCardTokens";
import { useI18n } from "@/lib/i18n";

const STATUS_SOFT: Record<string, PriorityBadgeSoft> = {
  DRAFT: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  IN_PROGRESS: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  READY_FOR_SIGNATURE: { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  SIGNED: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  COSIGN_REQUIRED: { bg: "#fff7ed", text: "#c2410c", border: "#fdba74" },
  COSIGNED: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  AMENDED: { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  CORRECTED: { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  ENTERED_IN_ERROR: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
  VOIDED: { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
};

export function EnterpriseClinicalDocumentStatusBadge(props: {
  state: EnterpriseClinicalDocumentLifecycleState;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const label = t(`enterpriseClinicalDocumentD4b1.status.${props.state}`);
  return (
    <MedoraCardBadge soft={STATUS_SOFT[props.state]} compact={props.compact}>
      {label}
    </MedoraCardBadge>
  );
}

export function EnterpriseClinicalDocumentUnsignedDraftWarning() {
  const { t } = useI18n();
  return (
    <div
      role="status"
      data-testid="ecd-unsigned-draft-warning"
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: "1px solid #fde68a",
        background: "#fffbeb",
        color: "#92400e",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {t("enterpriseClinicalDocumentD4b1.labels.unsignedDraft")}
    </div>
  );
}

export function EnterpriseClinicalDocumentAmendmentBanner(props: {
  kind?: "amended" | "addendum" | "enteredInError";
  reason?: string | null;
}) {
  const { t } = useI18n();
  const kind = props.kind ?? "amended";
  const title =
    kind === "addendum"
      ? t("enterpriseClinicalDocumentD4b1.labels.addendum")
      : kind === "enteredInError"
        ? t("enterpriseClinicalDocumentD4b1.labels.enteredInError")
        : t("enterpriseClinicalDocumentD4b1.labels.amended");
  const soft =
    kind === "enteredInError"
      ? STATUS_SOFT.ENTERED_IN_ERROR
      : STATUS_SOFT.AMENDED;
  return (
    <div
      role="status"
      data-testid="ecd-amendment-banner"
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: `1px solid ${soft.border}`,
        background: soft.bg,
        color: soft.text,
        fontSize: 13,
      }}
    >
      <strong>{title}</strong>
      {props.reason ? <div style={{ marginTop: 4 }}>{props.reason}</div> : null}
    </div>
  );
}

export function EnterpriseClinicalDocumentSignatureMeta(props: {
  authorDisplay?: string | null;
  signerDisplay?: string | null;
  cosignerDisplay?: string | null;
  serviceAt?: string | null;
  signedAt?: string | null;
  templateVersion?: string | null;
}) {
  const { t } = useI18n();
  const rows: Array<[string, string]> = [];
  if (props.authorDisplay) {
    rows.push([t("enterpriseClinicalDocumentD4b1.labels.author"), props.authorDisplay]);
  }
  if (props.signerDisplay) {
    rows.push([t("enterpriseClinicalDocumentD4b1.labels.signer"), props.signerDisplay]);
  }
  if (props.cosignerDisplay) {
    rows.push([t("enterpriseClinicalDocumentD4b1.labels.cosigner"), props.cosignerDisplay]);
  }
  if (props.serviceAt) {
    rows.push([t("enterpriseClinicalDocumentD4b1.labels.serviceAt"), props.serviceAt]);
  }
  if (props.signedAt) {
    rows.push([t("enterpriseClinicalDocumentD4b1.labels.signedAt"), props.signedAt]);
  }
  if (props.templateVersion) {
    rows.push([
      t("enterpriseClinicalDocumentD4b1.labels.templateVersion"),
      props.templateVersion,
    ]);
  }
  if (rows.length === 0) return null;
  return (
    <dl
      data-testid="ecd-signature-meta"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "4px 12px",
        margin: 0,
        fontSize: 13,
        color: "#334155",
      }}
    >
      {rows.map(([k, v]) => (
        <React.Fragment key={k}>
          <dt style={{ fontWeight: 600 }}>{k}</dt>
          <dd style={{ margin: 0 }}>{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export function EnterpriseClinicalDocumentCompletenessSummary(props: {
  completeness: EnterpriseClinicalDocumentCompletenessState;
}) {
  const { t } = useI18n();
  const { completeness } = props;
  return (
    <div data-testid="ecd-completeness-summary" style={{ fontSize: 13, color: "#334155" }}>
      <div style={{ fontWeight: 600 }}>
        {t("enterpriseClinicalDocumentD4b1.labels.completeness")}:{" "}
        {completeness.clinicallyComplete
          ? t("enterpriseClinicalDocumentD4b1.labels.complete")
          : t("enterpriseClinicalDocumentD4b1.labels.incomplete")}
      </div>
      <div>
        {completeness.signatureReady
          ? t("enterpriseClinicalDocumentD4b1.labels.signatureReady")
          : t("enterpriseClinicalDocumentD4b1.labels.notSignatureReady")}
      </div>
      {completeness.missingIndicators.length > 0 ? (
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          {completeness.missingIndicators.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function EnterpriseClinicalDocumentValidationIssueList(props: {
  issues: ReadonlyArray<EnterpriseClinicalDocumentValidationIssue>;
}) {
  const { t } = useI18n();
  if (props.issues.length === 0) return null;
  return (
    <div data-testid="ecd-validation-issues">
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
        {t("enterpriseClinicalDocumentD4b1.labels.validationIssues")}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
        {props.issues.map((issue, idx) => (
          <li key={`${issue.code}-${issue.fieldPath ?? idx}`}>
            [{issue.severity === "HARD_STOP"
              ? t("enterpriseClinicalDocumentD4b1.validation.hardStop")
              : t("enterpriseClinicalDocumentD4b1.validation.warning")}
            ] {t(issue.messageKey)}
            {issue.fieldPath ? ` (${issue.fieldPath})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EnterpriseClinicalDocumentLegalRecordHeader(props: {
  title: string;
  state: EnterpriseClinicalDocumentLifecycleState;
}) {
  const { t } = useI18n();
  return (
    <header
      data-testid="ecd-legal-record-header"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 8,
      }}
    >
      <div>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
          {t("enterpriseClinicalDocumentD4b1.labels.legalRecord")}
        </div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
          {props.title}
        </h2>
      </div>
      <EnterpriseClinicalDocumentStatusBadge state={props.state} />
    </header>
  );
}

export function EnterpriseClinicalDocumentReadOnlySignedRenderer(props: {
  title: string;
  state: EnterpriseClinicalDocumentLifecycleState;
  narrativeText?: string | null;
  authorDisplay?: string | null;
  signerDisplay?: string | null;
  signedAt?: string | null;
  templateVersion?: string | null;
  amendmentReason?: string | null;
  enteredInError?: boolean;
  unsigned?: boolean;
}) {
  return (
    <article
      data-testid="ecd-readonly-signed-renderer"
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        background: "#fff",
        padding: 14,
      }}
    >
      <EnterpriseClinicalDocumentLegalRecordHeader title={props.title} state={props.state} />
      {props.unsigned ? <EnterpriseClinicalDocumentUnsignedDraftWarning /> : null}
      {props.enteredInError ? (
        <EnterpriseClinicalDocumentAmendmentBanner kind="enteredInError" />
      ) : props.amendmentReason ? (
        <EnterpriseClinicalDocumentAmendmentBanner reason={props.amendmentReason} />
      ) : null}
      <div style={{ marginTop: 10 }}>
        <EnterpriseClinicalDocumentSignatureMeta
          authorDisplay={props.authorDisplay}
          signerDisplay={props.signerDisplay}
          signedAt={props.signedAt}
          templateVersion={props.templateVersion}
        />
      </div>
      {props.narrativeText ? (
        <div
          style={{
            marginTop: 12,
            whiteSpace: "pre-wrap",
            fontSize: 14,
            color: "#0f172a",
            lineHeight: 1.45,
          }}
        >
          {props.narrativeText}
        </div>
      ) : null}
    </article>
  );
}
