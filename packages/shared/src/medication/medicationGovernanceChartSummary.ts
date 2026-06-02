/**
 * M1.3F.8 — Legal-chart-safe medication governance summaries (read-model only).
 * Derived from persisted verification / waste / override / pharmacy rows — not raw audit logs.
 */

export type MedicationGovernanceLineStatus =
  | "completed"
  | "pending"
  | "overridden"
  | "rejected"
  | "not_applicable";

export type MedicationGovernanceChartLine = {
  key: string;
  labelFr: string;
  labelEn: string;
  status: MedicationGovernanceLineStatus;
};

export type MedicationGovernanceChartSummary = {
  medicationAdministrationId: string;
  orderItemId: string | null;
  administeredAtIso: string;
  medicationLabel: string | null;
  doseDisplay: string | null;
  route: string | null;
  lines: MedicationGovernanceChartLine[];
  hasOverride: boolean;
};

export type MedicationGovernanceVerificationSnapshot = {
  verificationType: string;
  verificationStatus: string;
  createdAtIso: string;
};

export type MedicationGovernanceWasteSnapshot = {
  status: string;
  witnessUserId: string | null;
  createdAtIso: string;
};

export type MedicationGovernanceOverrideSnapshot = {
  overrideType: string;
  createdAtIso: string;
  overrideKind?: string | null;
};

export type MedicationGovernancePharmacySnapshot = {
  verificationStatus: string;
  updatedAtIso: string;
};

export type MedicationGovernanceMarArtifacts = {
  verifications: MedicationGovernanceVerificationSnapshot[];
  waste: MedicationGovernanceWasteSnapshot[];
  overrides: MedicationGovernanceOverrideSnapshot[];
  pharmacy: MedicationGovernancePharmacySnapshot | null;
};

export type MedicationGovernanceTimelineEvent = {
  id: string;
  medicationAdministrationId: string | null;
  orderItemId: string | null;
  eventKind: string;
  documentedAtIso: string;
  titleFr: string;
  titleEn: string;
  summaryFr: string | null;
};

const LINE_LABELS = {
  controlledSubstance: { fr: "Substance contrôlée", en: "Controlled substance" },
  witnessCompleted: { fr: "Témoin complété", en: "Witness completed" },
  witnessPending: { fr: "Témoin en attente", en: "Witness pending" },
  wasteDocumented: { fr: "Perte documentée", en: "Waste documented" },
  wasteWitnessed: { fr: "Perte attestée", en: "Waste witnessed" },
  controlledOverride: { fr: "Dérogation substance contrôlée", en: "Controlled substance override" },
  highAlert: { fr: "Médicament à haut risque", en: "High alert" },
  doubleCheckCompleted: { fr: "Double contrôle complété", en: "Double check completed" },
  dualVerificationCompleted: { fr: "Double vérification complétée", en: "Dual verification completed" },
  highAlertOverride: { fr: "Dérogation haut risque", en: "High alert override" },
  lasaAcknowledged: { fr: "Avertissement LASA reconnu", en: "LASA acknowledged" },
  lasaOverride: { fr: "Dérogation LASA", en: "LASA override" },
  pharmacyVerified: { fr: "Vérification pharmacie complétée", en: "Pharmacy verified" },
  pharmacyRejected: { fr: "Vérification pharmacie refusée", en: "Pharmacy rejected" },
  pharmacyOverride: { fr: "Dérogation vérification pharmacie", en: "Pharmacy verification override" },
} as const;

function line(
  key: string,
  labels: { fr: string; en: string },
  status: MedicationGovernanceLineStatus
): MedicationGovernanceChartLine {
  return { key, labelFr: labels.fr, labelEn: labels.en, status };
}

function hasVerification(
  artifacts: MedicationGovernanceMarArtifacts,
  type: string,
  status?: string
): boolean {
  return artifacts.verifications.some(
    (v) =>
      v.verificationType === type &&
      (!status || v.verificationStatus === status)
  );
}

