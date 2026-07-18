/**
 * Phase 10 — domain evaluators (shadow findings only; approved knowledge only).
 */
import type { PrismaClient } from "@prisma/client";
import {
  buildSafetyFindingDeduplicationKey,
  type MedicationSafetyFindingType,
} from "@medora/shared";
import type { AssembledPatientContext } from "./medication-safety-patient-context.service";
import type { ResolvedMedicationIdentity } from "./medication-safety-medication-resolver.service";

export type ShadowFindingDraft = {
  findingType: MedicationSafetyFindingType;
  severity?: string;
  clinicalSignificance?: string;
  ruleId?: string;
  knowledgeEntityType?: string;
  knowledgeEntityId?: string;
  sourceVersionId?: string;
  title: string;
  summary: string;
  mechanism?: string;
  recommendedFutureAction?: string;
  monitoringRecommendation?: string;
  evidenceLevel?: string;
  relatedMedicationIdentity?: string;
  relatedAllergyId?: string;
  requiresClinicalValidation?: boolean;
  deduplicationKey: string;
  emergencyContextTags?: string[];
  calculationTrace?: Record<string, unknown>;
};

function key(input: {
  patientId: string;
  encounterId?: string;
  candidateIdentity: string;
  relatedIdentity?: string;
  findingType: MedicationSafetyFindingType;
  ruleIdentity: string;
  knowledgeVersion?: string;
}): string {
  return buildSafetyFindingDeduplicationKey({
    patientId: input.patientId,
    encounterId: input.encounterId,
    candidateMedicationIdentity: input.candidateIdentity,
    relatedMedicationIdentity: input.relatedIdentity,
    findingType: input.findingType,
    normalizedRuleIdentity: input.ruleIdentity,
    knowledgeVersion: input.knowledgeVersion,
  });
}

export async function evaluateDrugInteractions(
  prisma: PrismaClient,
  input: {
    patientId: string;
    encounterId?: string;
    candidate: ResolvedMedicationIdentity;
    relatedConceptIds: string[];
  }
): Promise<{ rulesConsidered: number; findings: ShadowFindingDraft[] }> {
  if (!input.candidate.resolved || !input.candidate.conceptId) {
    return { rulesConsidered: 0, findings: [] };
  }
  const candidateConceptId = input.candidate.conceptId;
  const related = input.relatedConceptIds.filter((id) => id !== candidateConceptId);
  if (related.length === 0) return { rulesConsidered: 0, findings: [] };

  const interactions = await prisma.medicationDrugInteraction.findMany({
    where: {
      status: "APPROVED",
      OR: [
        {
          subjectMedicationConceptId: candidateConceptId,
          objectMedicationConceptId: { in: related },
        },
        {
          objectMedicationConceptId: candidateConceptId,
          subjectMedicationConceptId: { in: related },
        },
      ],
    },
    take: 200,
  });

  const findings: ShadowFindingDraft[] = interactions.map((row) => {
    const relatedId =
      row.subjectMedicationConceptId === candidateConceptId
        ? row.objectMedicationConceptId
        : row.subjectMedicationConceptId;
    return {
      findingType: "DRUG_DRUG_INTERACTION",
      severity: row.severity,
      clinicalSignificance: row.clinicalSignificance ?? undefined,
      ruleId: row.id,
      knowledgeEntityType: "MedicationDrugInteraction",
      knowledgeEntityId: row.id,
      sourceVersionId: row.sourceVersionId,
      title: `Shadow DDI: ${row.interactionType}`,
      summary:
        row.clinicalEffect ??
        row.mechanism ??
        "Approved drug–drug interaction knowledge matched in shadow mode.",
      mechanism: row.mechanism ?? undefined,
      recommendedFutureAction: row.managementRecommendation ?? undefined,
      monitoringRecommendation: row.monitoringRecommendation ?? undefined,
      evidenceLevel: row.evidenceLevel ?? undefined,
      relatedMedicationIdentity: relatedId ? `concept:${relatedId}` : undefined,
      deduplicationKey: key({
        patientId: input.patientId,
        encounterId: input.encounterId,
        candidateIdentity: input.candidate.identityKey,
        relatedIdentity: relatedId ? `concept:${relatedId}` : undefined,
        findingType: "DRUG_DRUG_INTERACTION",
        ruleIdentity: row.normalizedPairKey,
        knowledgeVersion: row.sourceVersionId,
      }),
    };
  });
  return { rulesConsidered: interactions.length, findings };
}

