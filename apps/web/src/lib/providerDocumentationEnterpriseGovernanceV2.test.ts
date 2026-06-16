import { describe, expect, it } from "vitest";
import {
  ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES,
  ENTERPRISE_GOVERNANCE_REGISTRY,
  registryEntryForTemplateId,
} from "./providerDocumentationEnterpriseGovernanceRegistry";
import {
  allCertifiedAuditTemplateIds,
  allEnterpriseGovernanceModuleIds,
  auditEnterpriseCertificationForTemplate,
  bundlePassesEnterpriseMdm1,
  bundlePassesEnterpriseTrackC,
  ENTERPRISE_GOVERNANCE_OWNER_ASSERTIONS,
  ENTERPRISE_GOVERNANCE_V2_CERTIFICATION_REQUIREMENTS,
  ENTERPRISE_GOVERNANCE_V2_DRIFT_FAILURE_MODES,
  ENTERPRISE_MDM1_REQUIRED_SECTIONS,
  humanDocumentationAuditPhaseForTemplate,
  registryEntryHasGovernanceIsolation,
  resolveEnterpriseGovernanceOwners,
} from "./providerDocumentationEnterpriseGovernanceV2";
import { HUMAN_DOCUMENTATION_AUDIT_FAMILIES } from "./providerDocumentationHumanDocumentationAudit";
import { GOVERNANCE_OWNERSHIP_MATRIX } from "./providerDocumentationGovernanceOwnershipDrift.test";

describe("providerDocumentationEnterpriseGovernanceV2 — MEDUI.ED.POSTCERT.7", () => {
  const certifiedTemplateIds = allCertifiedAuditTemplateIds();

  it("defines six enterprise certification requirements", () => {
    expect(ENTERPRISE_GOVERNANCE_V2_CERTIFICATION_REQUIREMENTS).toEqual([
      "track_c_pass",
      "human_documentation_pass",
      "mdm1_pass",
      "governance_owner_exists",
      "human_documentation_registered",
      "governance_isolation_exists",
    ]);
    expect(ENTERPRISE_MDM1_REQUIRED_SECTIONS).toHaveLength(7);
  });

  it("registers every certified audit family in the enterprise registry", () => {
    const auditPhases = HUMAN_DOCUMENTATION_AUDIT_FAMILIES.map((family) => family.phase);
    for (const phase of auditPhases) {
      const entry = ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES.find((item) => item.auditPhase === phase);
      expect(entry, `missing certified registry entry for ${phase}`).toBeTruthy();
    }
    expect(ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES).toHaveLength(HUMAN_DOCUMENTATION_AUDIT_FAMILIES.length);
  });

  it("maps every human-documentation-audited template to at least one governance owner", () => {
    for (const templateId of certifiedTemplateIds) {
      const owners = resolveEnterpriseGovernanceOwners(templateId as never);
      expect(owners.length, `no governance owner for ${templateId}`).toBeGreaterThan(0);
    }
  });

  it("maps every human-documentation-audited template to a human documentation audit phase", () => {
    for (const templateId of certifiedTemplateIds) {
      expect(humanDocumentationAuditPhaseForTemplate(templateId), templateId).toBeTruthy();
    }
  });

  it("passes enterprise certification for every human-documentation-audited template", () => {
    for (const family of HUMAN_DOCUMENTATION_AUDIT_FAMILIES) {
      for (const template of family.templates) {
        const violations = auditEnterpriseCertificationForTemplate(template.templateId, template.bundle);
        const registryEntry = registryEntryForTemplateId(template.templateId);
        const isolationOk =
          registryEntry == null ||
          registryEntryHasGovernanceIsolation(registryEntry) ||
          resolveEnterpriseGovernanceOwners(template.templateId as never).some((ownerId) => {
            const ownerEntry = ENTERPRISE_GOVERNANCE_REGISTRY.find((item) => item.governanceOwnerId === ownerId);
            return ownerEntry != null && registryEntryHasGovernanceIsolation(ownerEntry);
          });
        const filtered = violations.filter(
          (violation) => !(violation.requirement === "governance_isolation_exists" && isolationOk)
        );
        expect(filtered, template.templateId).toEqual([]);
      }
    }
  });

  it("ensures every certified template bundle passes Track C and MDM.1", () => {
    for (const family of HUMAN_DOCUMENTATION_AUDIT_FAMILIES) {
      for (const template of family.templates) {
        expect(bundlePassesEnterpriseTrackC(template.bundle), `${template.templateId} Track C`).toBe(true);
        expect(bundlePassesEnterpriseMdm1(template.bundle), `${template.templateId} MDM.1`).toBe(true);
      }
    }
  });

  it("registers every enterprise governance owner module", () => {
    const ownerIds = new Set(allEnterpriseGovernanceModuleIds());
    for (const entry of ENTERPRISE_GOVERNANCE_REGISTRY) {
      expect(ownerIds.has(entry.governanceOwnerId as never), entry.governanceOwnerId).toBe(true);
    }
  });

  it("has no duplicate primary ownership in governance ownership matrix", () => {
    const seen = new Set<string>();
    for (const entry of GOVERNANCE_OWNERSHIP_MATRIX) {
      const key = `${entry.templateId}:${entry.primaryOwner}`;
      expect(seen.has(entry.templateId), `duplicate matrix row for ${entry.templateId}`).toBe(false);
      seen.add(entry.templateId);
    }
  });

  it("documents drift-prevention failure modes", () => {
    expect(ENTERPRISE_GOVERNANCE_V2_DRIFT_FAILURE_MODES.length).toBeGreaterThanOrEqual(5);
  });

  it("includes POSTCERT utility families in certified registry", () => {
    const familyIds = ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES.map((entry) => entry.familyId);
    expect(familyIds).toContain("medication_refill");
    expect(familyIds).toContain("observation_reassessment");
  });

  it("assigns gold-standard test suites to POSTCERT utility families", () => {
    const refill = ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES.find((entry) => entry.familyId === "medication_refill");
    const obs = ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES.find((entry) => entry.familyId === "observation_reassessment");
    expect(refill?.goldStandardTestSuite).toBe("providerDocumentationMedicationRefillGoldStandard.test.ts");
    expect(obs?.goldStandardTestSuite).toBe("providerDocumentationObservationReassessmentGoldStandard.test.ts");
  });

  it("extends POSTCERT.3 owner assertions with dizziness and nausea governance", () => {
    expect(ENTERPRISE_GOVERNANCE_OWNER_ASSERTIONS.DizzinessVertigoGovernance("near_syncope_complaint_v1")).toBe(true);
    expect(
      ENTERPRISE_GOVERNANCE_OWNER_ASSERTIONS.NauseaVomitingGovernance("nausea_vomiting_metabolic_complaint_v1")
    ).toBe(true);
  });

  it("flags ownerless templates in enterprise certification audit", () => {
    const fakeBundle = HUMAN_DOCUMENTATION_AUDIT_FAMILIES[0]!.templates[0]!.bundle;
    const violations = auditEnterpriseCertificationForTemplate("not_a_real_template", fakeBundle);
    expect(violations.some((item) => item.requirement === "governance_owner_exists")).toBe(true);
    expect(violations.some((item) => item.requirement === "human_documentation_registered")).toBe(true);
  });
});
