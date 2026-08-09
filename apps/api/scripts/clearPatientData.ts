/**
 * LOCAL DEVELOPMENT ONLY: removes patient-domain rows while preserving every AuditLog row.
 *
 * Usage (from repo root):
 *   NODE_ENV=development CONFIRM_RESET=true \
 *   CONFIRM_AUDIT_PRESERVING_PATIENT_RESET=D4SEC_1C2C1_LOCAL_ONLY \
 *   npm run db:clear:patients --workspace=@medora/api
 *
 * Or from apps/api:
 * Requires a DATABASE_URL whose hostname is localhost, 127.0.0.1, or ::1. AuditLog rows are never
 * deleted; nullable patient/encounter/order relations follow their existing FK lifecycle.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const LOCAL_RESET_CONFIRMATION = "D4SEC_1C2C1_LOCAL_ONLY";

export function requireLocalAuditPreservingReset(environment: NodeJS.ProcessEnv): void {
  if (environment.NODE_ENV !== "development" && environment.NODE_ENV !== "test") {
    throw new Error("LOCAL_PATIENT_RESET_REQUIRES_DEVELOPMENT_OR_TEST_ENVIRONMENT");
  }
  if (environment.CONFIRM_RESET !== "true") {
    throw new Error("LOCAL_PATIENT_RESET_REQUIRES_CONFIRM_RESET");
  }
  if (environment.CONFIRM_AUDIT_PRESERVING_PATIENT_RESET !== LOCAL_RESET_CONFIRMATION) {
    throw new Error("LOCAL_PATIENT_RESET_REQUIRES_EXPLICIT_AUDIT_PRESERVATION_CONFIRMATION");
  }
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(environment.DATABASE_URL ?? "");
  } catch {
    throw new Error("LOCAL_PATIENT_RESET_REQUIRES_VALID_DATABASE_URL");
  }
  if (!LOCAL_DATABASE_HOSTS.has(databaseUrl.hostname)) {
    throw new Error("LOCAL_PATIENT_RESET_REFUSES_NON_LOCAL_DATABASE");
  }
}

async function main(): Promise<void> {
  requireLocalAuditPreservingReset(process.env);

  console.log("[clearPatientData] Démarrage (transaction)…");
  console.log("[clearPatientData] Tables préservées : User, UserRole, Role, Facility, Department, PasswordResetToken, catalogues, inventaire (hors liens patient).");

  await prisma.$transaction(
    async (tx) => {
      // 1 — Dépendances vers OrderItem / ordres / consultations (FK ou intégrité métier)
      const md = await tx.medicationDispense.deleteMany({});
      console.log(`[clearPatientData] MedicationDispense : ${md.count} ligne(s) supprimée(s).`);

      const va = await tx.vaccineAdministration.deleteMany({});
      console.log(`[clearPatientData] VaccineAdministration : ${va.count} ligne(s) supprimée(s).`);

      const dcr = await tx.diseaseCaseReport.deleteMany({});
      console.log(`[clearPatientData] DiseaseCaseReport : ${dcr.count} ligne(s) supprimée(s).`);

      const fu = await tx.followUp.deleteMany({});
      console.log(`[clearPatientData] FollowUp : ${fu.count} ligne(s) supprimée(s).`);

      const dx = await tx.diagnosis.deleteMany({});
      console.log(`[clearPatientData] Diagnosis : ${dx.count} ligne(s) supprimée(s).`);

      const inv = await tx.inventoryTransaction.deleteMany({
        where: {
          OR: [{ patientId: { not: null } }, { encounterId: { not: null } }],
        },
      });
      console.log(`[clearPatientData] InventoryTransaction (liens patient/consultation) : ${inv.count} ligne(s) supprimée(s).`);

      // AuditLog is authoritative history and is deliberately not deleted. Existing nullable
      // clinical FKs clear their links as the referenced development fixtures are removed.

      // 2 — Résultats puis lignes de commande puis commandes (ordre explicite, cohérent avec les FK)
      const res = await tx.result.deleteMany({});
      console.log(`[clearPatientData] Result : ${res.count} ligne(s) supprimée(s).`);

      const oi = await tx.orderItem.deleteMany({});
      console.log(`[clearPatientData] OrderItem : ${oi.count} ligne(s) supprimée(s).`);

      const ord = await tx.order.deleteMany({});
      console.log(`[clearPatientData] Order : ${ord.count} ligne(s) supprimée(s).`);

      // 3 — Triage (lié à Encounter)
      const tr = await tx.triage.deleteMany({});
      console.log(`[clearPatientData] Triage : ${tr.count} ligne(s) supprimée(s).`);

      // 4 — PathwayMilestone puis PathwaySession (avant Encounter si pas de cascade partout)
      const pm = await tx.pathwayMilestone.deleteMany({});
      console.log(`[clearPatientData] PathwayMilestone : ${pm.count} ligne(s) supprimée(s).`);

      const ps = await tx.pathwaySession.deleteMany({});
      console.log(`[clearPatientData] PathwaySession : ${ps.count} ligne(s) supprimée(s).`);

      // 5 — Consultations puis patients
      const enc = await tx.encounter.deleteMany({});
      console.log(`[clearPatientData] Encounter : ${enc.count} ligne(s) supprimée(s).`);

      const pat = await tx.patient.deleteMany({});
      console.log(`[clearPatientData] Patient : ${pat.count} ligne(s) supprimée(s).`);
    },
    {
      maxWait: 60_000,
      timeout: 600_000,
    }
  );

  console.log("[clearPatientData] Terminé avec succès.");
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error("[clearPatientData] Erreur :", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
