import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Lab Tests
  const labTests = [
    { code: "CBC", name: "Complete Blood Count", description: "Full blood count with differential" },
    { code: "CMP", name: "Comprehensive Metabolic Panel", description: "Basic metabolic panel" },
    { code: "LIPID", name: "Lipid Panel", description: "Cholesterol and triglycerides" },
    { code: "TSH", name: "Thyroid Stimulating Hormone", description: "TSH level" },
    { code: "HBA1C", name: "Hemoglobin A1C", description: "Diabetes screening" },
  ];

  for (const test of labTests) {
    await (prisma as any).catalogLabTest.upsert({
      where: { code: test.code },
      update: test,
      create: test,
    });
  }

  // Imaging Studies
  const imagingStudies = [
    { code: "XRAY_CHEST", name: "Chest X-Ray", description: "PA and lateral chest X-ray" },
    { code: "XRAY_EXTREMITY", name: "Extremity X-Ray", description: "X-ray of extremity" },
    { code: "CT_HEAD", name: "CT Head", description: "Computed tomography of head" },
    { code: "CT_CHEST", name: "CT Chest", description: "Computed tomography of chest" },
    { code: "US_ABDOMEN", name: "Abdominal Ultrasound", description: "Ultrasound of abdomen" },
  ];

  for (const study of imagingStudies) {
    await (prisma as any).catalogImagingStudy.upsert({
      where: { code: study.code },
      update: study,
      create: study,
    });
  }

  // Medications
  const medications = [
    { code: "ASPIRIN_81", name: "Aspirin 81mg", description: "Low-dose aspirin" },
    { code: "IBUPROFEN_200", name: "Ibuprofen 200mg", description: "Ibuprofen tablet" },
    { code: "ACETAMINOPHEN_500", name: "Acetaminophen 500mg", description: "Tylenol" },
    { code: "AMOXICILLIN_500", name: "Amoxicillin 500mg", description: "Antibiotic" },
    { code: "LISINOPRIL_10", name: "Lisinopril 10mg", description: "ACE inhibitor" },
  ];

  for (const med of medications) {
    await (prisma as any).catalogMedication.upsert({
      where: { code: med.code },
      update: med,
      create: med,
    });
  }

  console.log("✅ Catalogs seeded");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

