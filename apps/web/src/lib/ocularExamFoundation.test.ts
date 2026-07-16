import { describe, expect, it } from "vitest";
import {
  OCULAR_EXAM_FOUNDATION_STATUS,
  formatFluoresceinExam,
  formatIntraocularPressureForDocumentation,
  formatOcularExamDocumentationBlock,
  formatSlitLampExam,
  formatVisualAcuitySummary,
  isIopMeasurementContraindicated,
} from "./ocularExamFoundation";

describe("ocularExamFoundation", () => {
  it("is labeled a structured documentation foundation", () => {
    expect(OCULAR_EXAM_FOUNDATION_STATUS).toBe("STRUCTURED_FOUNDATION_READY");
  });

  it("formats OD/OS/OU visual acuity without inferring a diagnosis", () => {
    const summary = formatVisualAcuitySummary([
      { eye: "OD", value: "20/40" },
      { eye: "OS", value: "20/200", withCorrection: true },
    ]);
    expect(summary).toBe("OD: 20/40; OS: 20/200 (with correction)");
    expect(summary.toLowerCase()).not.toMatch(/diagnos|threat|emergen/);
  });

  it("never claims a diagnosis or vision-threatening status from acuity alone", () => {
    const summary = formatVisualAcuitySummary([{ eye: "OU", value: "counts fingers at 2 feet" }]);
    expect(summary).not.toMatch(/threat|emergen|diagnos/i);
  });

  it("blocks IOP measurement when an open globe is suspected", () => {
    expect(isIopMeasurementContraindicated({ documentedFlags: ["open globe suspected"] })).toBe(true);
    const line = formatIntraocularPressureForDocumentation({ documentedFlags: ["teardrop pupil"] }, [
      { eye: "OD", mmHg: 22 },
    ]);
    expect(line.toLowerCase()).toMatch(/contraindicated/);
    expect(line).not.toMatch(/22 mmHg/);
  });

  it("documents IOP normally when no open-globe red flag is present", () => {
    const line = formatIntraocularPressureForDocumentation({}, [{ eye: "OD", mmHg: 18, method: "tonopen" }]);
    expect(line).toBe("OD: 18 mmHg (tonopen)");
  });

  it("formats fluorescein/Seidel documentation", () => {
    const line = formatFluoresceinExam({ uptake: "PRESENT", seidel: "NEGATIVE", pattern: "linear, central cornea" });
    expect(line).toMatch(/uptake: present/i);
    expect(line).toMatch(/seidel sign: negative/i);
    expect(line).toMatch(/linear, central cornea/);
  });

  it("formats slit-lamp documentation as free text without a diagnosis claim", () => {
    const line = formatSlitLampExam({ findings: "mild conjunctival injection, clear cornea" });
    expect(line).toBe("Slit-lamp exam: mild conjunctival injection, clear cornea");
  });

  it("combines the structured foundation into one documentation block", () => {
    const block = formatOcularExamDocumentationBlock({
      visualAcuity: [{ eye: "OD", value: "20/30" }],
      intraocularPressureFlags: { documentedFlags: ["open globe suspected"] },
      intraocularPressureMeasurements: [{ eye: "OD", mmHg: 30 }],
      fluorescein: { uptake: "PRESENT", seidel: "POSITIVE" },
      slitLamp: { findings: "corneal laceration visualized" },
    });
    expect(block).toMatch(/Visual acuity/);
    expect(block).toMatch(/contraindicated/i);
    expect(block).not.toMatch(/30 mmHg/);
    expect(block).toMatch(/Seidel sign: positive/i);
    expect(block).toMatch(/Slit-lamp exam: corneal laceration visualized/);
  });
});