export async function evaluateAllergyAndCrossReactivity(
  prisma: PrismaClient,
  input: {
    patientId: string;
    encounterId?: string;
    candidate: ResolvedMedicationIdentity;
    allergyIds: string[];
  }
): Promise<{ rulesConsidered: number; findings: ShadowFindingDraft[] }> {
  if (!input.candidate.resolved || !input.candidate.conceptId) {
    return { rulesConsidered: 0, findings: [] };
  }
  const mappings = await prisma.medicationAllergenMapping.findMany({
    where: {
      status: "APPROVED",
      medicationConceptId: input.candidate.conceptId,
    },
    take: 100,
  });
  const cross = await prisma.medicationAllergyCrossReactivityRule.findMany({
    where: {
      status: "APPROVED",
      OR: [
        { targetMedicationConceptId: input.candidate.conceptId },
        ...(input.candidate.therapeuticClassId
          ? [{ targetTherapeuticClassId: input.candidate.therapeuticClassId }]
          : []),
      ],
    },
    take: 100,
  });

  const findings: ShadowFindingDraft[] = [];
  for (const m of mappings) {
    const findingType: MedicationSafetyFindingType =
      m.relationshipType === "DIRECT_INGREDIENT" ||
      m.relationshipType === "SAME_ACTIVE_INGREDIENT"
        ? "DIRECT_ALLERGY_MATCH"
        : m.relationshipType === "SAME_THERAPEUTIC_CLASS"
          ? "THERAPEUTIC_CLASS_ALLERGY_MATCH"
          : m.relationshipType === "KNOWN_CROSS_REACTIVITY"
            ? "KNOWN_CROSS_REACTIVITY"
            : m.relationshipType === "POSSIBLE_CROSS_REACTIVITY"
              ? "POSSIBLE_CROSS_REACTIVITY"
              : "ACTIVE_INGREDIENT_ALLERGY_MATCH";
    findings.push({
      findingType,
      severity: m.crossReactivityRisk ?? "UNKNOWN",
      ruleId: m.id,
      knowledgeEntityType: "MedicationAllergenMapping",
      knowledgeEntityId: m.id,
      sourceVersionId: m.sourceVersionId,
      title: `Shadow allergy knowledge: ${m.relationshipType}`,
      summary:
        m.clinicalDescription ??
        "Approved allergen mapping matched candidate medication (shadow).",
      evidenceLevel: m.evidenceLevel ?? undefined,
      relatedAllergyId: input.allergyIds[0],
      requiresClinicalValidation: true,
      deduplicationKey: key({
        patientId: input.patientId,
        encounterId: input.encounterId,
        candidateIdentity: input.candidate.identityKey,
        relatedIdentity: m.allergenConceptId,
        findingType,
        ruleIdentity: m.id,
        knowledgeVersion: m.sourceVersionId,
      }),
    });
  }
  for (const c of cross) {
    const findingType: MedicationSafetyFindingType =
      c.riskLevel === "HIGH" || c.riskLevel === "CONTRAINDICATED"
        ? "KNOWN_CROSS_REACTIVITY"
        : "POSSIBLE_CROSS_REACTIVITY";
    findings.push({
      findingType,
      severity: c.riskLevel,
      ruleId: c.id,
      knowledgeEntityType: "MedicationAllergyCrossReactivityRule",
      knowledgeEntityId: c.id,
      sourceVersionId: c.sourceVersionId,
      title: `Shadow cross-reactivity: ${c.riskLevel}`,
      summary:
        c.clinicalDescription ??
        "Approved cross-reactivity rule matched candidate (shadow).",
      recommendedFutureAction: c.managementRecommendation ?? undefined,
      evidenceLevel: c.evidenceLevel ?? undefined,
      requiresClinicalValidation: true,
      deduplicationKey: key({
        patientId: input.patientId,
        encounterId: input.encounterId,
        candidateIdentity: input.candidate.identityKey,
        relatedIdentity: c.sourceAllergenId,
        findingType,
        ruleIdentity: c.normalizedIdentityKey,
        knowledgeVersion: c.sourceVersionId,
      }),
    });
  }
  return { rulesConsidered: mappings.length + cross.length, findings };
}