function formatDose(doseValue: string | null, doseUnit: string | null): string | null {
  const parts = [doseValue?.trim(), doseUnit?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

/** Build per-MAR governance summary for legal chart / export. */
export function buildMedicationGovernanceChartSummary(input: {
  medicationAdministrationId: string;
  orderItemId: string | null;
  administeredAtIso: string;
  medicationLabel: string | null;
  doseValue: string | null;
  doseUnit: string | null;
  route: string | null;
  artifacts: MedicationGovernanceMarArtifacts;
}): MedicationGovernanceChartSummary {
  const lines: MedicationGovernanceChartLine[] = [];
  const { artifacts } = input;

  const witnessCompleted = hasVerification(artifacts, "WITNESS", "COMPLETED");
  const witnessPending = hasVerification(artifacts, "WITNESS", "PENDING");
  const doubleCheck =
    hasVerification(artifacts, "INDEPENDENT_DOUBLE_CHECK", "COMPLETED") ||
    hasVerification(artifacts, "DUAL_VERIFICATION", "COMPLETED") ||
    hasVerification(artifacts, "HIGH_ALERT_CHECK", "COMPLETED");
  const lasaAck = hasVerification(artifacts, "LASA_ACKNOWLEDGMENT", "COMPLETED");
  const wasteDoc = artifacts.waste.some((w) => w.status === "COMPLETED" || w.status === "RECORDED");
  const wasteWitnessed = artifacts.waste.some((w) => Boolean(w.witnessUserId));

  const controlledOverride = artifacts.overrides.some(
    (o) => o.overrideType === "CONTROLLED_SUBSTANCE_OVERRIDE"
  );
  const highAlertOverride = artifacts.overrides.some((o) => o.overrideType === "HIGH_ALERT_OVERRIDE");
  const lasaOverride = artifacts.overrides.some((o) => o.overrideType === "LASA_OVERRIDE");
  const pharmacyOverride = artifacts.overrides.some(
    (o) =>
      o.overrideType === "PHARMACY_PENDING_OVERRIDE" ||
      o.overrideKind === "PHARMACY_VERIFICATION_OVERRIDE"
  );

  if (
    witnessCompleted ||
    witnessPending ||
    wasteDoc ||
    controlledOverride
  ) {
    lines.push(line("controlled_substance", LINE_LABELS.controlledSubstance, "completed"));
  }

  if (witnessCompleted) {
    lines.push(line("witness_completed", LINE_LABELS.witnessCompleted, "completed"));
  } else if (witnessPending) {
    lines.push(line("witness_pending", LINE_LABELS.witnessPending, "pending"));
  }

  if (wasteDoc) {
    lines.push(line("waste_documented", LINE_LABELS.wasteDocumented, "completed"));
  }
  if (wasteWitnessed) {
    lines.push(line("waste_witnessed", LINE_LABELS.wasteWitnessed, "completed"));
  }
  if (controlledOverride) {
    lines.push(line("controlled_override", LINE_LABELS.controlledOverride, "overridden"));
  }

  if (doubleCheck || highAlertOverride) {
    lines.push(line("high_alert", LINE_LABELS.highAlert, "completed"));
  }
  if (doubleCheck) {
    const dual = hasVerification(artifacts, "DUAL_VERIFICATION", "COMPLETED");
    lines.push(
      line(
        dual ? "dual_verification_completed" : "double_check_completed",
        dual ? LINE_LABELS.dualVerificationCompleted : LINE_LABELS.doubleCheckCompleted,
        "completed"
      )
    );
  }
  if (highAlertOverride) {
    lines.push(line("high_alert_override", LINE_LABELS.highAlertOverride, "overridden"));
  }

  if (lasaAck || lasaOverride) {
    if (lasaAck) {
      lines.push(line("lasa_acknowledged", LINE_LABELS.lasaAcknowledged, "completed"));
    }
    if (lasaOverride) {
      lines.push(line("lasa_override", LINE_LABELS.lasaOverride, "overridden"));
    }
  }

  const pharmacyStatus = artifacts.pharmacy?.verificationStatus?.toUpperCase() ?? null;
  if (pharmacyStatus === "VERIFIED") {
    lines.push(line("pharmacy_verified", LINE_LABELS.pharmacyVerified, "completed"));
  } else if (pharmacyStatus === "REJECTED") {
    lines.push(line("pharmacy_rejected", LINE_LABELS.pharmacyRejected, "rejected"));
  } else if (pharmacyStatus === "OVERRIDDEN" || pharmacyOverride) {
    lines.push(line("pharmacy_override", LINE_LABELS.pharmacyOverride, "overridden"));
  }

  const hasOverride =
    controlledOverride || highAlertOverride || lasaOverride || pharmacyOverride;

  return {
    medicationAdministrationId: input.medicationAdministrationId,
    orderItemId: input.orderItemId,
    administeredAtIso: input.administeredAtIso,
    medicationLabel: input.medicationLabel,
    doseDisplay: formatDose(input.doseValue, input.doseUnit),
    route: input.route,
    lines,
    hasOverride,
  };
}

/** Concise chronological governance-only timeline rows (no raw audit duplication). */
export function buildMedicationGovernanceTimelineEvents(input: {
  medicationAdministrationId: string;
  orderItemId: string | null;
  medicationLabel: string | null;
  artifacts: MedicationGovernanceMarArtifacts;
}): MedicationGovernanceTimelineEvent[] {
  const events: MedicationGovernanceTimelineEvent[] = [];
  const label = input.medicationLabel?.trim() || null;
  const suffix = label ? ` — ${label}` : "";

  for (const v of input.artifacts.verifications) {
    if (v.verificationStatus !== "COMPLETED") continue;
    if (v.verificationType === "WITNESS") {
      events.push({
        id: `gov:${input.medicationAdministrationId}:witness:${v.createdAtIso}`,
        medicationAdministrationId: input.medicationAdministrationId,
        orderItemId: input.orderItemId,
        eventKind: "MAR_WITNESS_COMPLETED",
        documentedAtIso: v.createdAtIso,
        titleFr: `Témoin MAR complété${suffix}`,
        titleEn: `MAR witness completed${suffix}`,
        summaryFr: null,
      });
    } else if (
      v.verificationType === "INDEPENDENT_DOUBLE_CHECK" ||
      v.verificationType === "DUAL_VERIFICATION" ||
      v.verificationType === "HIGH_ALERT_CHECK"
    ) {
      events.push({
        id: `gov:${input.medicationAdministrationId}:double-check:${v.createdAtIso}`,
        medicationAdministrationId: input.medicationAdministrationId,
        orderItemId: input.orderItemId,
        eventKind: "MAR_DOUBLE_CHECK_COMPLETED",
        documentedAtIso: v.createdAtIso,
        titleFr: `Double contrôle complété${suffix}`,
        titleEn: `Double check completed${suffix}`,
        summaryFr: null,
      });
    } else if (v.verificationType === "LASA_ACKNOWLEDGMENT") {
      events.push({
        id: `gov:${input.medicationAdministrationId}:lasa:${v.createdAtIso}`,
        medicationAdministrationId: input.medicationAdministrationId,
        orderItemId: input.orderItemId,
        eventKind: "MAR_LASA_ACKNOWLEDGED",
        documentedAtIso: v.createdAtIso,
        titleFr: `LASA reconnu${suffix}`,
        titleEn: `LASA acknowledged${suffix}`,
        summaryFr: null,
      });
    }
  }

  for (const w of input.artifacts.waste) {
    if (w.status !== "COMPLETED" && w.status !== "RECORDED") continue;
    events.push({
      id: `gov:${input.medicationAdministrationId}:waste:${w.createdAtIso}`,
      medicationAdministrationId: input.medicationAdministrationId,
      orderItemId: input.orderItemId,
      eventKind: "MAR_WASTE_DOCUMENTED",
      documentedAtIso: w.createdAtIso,
      titleFr: `Perte médicament documentée${suffix}`,
      titleEn: `Medication waste documented${suffix}`,
      summaryFr: null,
    });
    if (w.witnessUserId) {
      events.push({
        id: `gov:${input.medicationAdministrationId}:waste-witness:${w.createdAtIso}`,
        medicationAdministrationId: input.medicationAdministrationId,
        orderItemId: input.orderItemId,
        eventKind: "MAR_WASTE_WITNESSED",
        documentedAtIso: w.createdAtIso,
        titleFr: `Perte médicament attestée${suffix}`,
        titleEn: `Medication waste witnessed${suffix}`,
        summaryFr: null,
      });
    }
  }

  for (const o of input.artifacts.overrides) {
    const kind =
      o.overrideType === "CONTROLLED_SUBSTANCE_OVERRIDE"
        ? "MAR_CONTROLLED_OVERRIDE"
        : o.overrideType === "HIGH_ALERT_OVERRIDE"
          ? "MAR_HIGH_ALERT_OVERRIDE"
          : o.overrideType === "LASA_OVERRIDE"
            ? "MAR_LASA_OVERRIDE"
            : o.overrideType === "PHARMACY_PENDING_OVERRIDE" ||
                o.overrideKind === "PHARMACY_VERIFICATION_OVERRIDE"
              ? "MAR_PHARMACY_OVERRIDE"
              : null;
    if (!kind) continue;
    const titles =
      kind === "MAR_CONTROLLED_OVERRIDE"
        ? { fr: `Dérogation substance contrôlée${suffix}`, en: `Controlled substance override${suffix}` }
        : kind === "MAR_HIGH_ALERT_OVERRIDE"
          ? { fr: `Dérogation haut risque${suffix}`, en: `High alert override${suffix}` }
          : kind === "MAR_LASA_OVERRIDE"
            ? { fr: `Dérogation LASA${suffix}`, en: `LASA override${suffix}` }
            : { fr: `Dérogation pharmacie${suffix}`, en: `Pharmacy verification override${suffix}` };
    events.push({
      id: `gov:${input.medicationAdministrationId}:override:${o.createdAtIso}:${o.overrideType}`,
      medicationAdministrationId: input.medicationAdministrationId,
      orderItemId: input.orderItemId,
      eventKind: kind,
      documentedAtIso: o.createdAtIso,
      titleFr: titles.fr,
      titleEn: titles.en,
      summaryFr: null,
    });
  }

  const pharmacy = input.artifacts.pharmacy;
  const ps = pharmacy?.verificationStatus?.toUpperCase();
  if (pharmacy && ps === "VERIFIED") {
    events.push({
      id: `gov:${input.orderItemId ?? input.medicationAdministrationId}:pharmacy-verified`,
      medicationAdministrationId: input.medicationAdministrationId,
      orderItemId: input.orderItemId,
      eventKind: "PHARMACY_VERIFIED",
      documentedAtIso: pharmacy.updatedAtIso,
      titleFr: `Vérification pharmacie${suffix}`,
      titleEn: `Pharmacy verified${suffix}`,
      summaryFr: null,
    });
  } else if (pharmacy && ps === "REJECTED") {
    events.push({
      id: `gov:${input.orderItemId ?? input.medicationAdministrationId}:pharmacy-rejected`,
      medicationAdministrationId: input.medicationAdministrationId,
      orderItemId: input.orderItemId,
      eventKind: "PHARMACY_REJECTED",
      documentedAtIso: pharmacy.updatedAtIso,
      titleFr: `Vérification pharmacie refusée${suffix}`,
      titleEn: `Pharmacy verification rejected${suffix}`,
      summaryFr: null,
    });
  }

  return events.sort((a, b) => a.documentedAtIso.localeCompare(b.documentedAtIso));
}

export function buildMedicationGovernanceChartSummariesForEncounter(
  marRows: Array<{
    id: string;
    orderItemId: string | null;
    medicationLabelSnapshot: string | null;
    doseValue: string | null;
    doseUnit: string | null;
    route: string | null;
    administeredAtIso: string;
  }>,
  artifactsByMarId: Map<string, MedicationGovernanceMarArtifacts>,
  pharmacyByOrderItemId: Map<string, MedicationGovernancePharmacySnapshot>
): MedicationGovernanceChartSummary[] {
  return marRows
    .map((m) => {
      const base = artifactsByMarId.get(m.id) ?? {
        verifications: [],
        waste: [],
        overrides: [],
        pharmacy: null,
      };
      const pharmacy =
        (m.orderItemId && pharmacyByOrderItemId.get(m.orderItemId)) || base.pharmacy;
      return buildMedicationGovernanceChartSummary({
        medicationAdministrationId: m.id,
        orderItemId: m.orderItemId,
        administeredAtIso: m.administeredAtIso,
        medicationLabel: m.medicationLabelSnapshot,
        doseValue: m.doseValue,
        doseUnit: m.doseUnit,
        route: m.route,
        artifacts: { ...base, pharmacy: pharmacy ?? base.pharmacy },
      });
    })
    .filter((s) => s.lines.length > 0);
}
