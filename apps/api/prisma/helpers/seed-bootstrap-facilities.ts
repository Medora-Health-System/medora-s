import { PrismaClient, DepartmentCode } from "@prisma/client";
import {
  ensureFacilityClinicalDepartments,
  ensureFacilityServiceLineDepartments,
} from "../../src/admin/facility-department-seed.util";
import { parseStoredFacilityServiceLines } from "@medora/shared";

/**
 * Idempotent bootstrap facilities (DR + HT) used for empty-DB operability.
 * Not demo clinical data — does not create users, patients, or encounters.
 */
export async function seedBootstrapFacilities(prisma: PrismaClient) {
  const facilityDR = await prisma.facility.upsert({
    where: { code: "DR" },
    update: {
      name: "Facility A (DR)",
      country: "Dominican Republic",
      timezone: "America/Santo_Domingo",
      facilityType: "CLINIC",
      serviceLinesJson: ["OBSERVATION", "LABORATORY"],
    },
    create: {
      code: "DR",
      name: "Facility A (DR)",
      country: "Dominican Republic",
      timezone: "America/Santo_Domingo",
      facilityType: "CLINIC",
      serviceLinesJson: ["OBSERVATION", "LABORATORY"],
    },
  });

  const facilityHT = await prisma.facility.upsert({
    where: { code: "HT" },
    update: {
      name: "Clinique Bon Samaritain (Haiti)",
      country: "Haiti",
      timezone: "America/Port-au-Prince",
      facilityType: "CLINIC",
      serviceLinesJson: ["OBSERVATION", "LABORATORY"],
    },
    create: {
      code: "HT",
      name: "Clinique Bon Samaritain (Haiti)",
      country: "Haiti",
      timezone: "America/Port-au-Prince",
      facilityType: "CLINIC",
      serviceLinesJson: ["OBSERVATION", "LABORATORY"],
    },
  });

  const deptDefs: Array<{ code: DepartmentCode; name: string }> = [
    { code: DepartmentCode.PRIMARY_CARE, name: "Primary Care" },
    { code: DepartmentCode.LAB, name: "Laboratory" },
    { code: DepartmentCode.RAD, name: "Radiology" },
    { code: DepartmentCode.PHARM, name: "Pharmacy" },
    { code: DepartmentCode.INPATIENT, name: "Inpatient" },
  ];

  await Promise.all(
    [facilityDR, facilityHT].flatMap((facility) =>
      deptDefs.map((d) =>
        prisma.department.upsert({
          where: { facilityId_code: { facilityId: facility.id, code: d.code } },
          update: { name: d.name },
          create: { facilityId: facility.id, code: d.code, name: d.name },
        }),
      ),
    ),
  );

  for (const facility of [facilityDR, facilityHT]) {
    await ensureFacilityClinicalDepartments(prisma, facility.id, { defaultLanguage: "fr" });
    await ensureFacilityServiceLineDepartments(prisma, facility.id, {
      facilityType: facility.facilityType,
      serviceLines: parseStoredFacilityServiceLines(facility.serviceLinesJson),
      defaultLanguage: "fr",
    });
  }

  return { facilityDR, facilityHT };
}
