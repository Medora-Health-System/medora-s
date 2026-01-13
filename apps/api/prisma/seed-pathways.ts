import { PrismaClient, PathwayType, OrderPriority } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding protocol order sets...");

  // Get all facilities or create a default one
  const facilities = await prisma.facility.findMany();
  if (facilities.length === 0) {
    console.log("No facilities found. Please run seed first.");
    return;
  }

  // For each facility, create order sets for each pathway type
  for (const facility of facilities) {
    console.log(`Creating order sets for facility: ${facility.name}`);

    // Get or create catalog items (simplified - you may need to adjust based on your catalog)
    const labTests = await prisma.catalogLabTest.findMany({ take: 10 });
    const imagingStudies = await prisma.catalogImagingStudy.findMany({ take: 10 });
    const medications = await prisma.catalogMedication.findMany({ take: 10 });

    // STROKE Pathway Order Set
    // First, deactivate any existing order sets for this pathway type
    await prisma.protocolOrderSet.updateMany({
      where: {
        facilityId: facility.id,
        pathwayType: PathwayType.STROKE,
        isActive: true,
      },
      data: { isActive: false },
    });

    const strokeOrderSet = await prisma.protocolOrderSet.create({
      data: {
        facilityId: facility.id,
        pathwayType: PathwayType.STROKE,
        name: "Stroke Protocol Order Set",
        description: "Standard orders for acute stroke pathway",
        isActive: true,
        items: {
          create: [
            // Lab tests
            ...(labTests.slice(0, 3).map((test, idx) => ({
              catalogLabTestId: test.id,
              priority: OrderPriority.STAT,
              sequence: idx + 1,
              notes: "Stroke protocol",
            }))),
            // Imaging
            ...(imagingStudies.slice(0, 1).map((study, idx) => ({
              catalogImagingStudyId: study.id,
              priority: OrderPriority.STAT,
              sequence: labTests.length + idx + 1,
              notes: "CT head without contrast",
            }))),
          ],
        },
      },
    });

    // SEPSIS Pathway Order Set
    await prisma.protocolOrderSet.updateMany({
      where: {
        facilityId: facility.id,
        pathwayType: PathwayType.SEPSIS,
        isActive: true,
      },
      data: { isActive: false },
    });

    const sepsisOrderSet = await prisma.protocolOrderSet.create({
      data: {
        facilityId: facility.id,
        pathwayType: PathwayType.SEPSIS,
        name: "Sepsis Protocol Order Set",
        description: "Standard orders for sepsis pathway",
        isActive: true,
        items: {
          create: [
            // Lab tests
            ...(labTests.slice(0, 4).map((test, idx) => ({
              catalogLabTestId: test.id,
              priority: OrderPriority.STAT,
              sequence: idx + 1,
              notes: "Sepsis protocol - lactate, cultures",
            }))),
            // Medications
            ...(medications.slice(0, 2).map((med, idx) => ({
              catalogMedicationId: med.id,
              priority: OrderPriority.STAT,
              sequence: labTests.length + idx + 1,
              notes: "Broad-spectrum antibiotics",
            }))),
          ],
        },
      },
    });

    // STEMI Pathway Order Set
    await prisma.protocolOrderSet.updateMany({
      where: {
        facilityId: facility.id,
        pathwayType: PathwayType.STEMI,
        isActive: true,
      },
      data: { isActive: false },
    });

    const stemiOrderSet = await prisma.protocolOrderSet.create({
      data: {
        facilityId: facility.id,
        pathwayType: PathwayType.STEMI,
        name: "STEMI Protocol Order Set",
        description: "Standard orders for STEMI pathway",
        isActive: true,
        items: {
          create: [
            // Lab tests
            ...(labTests.slice(0, 3).map((test, idx) => ({
              catalogLabTestId: test.id,
              priority: OrderPriority.STAT,
              sequence: idx + 1,
              notes: "Cardiac enzymes, troponin",
            }))),
            // Medications
            ...(medications.slice(0, 3).map((med, idx) => ({
              catalogMedicationId: med.id,
              priority: OrderPriority.STAT,
              sequence: labTests.length + idx + 1,
              notes: "Aspirin, clopidogrel, atorvastatin",
            }))),
          ],
        },
      },
    });

    // TRAUMA Pathway Order Set
    await prisma.protocolOrderSet.updateMany({
      where: {
        facilityId: facility.id,
        pathwayType: PathwayType.TRAUMA,
        isActive: true,
      },
      data: { isActive: false },
    });

    const traumaOrderSet = await prisma.protocolOrderSet.create({
      data: {
        facilityId: facility.id,
        pathwayType: PathwayType.TRAUMA,
        name: "Trauma Protocol Order Set",
        description: "Standard orders for trauma pathway",
        isActive: true,
        items: {
          create: [
            // Lab tests
            ...(labTests.slice(0, 5).map((test, idx) => ({
              catalogLabTestId: test.id,
              priority: OrderPriority.STAT,
              sequence: idx + 1,
              notes: "Trauma panel, type and screen",
            }))),
            // Imaging
            ...(imagingStudies.slice(0, 2).map((study, idx) => ({
              catalogImagingStudyId: study.id,
              priority: OrderPriority.STAT,
              sequence: labTests.length + idx + 1,
              notes: "CT trauma series",
            }))),
          ],
        },
      },
    });

    console.log(`✅ Created order sets for ${facility.name}`);
  }

  console.log("✅ Protocol order sets seeded successfully");
}

main()
  .catch((e) => {
    console.error("Error seeding protocol order sets:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

