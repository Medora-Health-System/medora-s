"use client";

import React from "react";
import type { ResolveProcedureDocumentationLinkageOutput } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  procedureDocumentationActionLabelKey,
  procedureDocumentationButtonLabelKey,
} from "@/lib/procedureOrderDocumentationLinkageUi";

const indicatorStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: 4,
  padding: "2px 8px",
  borderRadius: 9999,
  fontSize: 10,
  fontWeight: 600,
  lineHeight: 1.4,
};

const indicatorStyles: Record<
  Exclude<ResolveProcedureDocumentationLinkageOutput["recommendedAction"], "NONE">,
  React.CSSProperties
> = {
  DOCUMENTATION_AVAILABLE: {
    ...indicatorStyle,
    color: "#0369a1",
    background: "#e0f2fe",
    border: "1px solid #7dd3fc",
  },
  DOCUMENTATION_RECOMMENDED: {
    ...indicatorStyle,
    color: "#92400e",
    background: "#fef3c7",
    border: "1px solid #fcd34d",
  },
  DOCUMENTATION_REQUIRED_REVIEW: {
    ...indicatorStyle,
    color: "#9a3412",
    background: "#ffedd5",
    border: "1px solid #fdba74",
  },
};

const buttonStyle: React.CSSProperties = {
  marginTop: 4,
  padding: "4px 10px",
  borderRadius: 8,
  border: "1px solid #93c5fd",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

export function ProcedureOrderDocumentationLinkage({
  linkage,
  canOpenDocumentation,
  onOpenProcedureDocumentation,
}: {
  linkage: ResolveProcedureDocumentationLinkageOutput;
  canOpenDocumentation: boolean;
  onOpenProcedureDocumentation?: () => void;
}) {
  const { t } = useI18n();
  const action = linkage.recommendedAction;
  if (action === "NONE" || !linkage.hasDocumentationTemplate) return null;

  const indicatorKey = procedureDocumentationActionLabelKey(action);
  const buttonKey = procedureDocumentationButtonLabelKey(action);
  if (!indicatorKey) return null;

  return (
    <div style={{ marginTop: 4 }} data-testid="procedure-order-documentation-linkage">
      <span style={indicatorStyles[action]}>{t(indicatorKey)}</span>
      {canOpenDocumentation && buttonKey && onOpenProcedureDocumentation ? (
        <div>
          <button type="button" style={buttonStyle} onClick={onOpenProcedureDocumentation}>
            {t(buttonKey)}
          </button>
        </div>
      ) : null}
    </div>
  );
}
