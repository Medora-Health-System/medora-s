"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

function AuditTimelineSlotErrorFallback() {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid #fecaca",
        backgroundColor: "#fef2f2",
        color: "#991b1b",
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      {t("encounterClinicalRecordSummary.auditSlotError")}
    </div>
  );
}

/**
 * Isolates audit/command timeline render failures so the clinical summary stays usable.
 */
export class SummaryAuditTimelineSlot extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    if (process.env.NODE_ENV !== "production") {
      console.error("[SummaryAuditTimelineSlot]", error);
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return <AuditTimelineSlotErrorFallback />;
    }
    return this.props.children;
  }
}
