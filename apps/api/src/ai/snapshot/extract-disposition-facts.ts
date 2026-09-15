function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function followUpRowHasContent(row: unknown): boolean {
  const rec = asRecord(row);
  if (!rec) return false;
  return Boolean(
    firstNonEmptyString(
      rec.instructions,
      rec.followUpInstructions,
      rec.specialty,
      rec.providerOrFacility,
      rec.timing,
      rec.when,
      rec.who,
      rec.where,
      rec.comments
    )
  );
}

export function extractDispositionFacts(dischargeSummaryJson: unknown): {
  checkoutState: string | null;
  transferReason: string | null;
  transferDestination: string | null;
  transferTransport: string | null;
  dischargeFollowUpDocumented: boolean;
} {
  const root = asRecord(dischargeSummaryJson);
  if (!root) {
    return {
      checkoutState: null,
      transferReason: null,
      transferDestination: null,
      transferTransport: null,
      dischargeFollowUpDocumented: false,
    };
  }

  const emtala = asRecord(root.emtala) ?? asRecord(root.emtalaComplement) ?? asRecord(root.erEmtalaV1);
  const checkoutState = firstNonEmptyString(root.clinicAmbulatoryCheckoutState);
  const transferReason = firstNonEmptyString(
    root.transferReason,
    emtala?.transferReason,
    root.reasonForTransfer
  );
  const transferDestination = firstNonEmptyString(
    root.transferDestination,
    root.destination,
    emtala?.acceptingFacilityName,
    emtala?.destination
  );
  const transferTransport = firstNonEmptyString(
    root.transferTransport,
    root.transportMethod,
    emtala?.transferMode,
    emtala?.transportMethod,
    emtala?.modeOfTransport
  );
  const followUpText = firstNonEmptyString(
    root.followUpInstructions,
    root.followUp,
    root.followUpPlan
  );
  const followUpRows = [
    ...(Array.isArray(root.providerDischargeFollowUps) ? root.providerDischargeFollowUps : []),
    ...(Array.isArray(root.followUps) ? root.followUps : []),
  ];

  return {
    checkoutState,
    transferReason,
    transferDestination,
    transferTransport,
    dischargeFollowUpDocumented: Boolean(followUpText) || followUpRows.some(followUpRowHasContent),
  };
}
