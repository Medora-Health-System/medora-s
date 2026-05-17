import {
  analyzeLabRadOrderItemReconciliation,
  labRadReconciliationFlags,
  labRadReconciliationNeedsFollowUp,
  type LabRadReconciliationDomain,
  type LabRadReconciliationFinding,
  type LabRadReconciliationFlag,
  type LabRadReconciliationOrderInput,
  type LabRadReconciliationOrderItemInput,
} from "@medora/shared";

export type LabRadReconciliationBadgeTone = "neutral" | "info" | "warning";

export type LabRadReconciliationBadgeModel = {
  flag: LabRadReconciliationFlag;
  labelKey: string;
  tone: LabRadReconciliationBadgeTone;
  titleKey?: string;
};

const FLAG_META: Record<
  LabRadReconciliationFlag,
  { labelKey: string; tone: LabRadReconciliationBadgeTone; titleKey?: string }
> = {
  RESULT_WITHOUT_COLLECTION_OR_PERFORMED: {
    labelKey: "labRadReconciliation.flagResultWithoutMilestone",
    tone: "warning",
    titleKey: "labRadReconciliation.flagResultWithoutMilestoneTooltip",
  },
  DELAYED_ORDER_TO_MILESTONE: {
    labelKey: "labRadReconciliation.flagDelayedOrderToMilestone",
    tone: "info",
    titleKey: "labRadReconciliation.flagDelayedOrderToMilestoneTooltip",
  },
  DELAYED_MILESTONE_TO_RESULT: {
    labelKey: "labRadReconciliation.flagDelayedMilestoneToResult",
    tone: "info",
    titleKey: "labRadReconciliation.flagDelayedMilestoneToResultTooltip",
  },
  ADJUSTED_CLINICAL_TIME: {
    labelKey: "labRadReconciliation.flagAdjustedClinicalTime",
    tone: "info",
    titleKey: "labRadReconciliation.flagAdjustedClinicalTimeTooltip",
  },
  DUPLICATE_RESULTED: {
    labelKey: "labRadReconciliation.flagDuplicateResulted",
    tone: "warning",
    titleKey: "labRadReconciliation.flagDuplicateResultedTooltip",
  },
  STALE_PENDING: {
    labelKey: "labRadReconciliation.flagStalePending",
    tone: "warning",
    titleKey: "labRadReconciliation.flagStalePendingTooltip",
  },
  ORPHAN_RESULT: {
    labelKey: "labRadReconciliation.flagOrphanResult",
    tone: "warning",
    titleKey: "labRadReconciliation.flagOrphanResultTooltip",
  },
  OVERNIGHT_TIMING: {
    labelKey: "labRadReconciliation.flagOvernightTiming",
    tone: "info",
    titleKey: "labRadReconciliation.flagOvernightTimingTooltip",
  },
};

function labelKeyForFlag(flag: LabRadReconciliationFlag, domain: LabRadReconciliationDomain): string {
  if (domain === "LAB") {
    if (flag === "DELAYED_ORDER_TO_MILESTONE") return "labRadReconciliation.lab.delayedCollection";
    if (flag === "ADJUSTED_CLINICAL_TIME") return "labRadReconciliation.lab.adjustedCollectionTime";
    if (flag === "DUPLICATE_RESULTED") return "labRadReconciliation.lab.duplicateResulted";
  } else {
    if (flag === "DELAYED_ORDER_TO_MILESTONE") return "labRadReconciliation.rad.delayedPerformed";
    if (flag === "ADJUSTED_CLINICAL_TIME") return "labRadReconciliation.rad.adjustedPerformedTime";
    if (flag === "DUPLICATE_RESULTED") return "labRadReconciliation.rad.duplicateResulted";
  }
  return FLAG_META[flag].labelKey;
}

export function analyzeLabRadWorklistItem(input: {
  domain: LabRadReconciliationDomain;
  order: LabRadReconciliationOrderInput;
  item: LabRadReconciliationOrderItemInput;
  siblingItems?: LabRadReconciliationOrderItemInput[];
  now?: Date;
}): {
  findings: LabRadReconciliationFinding[];
  flags: LabRadReconciliationFlag[];
  needsFollowUp: boolean;
  badges: LabRadReconciliationBadgeModel[];
} {
  const findings = analyzeLabRadOrderItemReconciliation(input);
  const flags = labRadReconciliationFlags(findings);
  const badges = findings.map((f) => {
    const meta = FLAG_META[f.flag];
    return {
      flag: f.flag,
      labelKey: labelKeyForFlag(f.flag, input.domain),
      tone: meta.tone,
      titleKey: meta.titleKey,
    };
  });
  return {
    findings,
    flags,
    needsFollowUp: labRadReconciliationNeedsFollowUp(flags),
    badges,
  };
}

export function labRadReconciliationBadgeSoftStyle(tone: LabRadReconciliationBadgeTone): {
  bg: string;
  text: string;
  border: string;
} {
  if (tone === "warning") {
    return { bg: "#fff7ed", text: "#9a3412", border: "1px solid #fed7aa" };
  }
  if (tone === "info") {
    return { bg: "#f0f9ff", text: "#0369a1", border: "1px solid #bae6fd" };
  }
  return { bg: "#f8fafc", text: "#475569", border: "1px solid #e2e8f0" };
}
