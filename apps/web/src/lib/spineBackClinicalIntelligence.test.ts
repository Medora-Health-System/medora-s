import { describe, expect, it } from "vitest";
import { adaptSpineBackPainComplaintIntel, resolveSpineBackPainContext } from "./spineBackClinicalIntelligence";
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const baseIntel = {
  hpi: ["hpi.cervical", "hpi.sciatica", "hpi.cauda"],
  rosRedFlags: ["rf.cauda", "rf.infection"],
  mdmPlanSummary: ["plan.imaging", "plan.return"],
} as ProviderDocumentationComplaintIntelligence;

describe("spineBackClinicalIntelligence", () => {
  it("resolves cervical, thoracic, and lumbar strain branches", () => {
    expect(resolveSpineBackPainContext({ displayName: "Cervical strain" }).branches).toContain("cervical_strain");
    expect(resolveSpineBackPainContext({ displayName: "Thoracic back strain" }).branches).toContain("thoracic_strain");
    expect(resolveSpineBackPainContext({ code: "M54.5", displayName: "Low back pain" }).branches).toContain("lumbar_strain");
  });

  it("resolves radiculopathy, sciatica, disc, stenosis, and myelopathy", () => {
    expect(resolveSpineBackPainContext({ code: "M54.16", displayName: "Radiculopathy, lumbar region" }).branches).toContain("radiculopathy");
    expect(resolveSpineBackPainContext({ code: "M54.3", displayName: "Sciatica" }).branches).toContain("sciatica");
    expect(resolveSpineBackPainContext({ code: "M51.16", displayName: "Intervertebral disc disorders with radiculopathy, lumbar" }).branches).toContain("disc");
    expect(resolveSpineBackPainContext({ code: "M48.06", displayName: "Spinal stenosis, lumbar" }).branches).toContain("stenosis");
    expect(resolveSpineBackPainContext({ displayName: "Cervical myelopathy" }).branches).toContain("myelopathy");
  });

  it("routes cauda and infection away from routine mechanical discharge", () => {
    expect(resolveSpineBackPainContext({ code: "G83.4", displayName: "Cauda equina syndrome" }).dischargeFamilyId).toBe(
      "post_caudal_red_flag_evaluation",
    );
    expect(
      resolveSpineBackPainContext({ displayName: "Spinal epidural abscess", documentedFlags: ["fever"] }).dischargeFamilyId,
    ).toBeNull();
  });

  it("adapts documentation order without changing diagnosis ownership", () => {
    const adapted = adaptSpineBackPainComplaintIntel(baseIntel, {
      branches: ["sciatica", "cauda"],
      redFlagCategories: ["cauda_equina"],
    });
    expect(adapted.hpi?.[0]?.toLowerCase()).toContain("cauda");
  });
});
