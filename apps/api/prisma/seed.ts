import {
  PrismaClient,
  RoleCode,
  DepartmentCode,
  AuditAction,
  EncounterType,
  EncounterStatus,
  DiagnosisStatus,
  SexAtBirth,
  PatientSex,
  DiseaseCaseStatus,
  InventoryTransactionType,
} from "@prisma/client";
import { sexAtBirthToPatientSex } from "../src/utils/patient-sex-map";
import * as argon2 from "argon2";
import { seedHaitiMedicationCatalog } from "./helpers/seed-haiti-medication-catalog";
import { seedHaitiLabImagingCatalog } from "./helpers/seed-haiti-lab-imaging-catalog";
import { HAITI_MEDICATION_CATALOG, HAITI_DEFAULT_FAVORITE_CODES } from "./data/haiti-medications";
import { HAITI_LAB_CATALOG } from "./data/haiti-lab-tests";
import { HAITI_IMAGING_CATALOG } from "./data/haiti-imaging-studies";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Admin123!";
const SEED_MARKER = "SEED_DEMO_HAITI";

async function main() {
  // Roles
  const roles = await Promise.all(
    ([
      { code: RoleCode.ADMIN, name: "Admin" },
      { code: RoleCode.PROVIDER, name: "Provider" },
      { code: RoleCode.RN, name: "Registered Nurse" },
      { code: RoleCode.FRONT_DESK, name: "Front Desk" },
      { code: RoleCode.LAB, name: "Lab" },
      { code: RoleCode.RADIOLOGY, name: "Radiology" },
      { code: RoleCode.PHARMACY, name: "Pharmacy" },
      { code: RoleCode.BILLING, name: "Billing" }
    ] as const).map((r) =>
      prisma.role.upsert({
        where: { code: r.code },
        update: { name: r.name },
        create: { code: r.code, name: r.name }
      })
    )
  );
  const adminRole = roles.find((r) => r.code === RoleCode.ADMIN);
  if (!adminRole) throw new Error("ADMIN role missing after seed");

  // Facilities
  const facilityDR = await prisma.facility.upsert({
    where: { code: "DR" },
    update: { name: "Facility A (DR)", country: "Dominican Republic", timezone: "America/Santo_Domingo" },
    create: { code: "DR", name: "Facility A (DR)", country: "Dominican Republic", timezone: "America/Santo_Domingo" }
  });

  const facilityHT = await prisma.facility.upsert({
    where: { code: "HT" },
    update: { name: "Clinique Bon Samaritain (Haiti)", country: "Haiti", timezone: "America/Port-au-Prince" },
    create: { code: "HT", name: "Clinique Bon Samaritain (Haiti)", country: "Haiti", timezone: "America/Port-au-Prince" }
  });

  // Departments per facility
  const deptDefs: Array<{ code: DepartmentCode; name: string }> = [
    { code: DepartmentCode.PRIMARY_CARE, name: "Primary Care" },
    { code: DepartmentCode.LAB, name: "Laboratory" },
    { code: DepartmentCode.RAD, name: "Radiology" },
    { code: DepartmentCode.PHARM, name: "Pharmacy" },
    { code: DepartmentCode.INPATIENT, name: "Inpatient" }
  ];

  await Promise.all(
    [facilityDR, facilityHT].flatMap((facility) =>
      deptDefs.map((d) =>
        prisma.department.upsert({
          where: { facilityId_code: { facilityId: facility.id, code: d.code } },
          update: { name: d.name },
          create: { facilityId: facility.id, code: d.code, name: d.name }
        })
      )
    )
  );

  // Admin user (deterministic credentials for local dev)
  // Username/email: admin@medora.local
  // Password: Admin123!
  const passwordHash = await argon2.hash("Admin123!");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@medora.local" },
    update: { firstName: "Admin", lastName: "User", isActive: true },
    create: {
      email: "admin@medora.local",
      firstName: "Admin",
      lastName: "User",
      passwordHash,
      isActive: true
    }
  });

  // Admin role assignment to both facilities
  await Promise.all(
    [facilityDR.id, facilityHT.id].map((facilityId) =>
      prisma.userRole.upsert({
        where: {
          userId_roleId_facilityId: {
            userId: adminUser.id,
            roleId: adminRole.id,
            facilityId
          }
        },
        update: { isActive: true },
        create: { userId: adminUser.id, roleId: adminRole.id, facilityId }
      })
    )
  );

  const providerRole = roles.find((r) => r.code === RoleCode.PROVIDER)!;
  const rnRole = roles.find((r) => r.code === RoleCode.RN)!;
  const pharmacyRole = roles.find((r) => r.code === RoleCode.PHARMACY)!;
  const frontDeskRole = roles.find((r) => r.code === RoleCode.FRONT_DESK)!;
  const htPrimaryDept = await prisma.department.findFirst({
    where: { facilityId: facilityHT.id, code: DepartmentCode.PRIMARY_CARE },
  });
  const htPharmDept = await prisma.department.findFirst({
    where: { facilityId: facilityHT.id, code: DepartmentCode.PHARM },
  });
  const drPrimaryDept = await prisma.department.findFirst({
    where: { facilityId: facilityDR.id, code: DepartmentCode.PRIMARY_CARE },
  });
  const drPharmDept = await prisma.department.findFirst({
    where: { facilityId: facilityDR.id, code: DepartmentCode.PHARM },
  });

  const demoUsers = [
    { email: "provider@medora.local", firstName: "Jean", lastName: "Baptiste", roleId: providerRole.id, departmentId: htPrimaryDept?.id ?? null },
    { email: "rn@medora.local", firstName: "Marie", lastName: "Claire", roleId: rnRole.id, departmentId: htPrimaryDept?.id ?? null },
    { email: "pharmacy@medora.local", firstName: "Pierre", lastName: "Louis", roleId: pharmacyRole.id, departmentId: htPharmDept?.id ?? null },
    { email: "frontdesk@medora.local", firstName: "Sophie", lastName: "Martel", roleId: frontDeskRole.id, departmentId: null },
  ];
  const passwordHashDemo = await argon2.hash(DEMO_PASSWORD);
  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { firstName: u.firstName, lastName: u.lastName, isActive: true },
      create: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: passwordHashDemo,
        isActive: true,
      },
    });
    await prisma.userRole.upsert({
      where: {
        userId_roleId_facilityId: { userId: user.id, roleId: u.roleId, facilityId: facilityHT.id },
      },
      update: { isActive: true, departmentId: u.departmentId },
      create: { userId: user.id, roleId: u.roleId, facilityId: facilityHT.id, departmentId: u.departmentId },
    });
    const drDeptId =
      u.roleId === pharmacyRole.id ? drPharmDept?.id ?? null : drPrimaryDept?.id ?? null;
    await prisma.userRole.upsert({
      where: {
        userId_roleId_facilityId: { userId: user.id, roleId: u.roleId, facilityId: facilityDR.id },
      },
      update: { isActive: true, departmentId: u.email === "frontdesk@medora.local" ? null : drDeptId },
      create: {
        userId: user.id,
        roleId: u.roleId,
        facilityId: facilityDR.id,
        departmentId: u.email === "frontdesk@medora.local" ? null : drDeptId,
      },
    });
  }

  // Laboratoire + imagerie (files de travail)
  const labRole = roles.find((r) => r.code === RoleCode.LAB)!;
  const radRole = roles.find((r) => r.code === RoleCode.RADIOLOGY)!;
  const htLabDept = await prisma.department.findFirst({
    where: { facilityId: facilityHT.id, code: DepartmentCode.LAB },
  });
  const htRadDept = await prisma.department.findFirst({
    where: { facilityId: facilityHT.id, code: DepartmentCode.RAD },
  });
  const drLabDept = await prisma.department.findFirst({
    where: { facilityId: facilityDR.id, code: DepartmentCode.LAB },
  });
  const drRadDept = await prisma.department.findFirst({
    where: { facilityId: facilityDR.id, code: DepartmentCode.RAD },
  });
  const worklistDemoUsers = [
    { email: "lab@medora.local", firstName: "Luc", lastName: "Laborant", roleId: labRole.id, htDept: htLabDept?.id ?? null, drDept: drLabDept?.id ?? null },
    {
      email: "radiology@medora.local",
      firstName: "Rose",
      lastName: "Radiologue",
      roleId: radRole.id,
      htDept: htRadDept?.id ?? null,
      drDept: drRadDept?.id ?? null,
    },
  ];
  for (const u of worklistDemoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { firstName: u.firstName, lastName: u.lastName, isActive: true },
      create: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: passwordHashDemo,
        isActive: true,
      },
    });
    await prisma.userRole.upsert({
      where: {
        userId_roleId_facilityId: { userId: user.id, roleId: u.roleId, facilityId: facilityHT.id },
      },
      update: { isActive: true, departmentId: u.htDept },
      create: { userId: user.id, roleId: u.roleId, facilityId: facilityHT.id, departmentId: u.htDept },
    });
    await prisma.userRole.upsert({
      where: {
        userId_roleId_facilityId: { userId: user.id, roleId: u.roleId, facilityId: facilityDR.id },
      },
      update: { isActive: true, departmentId: u.drDept },
      create: { userId: user.id, roleId: u.roleId, facilityId: facilityDR.id, departmentId: u.drDept },
    });
  }

  const billingRole = roles.find((r) => r.code === RoleCode.BILLING)!;
  const billingUser = await prisma.user.upsert({
    where: { email: "billing@medora.local" },
    update: { firstName: "Claire", lastName: "Comptable", isActive: true },
    create: {
      email: "billing@medora.local",
      firstName: "Claire",
      lastName: "Comptable",
      passwordHash: passwordHashDemo,
      isActive: true,
    },
  });
  await prisma.userRole.upsert({
    where: {
      userId_roleId_facilityId: {
        userId: billingUser.id,
        roleId: billingRole.id,
        facilityId: facilityHT.id,
      },
    },
    update: { isActive: true, departmentId: null },
    create: { userId: billingUser.id, roleId: billingRole.id, facilityId: facilityHT.id, departmentId: null },
  });
  await prisma.userRole.upsert({
    where: {
      userId_roleId_facilityId: {
        userId: billingUser.id,
        roleId: billingRole.id,
        facilityId: facilityDR.id,
      },
    },
    update: { isActive: true, departmentId: null },
    create: { userId: billingUser.id, roleId: billingRole.id, facilityId: facilityDR.id, departmentId: null },
  });

  // Lab + imaging catalogs (French labels, searchText, aliases)
  await seedHaitiLabImagingCatalog(prisma, HAITI_LAB_CATALOG, HAITI_IMAGING_CATALOG);

  // Haiti medication catalog (offline-first: full catalog + aliases + searchText)
  const medCatalogIds = await seedHaitiMedicationCatalog(prisma, HAITI_MEDICATION_CATALOG);

  // Vaccine catalog (6–10)
  const vaccineCatalog = [
    { code: "OPV", name: "Oral Polio Vaccine", description: "Polio", manufacturer: "WHO prequalified" },
    { code: "BCG", name: "BCG", description: "Tuberculosis", manufacturer: "WHO prequalified" },
    { code: "MMR", name: "MMR", description: "Measles, mumps, rubella", manufacturer: "WHO prequalified" },
    { code: "DTP", name: "DTP", description: "Diphtheria, tetanus, pertussis", manufacturer: "WHO prequalified" },
    { code: "HEPB", name: "Hepatitis B", description: "Hep B", manufacturer: "WHO prequalified" },
    { code: "TYPHOID", name: "Typhoid vaccine", description: "Typhoid fever", manufacturer: "WHO prequalified" },
    { code: "CHOLERA", name: "Cholera vaccine", description: "Cholera (oral)", manufacturer: "WHO prequalified" },
    { code: "YELLOW_FEVER", name: "Yellow fever vaccine", description: "Yellow fever", manufacturer: "WHO prequalified" },
  ];
  const vaccineCatalogIds: Record<string, string> = {};
  for (const v of vaccineCatalog) {
    const created = await prisma.vaccineCatalog.upsert({
      where: { code: v.code },
      update: { name: v.name, description: v.description ?? undefined, manufacturer: v.manufacturer ?? undefined },
      create: v,
    });
    vaccineCatalogIds[v.code] = created.id;
  }

  // Patients (8–12) for Haiti clinic
  const patientDefs = [
    { mrn: "1001", firstName: "Jean", lastName: "Pierre", dob: "1980-05-12", sex: SexAtBirth.M, phone: "+509 3701 0001", city: "Port-au-Prince" },
    { mrn: "1002", firstName: "Marie", lastName: "Joseph", dob: "1975-08-22", sex: SexAtBirth.F, phone: "+509 3701 0002", city: "Cap-Haïtien" },
    { mrn: "1003", firstName: "Claude", lastName: "Saint-Louis", dob: "1992-01-08", sex: SexAtBirth.M, phone: "+509 3701 0003", city: "Gonaïves" },
    { mrn: "1004", firstName: "Yolande", lastName: "Dupont", dob: "1988-11-30", sex: SexAtBirth.F, phone: "+509 3701 0004", city: "Saint-Marc" },
    { mrn: "1005", firstName: "Michel", lastName: "François", dob: "1965-03-15", sex: SexAtBirth.M, phone: "+509 3701 0005", city: "Les Cayes" },
    { mrn: "1006", firstName: "Suzanne", lastName: "Jean-Baptiste", dob: "1995-07-04", sex: SexAtBirth.F, phone: "+509 3701 0006", city: "Port-au-Prince" },
    { mrn: "1007", firstName: "André", lastName: "Toussaint", dob: "1970-09-19", sex: SexAtBirth.M, phone: "+509 3701 0007", city: "Jacmel" },
    { mrn: "1008", firstName: "Carmen", lastName: "Larose", dob: "1982-12-01", sex: SexAtBirth.F, phone: "+509 3701 0008", city: "Cap-Haïtien" },
    { mrn: "1009", firstName: "Ronald", lastName: "Marcelin", dob: "2000-02-14", sex: SexAtBirth.M, phone: "+509 3701 0009", city: "Port-au-Prince" },
    { mrn: "1010", firstName: "Joceline", lastName: "Auguste", dob: "1958-06-25", sex: SexAtBirth.F, phone: "+509 3701 0010", city: "Saint-Marc" },
    // Incomplete demographics (dob / sex) for testing completeness flows
    {
      mrn: "1011",
      firstName: "Patient",
      lastName: "Sans date de naissance",
      dob: null,
      sex: null,
      phone: "+509 3701 0011",
      city: "Port-au-Prince",
    },
    {
      mrn: "1012",
      firstName: "Patiente",
      lastName: "Sexe inconnu",
      dob: "1991-04-15",
      sex: SexAtBirth.U,
      phone: "+509 3701 0012",
      city: "Cap-Haïtien",
    },
  ];
  const patientIds: string[] = [];
  for (const p of patientDefs) {
    const globalMrn = `HT-SEED-${p.mrn}`;
    const sexAtBirthVal = p.sex ?? null;
    const sexVal = sexAtBirthVal != null ? sexAtBirthToPatientSex(sexAtBirthVal) : PatientSex.UNKNOWN;
    const created = await prisma.patient.upsert({
      where: { globalMrn },
      update: {
        firstName: p.firstName,
        lastName: p.lastName,
        dob: p.dob ? new Date(p.dob) : null,
        sexAtBirth: sexAtBirthVal,
        sex: sexVal,
        phone: p.phone,
        city: p.city,
        country: "Haiti",
        facilityId: facilityHT.id,
        registeredAtFacilityId: facilityHT.id,
        mrn: p.mrn,
      },
      create: {
        globalMrn,
        mrn: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        dob: p.dob ? new Date(p.dob) : null,
        sexAtBirth: sexAtBirthVal,
        sex: sexVal,
        phone: p.phone,
        city: p.city,
        country: "Haiti",
        facilityId: facilityHT.id,
        registeredAtFacilityId: facilityHT.id,
      },
    });
    patientIds.push(created.id);
  }

  // Idempotent: only create encounters/diagnoses/dispenses/vaccinations/cases if no SEED_DEMO encounters exist
  const existingSeedEncounters = await prisma.encounter.count({
    where: { facilityId: facilityHT.id, notes: SEED_MARKER },
  });
  const providerUser = await prisma.user.findUnique({ where: { email: "provider@medora.local" } });
  const pharmacyUser = await prisma.user.findUnique({ where: { email: "pharmacy@medora.local" } });
  const rnUser = await prisma.user.findUnique({ where: { email: "rn@medora.local" } });

  if (existingSeedEncounters === 0 && providerUser && pharmacyUser && rnUser) {
    // Inventory items (10–15) for HT: mixed stock, some expiring soon
    const now = new Date();
    const soon = new Date(now);
    soon.setMonth(soon.getMonth() + 2);
    const expiredSoon = new Date(now);
    expiredSoon.setMonth(expiredSoon.getMonth() + 1);
    const inventoryDefs = [
      { code: "ASPIRIN_81", sku: "ASPIRIN-81-L1", qty: 500, exp: expiredSoon, lot: "LOT-A81-2025" },
      { code: "ACETAMINOPHEN_500", sku: "ACET-500-L1", qty: 300, exp: soon, lot: "LOT-ACET-2025" },
      { code: "AMOXICILLIN_500", sku: "AMOX-500-L1", qty: 120, exp: soon, lot: "LOT-AMOX-2025" },
      { code: "METFORMIN_500", sku: "MET-500-L1", qty: 200, exp: soon, lot: "LOT-MET-2025" },
      { code: "OMEPRAZOLE_20", sku: "OMEP-20-L1", qty: 80, exp: expiredSoon, lot: "LOT-OMEP-2025" },
      { code: "ORAL_REHYDRATION", sku: "ORS-L1", qty: 1000, exp: soon, lot: "LOT-ORS-2025" },
      { code: "AZITHROMYCIN_250", sku: "AZI-250-L1", qty: 50, exp: soon, lot: "LOT-AZI-2025" },
      { code: "CIPROFLOXACIN_500", sku: "CIPRO-500-L1", qty: 60, exp: soon, lot: "LOT-CIPRO-2025" },
      { code: "IBUPROFEN_200", sku: "IBU-200-L1", qty: 250, exp: soon, lot: "LOT-IBU-2025" },
      { code: "LISINOPRIL_10", sku: "LIS-10-L1", qty: 90, exp: soon, lot: "LOT-LIS-2025" },
      { code: "ALBENDAZOLE_400", sku: "ALB-400-L1", qty: 200, exp: soon, lot: "LOT-ALB-2025" },
      { code: "CHLOROQUINE_250", sku: "CHLOR-250-L1", qty: 100, exp: soon, lot: "LOT-CHLOR-2025" },
      { code: "PREDNISONE_5", sku: "PRED-5-L1", qty: 150, exp: soon, lot: "LOT-PRED-2025" },
      { code: "LOSARTAN_50", sku: "LOS-50-L1", qty: 70, exp: soon, lot: "LOT-LOS-2025" },
      { code: "HYDROCHLOROTHIAZIDE_25", sku: "HCTZ-25-L1", qty: 85, exp: soon, lot: "LOT-HCTZ-2025" },
    ];
    const inventoryIdsBySku: Record<string, string> = {};
    for (const inv of inventoryDefs) {
      const catId = medCatalogIds[inv.code];
      if (!catId) continue;
      const created = await prisma.inventoryItem.upsert({
        where: { facilityId_sku: { facilityId: facilityHT.id, sku: inv.sku } },
        update: { quantityOnHand: inv.qty, expirationDate: inv.exp, lotNumber: inv.lot },
        create: {
          facilityId: facilityHT.id,
          catalogMedicationId: catId,
          sku: inv.sku,
          lotNumber: inv.lot,
          expirationDate: inv.exp,
          quantityOnHand: inv.qty,
          reorderLevel: 10,
        },
      });
      inventoryIdsBySku[inv.sku] = created.id;
    }

    // Mark Haiti default favorites (InventoryItem.isFavorite) for seeded inventory
    const favoriteCatalogIds = HAITI_DEFAULT_FAVORITE_CODES.map((c) => medCatalogIds[c]).filter(Boolean);
    if (favoriteCatalogIds.length > 0) {
      await prisma.inventoryItem.updateMany({
        where: { facilityId: facilityHT.id, catalogMedicationId: { in: favoriteCatalogIds } },
        data: { isFavorite: true },
      });
    }

    // Outpatient encounters (10–15)
    const encounterDefs = [
      { patientIdx: 0, chiefComplaint: "Hypertension follow-up", daysAgo: 2 },
      { patientIdx: 1, chiefComplaint: "Upper respiratory infection", daysAgo: 5 },
      { patientIdx: 2, chiefComplaint: "Abdominal pain", daysAgo: 1 },
      { patientIdx: 3, chiefComplaint: "Prenatal check", daysAgo: 7 },
      { patientIdx: 4, chiefComplaint: "Diabetes management", daysAgo: 14 },
      { patientIdx: 5, chiefComplaint: "Rash", daysAgo: 3 },
      { patientIdx: 6, chiefComplaint: "Fever and diarrhea", daysAgo: 0 },
      { patientIdx: 7, chiefComplaint: "Anemia", daysAgo: 10 },
      { patientIdx: 8, chiefComplaint: "Vaccination", daysAgo: 4 },
      { patientIdx: 9, chiefComplaint: "Chronic knee pain", daysAgo: 21 },
      { patientIdx: 0, chiefComplaint: "Medication refill", daysAgo: 30 },
      { patientIdx: 1, chiefComplaint: "Blood pressure check", daysAgo: 45 },
      { patientIdx: 2, chiefComplaint: "Typhoid follow-up", daysAgo: 8 },
    ];
    const encounterIds: string[] = [];
    for (const e of encounterDefs) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - e.daysAgo);
      const enc = await prisma.encounter.create({
        data: {
          facilityId: facilityHT.id,
          patientId: patientIds[e.patientIdx],
          providerId: providerUser.id,
          type: EncounterType.OUTPATIENT,
          status: e.daysAgo <= 1 ? EncounterStatus.OPEN : EncounterStatus.CLOSED,
          chiefComplaint: e.chiefComplaint,
          dischargedAt: e.daysAgo <= 1 ? null : new Date(createdAt.getTime() + 3600000),
          notes: SEED_MARKER,
        },
      });
      encounterIds.push(enc.id);
    }

    // Diagnoses (8–12): link to encounters
    const diagnosisDefs = [
      { encounterIdx: 0, code: "I10", description: "Essential hypertension", onsetDate: "2023-01-15", status: DiagnosisStatus.ACTIVE },
      { encounterIdx: 1, code: "J06.9", description: "Acute upper respiratory infection", onsetDate: "2025-03-10", status: DiagnosisStatus.ACTIVE },
      { encounterIdx: 2, code: "R10.9", description: "Unspecified abdominal pain", onsetDate: "2025-03-15", status: DiagnosisStatus.ACTIVE },
      { encounterIdx: 4, code: "E11.9", description: "Type 2 diabetes mellitus", onsetDate: "2020-06-01", status: DiagnosisStatus.ACTIVE },
      { encounterIdx: 5, code: "L20.9", description: "Atopic dermatitis", onsetDate: "2025-03-12", status: DiagnosisStatus.ACTIVE },
      { encounterIdx: 6, code: "A09", description: "Infectious gastroenteritis", onsetDate: "2025-03-17", status: DiagnosisStatus.ACTIVE },
      { encounterIdx: 7, code: "D64.9", description: "Anemia, unspecified", onsetDate: "2024-11-01", status: DiagnosisStatus.ACTIVE },
      { encounterIdx: 9, code: "M17.9", description: "Osteoarthritis of knee", onsetDate: "2022-05-01", status: DiagnosisStatus.ACTIVE },
      { encounterIdx: 1, code: "J06.9", description: "URI (resolved)", onsetDate: "2025-02-01", status: DiagnosisStatus.RESOLVED },
      { encounterIdx: 12, code: "A01.04", description: "Typhoid fever", onsetDate: "2025-03-05", status: DiagnosisStatus.ACTIVE },
    ];
    for (const d of diagnosisDefs) {
      await prisma.diagnosis.create({
        data: {
          facilityId: facilityHT.id,
          patientId: patientIds[encounterDefs[d.encounterIdx].patientIdx],
          encounterId: encounterIds[d.encounterIdx],
          code: d.code,
          description: d.description,
          status: d.status,
          onsetDate: d.onsetDate ? new Date(d.onsetDate) : null,
          resolvedDate: d.status === DiagnosisStatus.RESOLVED ? new Date() : null,
        },
      });
    }

    // Medication dispenses (5–8)
    const dispenseDefs = [
      { encounterIdx: 0, catalogCode: "LISINOPRIL_10", sku: "LIS-10-L1", qty: 30 },
      { encounterIdx: 1, catalogCode: "AMOXICILLIN_500", sku: "AMOX-500-L1", qty: 21 },
      { encounterIdx: 4, catalogCode: "METFORMIN_500", sku: "MET-500-L1", qty: 60 },
      { encounterIdx: 6, catalogCode: "ORAL_REHYDRATION", sku: "ORS-L1", qty: 10 },
      { encounterIdx: 6, catalogCode: "AZITHROMYCIN_250", sku: "AZI-250-L1", qty: 6 },
      { encounterIdx: 2, catalogCode: "OMEPRAZOLE_20", sku: "OMEP-20-L1", qty: 30 },
      { encounterIdx: 7, catalogCode: "PREDNISONE_5", sku: "PRED-5-L1", qty: 14 },
      { encounterIdx: 9, catalogCode: "IBUPROFEN_200", sku: "IBU-200-L1", qty: 30 },
    ];
    for (const disp of dispenseDefs) {
      const invId = inventoryIdsBySku[disp.sku];
      if (!invId) continue;
      await prisma.medicationDispense.create({
        data: {
          facilityId: facilityHT.id,
          patientId: patientIds[encounterDefs[disp.encounterIdx].patientIdx],
          encounterId: encounterIds[disp.encounterIdx],
          catalogMedicationId: medCatalogIds[disp.catalogCode],
          inventoryItemId: invId,
          quantityDispensed: disp.qty,
          dispensedByUserId: pharmacyUser.id,
          dosageInstructions: "As directed",
        },
      });
      await prisma.inventoryTransaction.create({
        data: {
          inventoryItemId: invId,
          facilityId: facilityHT.id,
          type: InventoryTransactionType.DISPENSE,
          quantity: -disp.qty,
          performedByUserId: pharmacyUser.id,
          patientId: patientIds[encounterDefs[disp.encounterIdx].patientIdx],
          encounterId: encounterIds[disp.encounterIdx],
        },
      });
    }

    // Vaccine administrations (5–8)
    const vaccineDefs = [
      { patientIdx: 8, vaccineCode: "MMR", doseNumber: 1, encounterIdx: 8 },
      { patientIdx: 1, vaccineCode: "TYPHOID", doseNumber: 1, encounterIdx: 12 },
      { patientIdx: 2, vaccineCode: "CHOLERA", doseNumber: 2, encounterIdx: 12 },
      { patientIdx: 0, vaccineCode: "HEPB", doseNumber: 2, encounterIdx: 10 },
      { patientIdx: 5, vaccineCode: "OPV", doseNumber: 3, encounterIdx: 5 },
      { patientIdx: 9, vaccineCode: "YELLOW_FEVER", doseNumber: 1, encounterIdx: 9 },
      { patientIdx: 3, vaccineCode: "DTP", doseNumber: 4, encounterIdx: 3 },
      { patientIdx: 6, vaccineCode: "BCG", doseNumber: 1, encounterIdx: 6 },
    ];
    for (const v of vaccineDefs) {
      const vaccineId = vaccineCatalogIds[v.vaccineCode];
      if (!vaccineId) continue;
      const encId = encounterIds[v.encounterIdx];
      const admAt = new Date();
      admAt.setDate(admAt.getDate() - (v.patientIdx + 2));
      await prisma.vaccineAdministration.create({
        data: {
          patientId: patientIds[v.patientIdx],
          facilityId: facilityHT.id,
          encounterId: encId,
          vaccineCatalogId: vaccineId,
          doseNumber: v.doseNumber,
          administeredAt: admAt,
          administeredByUserId: rnUser.id,
          lotNumber: "LOT-VAC-" + v.vaccineCode,
        },
      });
    }

    // Disease case reports (5–8), Haiti-relevant
    const caseDefs = [
      { diseaseCode: "A00", diseaseName: "Cholera", status: DiseaseCaseStatus.CONFIRMED, patientIdx: 2, commune: "Saint-Marc", department: "Artibonite" },
      { diseaseCode: "A01.04", diseaseName: "Typhoid fever", status: DiseaseCaseStatus.CONFIRMED, patientIdx: 2, commune: "Saint-Marc", department: "Artibonite" },
      { diseaseCode: "B50.9", diseaseName: "Plasmodium falciparum malaria", status: DiseaseCaseStatus.CONFIRMED, patientIdx: 4, commune: "Les Cayes", department: "Sud" },
      { diseaseCode: "A90", diseaseName: "Dengue fever", status: DiseaseCaseStatus.SUSPECTED, patientIdx: 5, commune: "Port-au-Prince", department: "Ouest" },
      { diseaseCode: "A15.0", diseaseName: "Tuberculosis of lung", status: DiseaseCaseStatus.CONFIRMED, patientIdx: 7, commune: "Cap-Haïtien", department: "Nord" },
      { diseaseCode: "A00", diseaseName: "Cholera", status: DiseaseCaseStatus.RULED_OUT, patientIdx: 6, commune: "Jacmel", department: "Sud-Est" },
      { diseaseCode: "B50.9", diseaseName: "Malaria", status: DiseaseCaseStatus.SUSPECTED, patientIdx: 1, commune: "Cap-Haïtien", department: "Nord" },
    ];
    for (const c of caseDefs) {
      await prisma.diseaseCaseReport.create({
        data: {
          facilityId: facilityHT.id,
          patientId: patientIds[c.patientIdx],
          encounterId: encounterIds[Math.min(c.patientIdx, encounterIds.length - 1)],
          diseaseCode: c.diseaseCode,
          diseaseName: c.diseaseName,
          status: c.status,
          commune: c.commune,
          department: c.department,
          reportedByUserId: providerUser.id,
        },
      });
    }
  }

  // Seed a couple of example audit events (not required for seeding logic)
  await prisma.auditLog.createMany({
    data: [
      {
        action: AuditAction.SEED,
        entityType: "SYSTEM",
        entityId: "seed",
        metadata: { note: "Initial seed completed" }
      },
      {
        action: AuditAction.SEED,
        entityType: "USER",
        entityId: adminUser.id,
        userId: adminUser.id,
        metadata: { note: "Seeded admin user" }
      }
    ],
    skipDuplicates: true
  });

  // --- Summary: Haiti MVP demo ---
  const encounterCount = await prisma.encounter.count({ where: { facilityId: facilityHT.id } });
  const diagnosisCount = await prisma.diagnosis.count({ where: { facilityId: facilityHT.id } });
  const dispenseCount = await prisma.medicationDispense.count({ where: { facilityId: facilityHT.id } });
  const vaccineAdminCount = await prisma.vaccineAdministration.count({ where: { facilityId: facilityHT.id } });
  const caseReportCount = await prisma.diseaseCaseReport.count({ where: { facilityId: facilityHT.id } });
  const inventoryCount = await prisma.inventoryItem.count({ where: { facilityId: facilityHT.id } });

  console.log("\n---------- Seed complete: Haiti MVP demo ----------");
  console.log("Facility:", facilityHT.name, "(" + facilityHT.code + ")");
  console.log("Patients:", patientIds.length);
  console.log("Encounters:", encounterCount);
  console.log("Diagnoses:", diagnosisCount);
  console.log("Medication dispenses:", dispenseCount);
  console.log("Vaccine administrations:", vaccineAdminCount);
  console.log("Disease case reports:", caseReportCount);
  console.log("Inventory items:", inventoryCount);
  console.log("\n--- Seeded users (password for all: " + DEMO_PASSWORD + ") ---");
  console.log("  admin@medora.local      (ADMIN)");
  console.log("  provider@medora.local  (PROVIDER) - Jean Baptiste");
  console.log("  rn@medora.local         (RN) - Marie Claire");
  console.log("  pharmacy@medora.local   (PHARMACY) - Pierre Louis");
  console.log("  frontdesk@medora.local  (FRONT_DESK) - Sophie Martel");
  console.log("  lab@medora.local        (LAB) - Luc Laborant");
  console.log("  radiology@medora.local  (RADIOLOGY) - Rose Radiologue");
  console.log("  billing@medora.local    (BILLING) - Claire Comptable");
  console.log("----------------------------------------\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