export async function evaluateDuplicateTherapy(
  prisma: PrismaClient,
  input: {
    patientId: string;
    encounterId?: string;
    candidate: ResolvedMedicationIdentity;
    relatedConceptIds: string[];
    emergencyContextTags: string[];
  }
): Promise<{ rulesConsidered: number; findings: ShadowFindingDraft[] }> {
  if (!input.candidate.resolved || !input.candidate.conceptId) {
    return { rulesConsidered: 0, findings: [] };
  }
  const findings: ShadowFindingDraft[] = [];
  let rulesConsidered = 0;

  for (const relatedId of input.relatedConceptIds) {
    if (relatedId === input.candidate.conceptId) {
      findings.push({
        findingType: "EXACT_DUPLICATE_INGREDIENT",
        severity: "MODERATE",
        title: "Shadow exact duplicate ingredient",
        summary:
          "Candidate concept matches an active related medication concept (shadow).",
        requiresClinicalValidation: true,
        emergencyContextTags: input.emergencyContextTags,
        deduplicationKey: key({
          patientId: input.patientId,
          encounterId: input.encounterId,
          candidateIdentity: input.candidate.identityKey,
          relatedIdentity: `concept:${relatedId}`,
          findingType: "EXACT_DUPLICATE_INGREDIENT",
          ruleIdentity: `exact:${relatedId}`,
        }),
      });
    }
  }

  const memberships = await prisma.medicationDuplicateTherapyMembership.findMany({
    where: {
      status: "APPROVED",
      medicationConceptId: {
        in: [input.candidate.conceptId, ...input.relatedConceptIds],
      },
    },
    take: 200,
  });
  rulesConsidered += memberships.length;
  const byGroup = new Map<string, string[]>();
  for (const m of memberships) {
    const list = byGroup.get(m.duplicateTherapyGroupId) ?? [];
    if (m.medicationConceptId) list.push(m.medicationConceptId);
    byGroup.set(m.duplicateTherapyGroupId, list);
  }
  for (const [groupId, conceptIds] of byGroup) {
    const unique = new Set(conceptIds);
    if (
      unique.has(input.candidate.conceptId) &&
      [...unique].some((id) => id !== input.candidate.conceptId)
    ) {
      findings.push({
        findingType: "THERAPEUTIC_CLASS_DUPLICATION",
        severity: "MODERATE",
        ruleId: groupId,
        knowledgeEntityType: "MedicationDuplicateTherapyGroup",
        knowledgeEntityId: groupId,
        title: "Shadow duplicate-therapy group overlap",
        summary:
          "Candidate and active medications share an approved duplicate-therapy group (shadow).",
        requiresClinicalValidation: true,
        emergencyContextTags: input.emergencyContextTags,
        deduplicationKey: key({
          patientId: input.patientId,
          encounterId: input.encounterId,
          candidateIdentity: input.candidate.identityKey,
          findingType: "THERAPEUTIC_CLASS_DUPLICATION",
          ruleIdentity: `dup-group:${groupId}`,
        }),
      });
    }
  }

  return { rulesConsidered, findings };
}

