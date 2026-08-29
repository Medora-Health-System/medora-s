"use client";

import Link from "next/link";
import type { InpatientDischargeAwarenessV1 } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  formatInpatientDischargeAwarenessBadgeLabel,
  formatInpatientDischargeAwarenessSubstatusLabel,
  inpatientDischargeAwarenessBadgeStyle,
  inpatientDischargeWorkspaceHref,
} from "./inpatientDischargeAwarenessUi";

type Props = {
  awareness: InpatientDischargeAwarenessV1;
  encounterId: string;
  roles?: string[] | null;
  showSubstatus?: boolean;
  compact?: boolean;
};

/**
 * INP.DIS.1H — compact disposition badge linking to discharge workspace.
 */
export function InpatientDischargeAwarenessBadge({
  awareness,
  encounterId,
  roles,
  showSubstatus = false,
  compact = false,
}: Props) {
  const { t } = useI18n();
  const href = inpatientDischargeWorkspaceHref(encounterId, roles);
  const label = formatInpatientDischargeAwarenessBadgeLabel(awareness, t);
  const sub = showSubstatus
    ? formatInpatientDischargeAwarenessSubstatusLabel(awareness, t)
    : null;
  const style = inpatientDischargeAwarenessBadgeStyle(awareness.tone);

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 2, maxWidth: "100%" }}>
      <Link
        href={href}
        data-testid="inp-dis-1h-awareness-badge"
        data-tone={awareness.tone}
        data-disposition={awareness.dispositionCode ?? ""}
        style={{
          ...style,
          display: "inline-block",
          padding: compact ? "1px 6px" : "2px 8px",
          borderRadius: 9999,
          fontSize: compact ? 10 : 11,
          fontWeight: 700,
          textDecoration: "none",
          lineHeight: 1.3,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "100%",
        }}
        title={label}
      >
        {label}
      </Link>
      {sub ? (
        <span
          data-testid="inp-dis-1h-awareness-substatus"
          style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}
        >
          {sub}
        </span>
      ) : null}
    </span>
  );
}
