/**
 * Disposable P2.1 ICD fixture. Not CDC/NCHS FY2026. Not production.
 * English descriptions are fixture markers, not official labels.
 */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  formatIcd10CmDisplayCode,
  GOVERNED_ICD10_CLINICIAN_LABELS,
  ICD10_CM_CODE_SYSTEM,
  normalizeIcd10CodeForLookup,
} from "@medora/shared";

export const P21_FIXTURE_RELEASE = "FY2026-MEDORA-P21-FIXTURE";
export const P21_PRIOR_RELEASE = "FY2025-MEDORA-P21-FIXTURE";

const REQUIRED_CODES = [
  "R10.85",
  "R11.0",
  "R11.10",
  "R11.11",
  "L03.90",
  "G43.D0",
  "G43.D1",
  "R14.0",
  "A42.1",
  "I77.811",
  "R11.1",
  "R11.2",
  "R11.12",
  "L03",
  "G43",
];

export async function seedIcd10P21Fixture(prisma: PrismaClient) {
  const codes = new Set<string>([
    ...REQUIRED_CODES,
    ...Object.keys(GOVERNED_ICD10_CLINICIAN_LABELS.fr).map((key) => formatIcd10CmDisplayCode(key)),
  ]);

  await prisma.icd10DiagnosisSearchAlias.deleteMany({
    where: { releaseVersion: { in: [P21_FIXTURE_RELEASE, P21_PRIOR_RELEASE] } },
  });
  await prisma.icd10DiagnosisTerminology.deleteMany({
    where: { releaseVersion: { in: [P21_FIXTURE_RELEASE, P21_PRIOR_RELEASE] } },
  });
  await prisma.icd10DiagnosisCode.deleteMany({
    where: { releaseVersion: { in: [P21_FIXTURE_RELEASE, P21_PRIOR_RELEASE] } },
  });

  const rows = [...codes].map((code) => ({
    id: randomUUID(),
    code,
    normalizedCode: normalizeIcd10CodeForLookup(code),
    shortDescription: `P21 fixture ${code}`,
    longDescription: `P21 fixture ${code}`,
    isBillable: true,
    isActive: true,
    isSelectable: code !== "L03" && code !== "G43",
    codeSystem: ICD10_CM_CODE_SYSTEM,
    releaseVersion: P21_FIXTURE_RELEASE,
    searchText: `p21 fixture ${code}`.toLowerCase(),
  }));

  await prisma.icd10DiagnosisCode.createMany({ data: rows });

  const fy2025R1085 = {
    id: randomUUID(),
    code: "R10.85",
    normalizedCode: "R1085",
    shortDescription: "P21 FY2025 fixture R10.85",
    longDescription: "P21 FY2025 fixture R10.85",
    isBillable: true,
    isActive: true,
    isSelectable: true,
    codeSystem: ICD10_CM_CODE_SYSTEM,
    releaseVersion: P21_PRIOR_RELEASE,
    searchText: "p21 fy2025 fixture r10.85",
  };
  await prisma.icd10DiagnosisCode.create({ data: fy2025R1085 });

  return { fixtureCount: rows.length, fy2025R1085Id: fy2025R1085.id };
}
