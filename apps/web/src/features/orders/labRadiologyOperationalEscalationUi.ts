import {
  analyzeLabRadOperationalEscalation,
  type LabRadEscalationFlag,
  type LabRadOperationalEscalationAnalysis,
  type LabRadReconciliationDomain,
} from "@medora/shared";
import {
  analyzeLabRadWorklistItem,
  type LabRadReconciliationBadgeModel,
} from "./labRadiologyOperationalReconciliationUi";

export type LabRadEscalationBadgeTone = "neutral" | "info" | "warning" | "critical";

export type LabRadEscalationBadgeModel = {
  flag: LabRadEscalationFlag;
  labelKey: string;
  tone: LabRadEscalationBadgeTone;
  titleKey?: string;
};

const ESCALATION_META: Record<
  LabRadEscalationFlag,
  { labelKey: string; tone: LabRadEscalationBadgeTone; titleKey?: string }
> = {
  AGING: {
    labelKey: "labRadEscalation.chipAging",
    tone: "info",
    titleKey: "labRadEscalation.chipAgingTooltip",
  },
  DELAYED: {
    labelKey: "labRadEscalation.chipDelayed",
    tone: "warning",
    titleKey: "labRadEscalation.chipDelayedTooltip",
  },
  CRITICAL_DELAY: {
    labelKey: "labRadEscalation.chipCriticalDelay",
    tone: "critical",
    titleKey: "labRadEscalation.chipCriticalDelayTooltip",
  },
  AWAITING_ACKNOWLEDGEMENT: {
    labelKey: "labRadEscalation.chipAwaitingAck",
    tone: "warning",
    titleKey: "labRadEscalation.chipAwaitingAckTooltip",
  },
  CRITICAL_ACK_OVERDUE: {
    labelKey: "labRadEscalation.chipCriticalAckOverdue",
    tone: "critical",
    titleKey: "labRadEscalation.chipCriticalAckOverdueTooltip",
  },
  SHIFT_HANDOFF_REVIEW: {
    labelKey: "labRadEscalation.chipShiftHandoff",
    tone: "info",
    titleKey: "labRadEscalation.chipShiftHandoffTooltip",
  },
};

export function escalationBadgesFromAnalysis(
  escalation: LabRadOperationalEscalationAnalysis
): LabRadEscalationBadgeModel[] {
  return escalation.escalationFlags.map((flag) => {
    const meta = ESCALATION_META[flag];
    return { flag, labelKey: meta.labelKey, tone: meta.tone, titleKey: meta.titleKey };
  });
}

export function labRadEscalationBadgeSoftStyle(tone: LabRadEscalationBadgeTone): {
  bg: string;
  text: string;
  border: string;
} {
  if (tone === "critical") {
    return { bg: "#fef2f2", text: "#991b1b", border: "1px solid #fecaca" };
  }
  if (tone === "warning") {
    return { bg: "#fff7ed", text: "#9a3412", border: "1px solid #fed7aa" };
  }
  if (tone === "info") {
    return { bg: "#f0f9ff", text: "#0369a1", border: "1px solid #bae6fd" };
  }
  return { bg: "#f8fafc", text: "#475569", border: "1px solid #e2e8f0" };
}

export function analyzeLabRadWorklistOperationalRow(input: {
  domain: LabRadReconciliationDomain;
  order: { id: string; createdAt: string | Date; type?: string | null; priority?: string | null };
  item: Parameters<typeof analyzeLabRadWorklistItem>[0]["item"] & {
    updatedAt?: string | Date | null;
    result?: Parameters<typeof analyzeLabRadWorklistItem>[0]["item"]["result"] & {
      criticalValue?: boolean | null;
      acknowledgedByProviderAt?: string | Date | null;
    };
  };
  siblingItems?: Parameters<typeof analyzeLabRadWorklistItem>[0]["siblingItems"];
  now?: Date;
}) {
  const reconciliation = analyzeLabRadWorklistItem({
    domain: input.domain,
    order: input.order,
    item: input.item,
    siblingItems: input.siblingItems,
    now: input.now,
  });
  const escalation = analyzeLabRadOperationalEscalation({
    domain: input.domain,
    order: input.order,
    item: input.item,
    reconciliationFlags: reconciliation.flags,
    orderPriority: input.order.priority ?? null,
    now: input.now,
  });
  const escalationBadges = escalationBadgesFromAnalysis(escalation);
  return { reconciliation, escalation, escalationBadges };
}

export type LabRadWorklistOperationalRow = ReturnType<typeof analyzeLabRadWorklistOperationalRow>;

export function mergeOperationalBadges(
  reconciliationBadges: LabRadReconciliationBadgeModel[],
  escalationBadges: LabRadEscalationBadgeModel[]
): Array<
  | ({ kind: "reconciliation" } & LabRadReconciliationBadgeModel)
  | ({ kind: "escalation" } & LabRadEscalationBadgeModel)
> {
  return [
    ...escalationBadges.map((b) => ({ kind: "escalation" as const, ...b })),
    ...reconciliationBadges.map((b) => ({ kind: "reconciliation" as const, ...b })),
  ];
}