export async function evaluateClinicalKnowledgeSafety(
  prisma: PrismaClient,
  input: {
    patientId: string;
    encounterId?: string;
    candidate: ResolvedMedicationIdentity;
    context: AssembledPatientContext;
  }
): Promise<{ rulesConsidered: number; findings: ShadowFindingDraft[] }> {
  if (!input.candidate.resolved || !input.candidate.conceptId) {
    return { rulesConsidered: 0, findings: [] };
  }
  const profiles = await prisma.medicationClinicalProfile.findMany({
    where: {
      lifecycleStatus: "APPROVED",
      conceptId: input.candidate.conceptId,
    },
    include: {
      renalAdjustments: true,
      hepaticAdjustments: true,
      pregnancyInformation: true,
      lactationInformation: true,
      monitoringRequirements: true,
      contraindications: true,
      weightBasedDoses: true,
    },
    take: 20,
  });

  const findings: ShadowFindingDraft[] = [];
  let rulesConsidered = profiles.length;

  for (const profile of profiles) {
    if (profile.renalAdjustments.length > 0) {
      rulesConsidered += profile.renalAdjustments.length;
      if (
        input.context.estimatedGfr == null &&
        input.context.creatinineClearance == null
      ) {
        findings.push({
          findingType: "RENAL_DOSE_REVIEW",
          severity: "MODERATE",
          knowledgeEntityType: "MedicationClinicalProfile",
          knowledgeEntityId: profile.id,
          sourceVersionId: profile.knowledgeVersionId,
          title: "Shadow renal dose review — missing renal function",
          summary:
            "Approved renal adjustment knowledge exists; patient renal context missing.",
          requiresClinicalValidation: true,
          calculationTrace: {
            renalMeasureUsed: null,
            formulaIdentifier: "none",
          },
          deduplicationKey: key({
            patientId: input.patientId,
            encounterId: input.encounterId,
            candidateIdentity: input.candidate.identityKey,
            findingType: "RENAL_DOSE_REVIEW",
            ruleIdentity: `renal:${profile.id}`,
            knowledgeVersion: profile.knowledgeVersionId,
          }),
        });
      } else {
        findings.push({
          findingType: "RENAL_DOSE_REVIEW",
          severity: "MODERATE",
          knowledgeEntityType: "MedicationClinicalProfile",
          knowledgeEntityId: profile.id,
          sourceVersionId: profile.knowledgeVersionId,
          title: "Shadow renal dose review",
          summary: profile.renalAdjustments[0]?.adjustmentSummary ?? "Renal review.",
          calculationTrace: {
            renalMeasureUsed:
              input.context.estimatedGfr != null ? "eGFR" : "creatinineClearance",
            estimatedGfr: input.context.estimatedGfr ?? null,
            creatinineClearance: input.context.creatinineClearance ?? null,
            formulaIdentifier: "context-match-only",
            engineVersion: "phase10-shadow-1.0.0",
          },
          deduplicationKey: key({
            patientId: input.patientId,
            encounterId: input.encounterId,
            candidateIdentity: input.candidate.identityKey,
            findingType: "RENAL_DOSE_REVIEW",
            ruleIdentity: `renal-ctx:${profile.id}`,
            knowledgeVersion: profile.knowledgeVersionId,
          }),
        });
      }
    }

    if (profile.hepaticAdjustments.length > 0) {
      rulesConsidered += profile.hepaticAdjustments.length;
      findings.push({
        findingType: input.context.hepaticFunctionClassification
          ? "HEPATIC_DOSE_REVIEW"
          : "HEPATIC_DOSE_REVIEW",
        severity: "MODERATE",
        knowledgeEntityType: "MedicationClinicalProfile",
        knowledgeEntityId: profile.id,
        sourceVersionId: profile.knowledgeVersionId,
        title: "Shadow hepatic dose review",
        summary:
          profile.hepaticAdjustments[0]?.adjustmentSummary ??
          "Approved hepatic adjustment knowledge matched (shadow).",
        deduplicationKey: key({
          patientId: input.patientId,
          encounterId: input.encounterId,
          candidateIdentity: input.candidate.identityKey,
          findingType: "HEPATIC_DOSE_REVIEW",
          ruleIdentity: `hepatic:${profile.id}`,
          knowledgeVersion: profile.knowledgeVersionId,
        }),
      });
    }

    if (profile.pregnancyInformation.length > 0 && input.context.pregnancyStatus) {
      findings.push({
        findingType: "PREGNANCY_CONSIDERATION",
        severity: "MAJOR",
        knowledgeEntityType: "MedicationPregnancyInformation",
        knowledgeEntityId: profile.pregnancyInformation[0]?.id,
        sourceVersionId: profile.knowledgeVersionId,
        title: "Shadow pregnancy consideration",
        summary: profile.pregnancyInformation[0]?.riskSummary ?? "Pregnancy consideration.",
        requiresClinicalValidation: true,
        deduplicationKey: key({
          patientId: input.patientId,
          encounterId: input.encounterId,
          candidateIdentity: input.candidate.identityKey,
          findingType: "PREGNANCY_CONSIDERATION",
          ruleIdentity: `preg:${profile.id}`,
          knowledgeVersion: profile.knowledgeVersionId,
        }),
      });
    }

    if (profile.lactationInformation.length > 0 && input.context.lactationStatus === "LACTATING") {
      findings.push({
        findingType: "LACTATION_CONSIDERATION",
        severity: "MODERATE",
        knowledgeEntityType: "MedicationLactationInformation",
        knowledgeEntityId: profile.lactationInformation[0]?.id,
        sourceVersionId: profile.knowledgeVersionId,
        title: "Shadow lactation consideration",
        summary: profile.lactationInformation[0]?.riskSummary ?? "Lactation consideration.",
        requiresClinicalValidation: true,
        deduplicationKey: key({
          patientId: input.patientId,
          encounterId: input.encounterId,
          candidateIdentity: input.candidate.identityKey,
          findingType: "LACTATION_CONSIDERATION",
          ruleIdentity: `lact:${profile.id}`,
          knowledgeVersion: profile.knowledgeVersionId,
        }),
      });
    }

    for (const mon of profile.monitoringRequirements) {
      findings.push({
        findingType: "MONITORING_REQUIRED",
        severity: "INFORMATIONAL",
        knowledgeEntityType: "MedicationMonitoringRequirement",
        knowledgeEntityId: mon.id,
        sourceVersionId: profile.knowledgeVersionId,
        title: `Shadow monitoring: ${mon.parameterLabel}`,
        summary: mon.notes ?? mon.parameterLabel,
        monitoringRecommendation: mon.frequencyText ?? undefined,
        deduplicationKey: key({
          patientId: input.patientId,
          encounterId: input.encounterId,
          candidateIdentity: input.candidate.identityKey,
          findingType: "MONITORING_REQUIRED",
          ruleIdentity: `mon:${mon.id}`,
          knowledgeVersion: profile.knowledgeVersionId,
        }),
      });
    }

    if (profile.weightBasedDoses.length > 0) {
      if (input.context.weightKg == null) {
        findings.push({
          findingType: "WEIGHT_RELATED_CONSIDERATION",
          severity: "MODERATE",
          title: "Shadow weight-based dose — missing weight",
          summary: "Weight-based knowledge exists; patient weightKg missing.",
          calculationTrace: {
            inputValues: { weightKg: null },
            units: "kg",
            formulaIdentifier: "none",
            roundingMethod: "none",
          },
          deduplicationKey: key({
            patientId: input.patientId,
            encounterId: input.encounterId,
            candidateIdentity: input.candidate.identityKey,
            findingType: "WEIGHT_RELATED_CONSIDERATION",
            ruleIdentity: `wt-missing:${profile.id}`,
            knowledgeVersion: profile.knowledgeVersionId,
          }),
        });
      } else {
        const wbd = profile.weightBasedDoses[0]!;
        const amountPerKg = Number(wbd.amountPerKg);
        const calculated = amountPerKg * input.context.weightKg;
        findings.push({
          findingType: "WEIGHT_RELATED_CONSIDERATION",
          severity: "INFORMATIONAL",
          title: "Shadow weight-based dose review",
          summary: `Calculated ${calculated} ${wbd.amountUnit} from ${amountPerKg}/${wbd.amountUnit}/kg × ${input.context.weightKg} kg (not applied to order).`,
          calculationTrace: {
            inputValues: { weightKg: input.context.weightKg, amountPerKg },
            units: { weight: "kg", dose: wbd.amountUnit },
            formulaIdentifier: "amountPerKg * weightKg",
            roundingMethod: "none",
            calculatedValue: calculated,
            knowledgeSource: profile.id,
            engineVersion: "phase10-shadow-1.0.0",
          },
          deduplicationKey: key({
            patientId: input.patientId,
            encounterId: input.encounterId,
            candidateIdentity: input.candidate.identityKey,
            findingType: "WEIGHT_RELATED_CONSIDERATION",
            ruleIdentity: `wt:${wbd.id}`,
            knowledgeVersion: profile.knowledgeVersionId,
          }),
        });
      }
    }

    if (input.context.ageYears != null && input.context.ageYears >= 65) {
      findings.push({
        findingType: "AGE_RELATED_CONSIDERATION",
        severity: "INFORMATIONAL",
        title: "Shadow geriatric consideration",
        summary: "Patient age ≥ 65 with approved clinical profile present (shadow).",
        calculationTrace: {
          inputValues: { ageYears: input.context.ageYears },
          formulaIdentifier: "ageYears>=65",
        },
        deduplicationKey: key({
          patientId: input.patientId,
          encounterId: input.encounterId,
          candidateIdentity: input.candidate.identityKey,
          findingType: "AGE_RELATED_CONSIDERATION",
          ruleIdentity: `age:${profile.id}`,
          knowledgeVersion: profile.knowledgeVersionId,
        }),
      });
    }
  }

  return { rulesConsidered, findings };
}

export function evaluateInsufficientContext(
  input: {
    patientId: string;
    encounterId?: string;
    candidate: ResolvedMedicationIdentity;
    context: AssembledPatientContext;
  }
): ShadowFindingDraft[] {
  if (input.context.missingContextFields.length === 0) return [];
  return [
    {
      findingType: "INSUFFICIENT_PATIENT_CONTEXT",
      severity: "INFORMATIONAL",
      title: "Shadow insufficient patient context",
      summary: `Missing fields: ${input.context.missingContextFields.join(", ")}`,
      requiresClinicalValidation: true,
      deduplicationKey: key({
        patientId: input.patientId,
        encounterId: input.encounterId,
        candidateIdentity: input.candidate.identityKey,
        findingType: "INSUFFICIENT_PATIENT_CONTEXT",
        ruleIdentity: `missing:${input.context.missingContextFields.sort().join(",")}`,
      }),
    },
  ];
}
