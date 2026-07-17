/**
 * Medication Intelligence implementation roadmap — 11 phases + milestones A–G.
 */
import { auditBase, type AuditConfidence, type AuditDataSource } from "./medication-audit-types";

export const ROADMAP_PHASE_COUNT = 11;

export type RoadmapMilestoneId = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export type RoadmapPhase = {
  phase: number;
  name: string;
  status: "DONE" | "PLANNED" | "FUTURE";
  objective: string;
  exitCriteria: string[];
};

export type RoadmapMilestone = {
  id: RoadmapMilestoneId;
  title: string;
  phases: number[];
  deliverables: string[];
};

export function buildImplementationRoadmap(dataSource: AuditDataSource, confidence: AuditConfidence) {
  const phases: RoadmapPhase[] = [
    {
      phase: 1,
      name: "Architecture audit",
      status: "DONE",
      objective: "Read-only medication engine inventory, metrics, maturity, and JSON artifacts",
      exitCriteria: [
        "20 audit JSON artifacts generated",
        "Live DB metrics captured or seed fallback documented",
        "Maturity score and foundation repair decision recorded",
      ],
    },
    {
      phase: 2,
      name: "Canonical identity + RxNorm foundation",
      status: "PLANNED",
      objective: "Establish RxNorm-backed MedicationConcept identity and legacy linkage rules",
      exitCriteria: ["rxNormConceptId populated for core concepts", "Dual-identity linkage audit passes"],
    },
    {
      phase: 3,
      name: "Official medication concept import (RxNorm SCD/SBD core)",
      status: "PLANNED",
      objective: "Import licensed RxNorm SCD/SBD subset aligned to Haiti/enterprise formulary",
      exitCriteria: ["Import pipeline idempotent", "No silent promotion from staging"],
    },
    {
      phase: 4,
      name: "Strength/form/route normalization + EN/FR aliases",
      status: "PLANNED",
      objective: "Normalize concentration, route, dosage form, and bilingual search aliases",
      exitCriteria: ["Duplicate strength/form signatures reduced", "EN/FR alias parity validated"],
    },
    {
      phase: 5,
      name: "Enterprise search ranking at scale",
      status: "PLANNED",
      objective: "Prove search latency and ranking quality at 10k–100k catalog scale",
      exitCriteria: ["Probe suite green at target scale", "No duplicate top-hit codes"],
    },
    {
      phase: 6,
      name: "Order-sentence / ordering integration with canonical IDs",
      status: "PLANNED",
      objective: "OrderItem uses canonical product/package IDs consistently in provider workflows",
      exitCriteria: ["Order search gated on canonical linkage", "Legacy catalog codes preserved for FK stability"],
    },
    {
      phase: 7,
      name: "Prescription entity + discharge Rx",
      status: "PLANNED",
      objective: "Structured Prescription model and discharge medication workflow",
      exitCriteria: ["Prescription schema + API", "Discharge Rx printable artifact"],
    },
    {
      phase: 8,
      name: "Medication reconciliation",
      status: "PLANNED",
      objective: "Admission/discharge/transfer med-rec with provenance",
      exitCriteria: ["MedicationReconciliation entity", "Encounter-scoped med list compare UI"],
    },
    {
      phase: 9,
      name: "Safety knowledge (allergy class + interactions — licensed source)",
      status: "PLANNED",
      objective: "Licensed allergy class and drug-drug interaction knowledge integration",
      exitCriteria: ["Interaction engine beyond JSON group ids", "Allergy class mapping beyond free text"],
    },
    {
      phase: 10,
      name: "MAR/inventory/billing hardening + HCPCS/NDC package linkage",
      status: "PLANNED",
      objective: "Harden MAR, inventory, and billing with package-level NDC/HCPCS linkage",
      exitCriteria: ["Package NDC coverage target met", "HCPCS billing separated from clinical identity"],
    },
    {
      phase: 11,
      name: "Enterprise certification",
      status: "FUTURE",
      objective: "Full medication intelligence certification gate before national-scale rollout",
      exitCriteria: ["Certification probe matrix green", "Production deployment readiness ≥ 4/5"],
    },
  ];

  const milestones: RoadmapMilestone[] = [
    {
      id: "A",
      title: "Foundation visibility",
      phases: [1],
      deliverables: ["Architecture inventory JSON", "Catalog metrics JSON", "Maturity score JSON"],
    },
    {
      id: "B",
      title: "Canonical identity",
      phases: [2, 3],
      deliverables: ["RxNorm readiness JSON green", "Identifier coverage JSON", "Legacy linkage backfill"],
    },
    {
      id: "C",
      title: "Catalog quality",
      phases: [4],
      deliverables: ["Localization audit improvements", "Strength/form/route normalization", "Alias expansion"],
    },
    {
      id: "D",
      title: "Search excellence",
      phases: [5],
      deliverables: ["Search audit probes at scale", "Ranking/uniqueness certification"],
    },
    {
      id: "E",
      title: "Clinical ordering",
      phases: [6],
      deliverables: ["Ordering audit maturity ≥ 4", "Canonical order-sentence integration"],
    },
    {
      id: "F",
      title: "Prescribing & reconciliation",
      phases: [7, 8],
      deliverables: ["Prescription audit entity present", "Medication reconciliation workflow"],
    },
    {
      id: "G",
      title: "Safety, operations, certification",
      phases: [9, 10, 11],
      deliverables: [
        "Safety engine audit maturity uplift",
        "Formulary/inventory/billing hardening",
        "Enterprise certification gate",
      ],
    },
  ];

  return {
    ...auditBase(dataSource, confidence),
    phaseCount: ROADMAP_PHASE_COUNT,
    phases,
    milestones,
    currentPhase: 1,
    nextRecommendedPhase: 2,
  };
}

export function buildRoadmapArtifact(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return buildImplementationRoadmap(dataSource, confidence);
}
