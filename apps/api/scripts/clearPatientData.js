"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function requireConfirm() {
    if (process.env.CONFIRM_RESET !== "true") {
        console.error("[clearPatientData] Refusé : définissez CONFIRM_RESET=true pour exécuter cette opération destructive.");
        process.exit(1);
    }
}
async function main() {
    requireConfirm();
    console.log("[clearPatientData] Démarrage (transaction)…");
    console.log("[clearPatientData] Tables préservées : User, UserRole, Role, Facility, Department, PasswordResetToken, catalogues, inventaire (hors liens patient).");
    await prisma.$transaction(async (tx) => {
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
        const audit = await tx.auditLog.deleteMany({
            where: {
                OR: [
                    { patientId: { not: null } },
                    { encounterId: { not: null } },
                    { orderId: { not: null } },
                ],
            },
        });
        console.log(`[clearPatientData] AuditLog (références patient/consultation/commande) : ${audit.count} ligne(s) supprimée(s).`);
        const res = await tx.result.deleteMany({});
        console.log(`[clearPatientData] Result : ${res.count} ligne(s) supprimée(s).`);
        const oi = await tx.orderItem.deleteMany({});
        console.log(`[clearPatientData] OrderItem : ${oi.count} ligne(s) supprimée(s).`);
        const ord = await tx.order.deleteMany({});
        console.log(`[clearPatientData] Order : ${ord.count} ligne(s) supprimée(s).`);
        const tr = await tx.triage.deleteMany({});
        console.log(`[clearPatientData] Triage : ${tr.count} ligne(s) supprimée(s).`);
        const pm = await tx.pathwayMilestone.deleteMany({});
        console.log(`[clearPatientData] PathwayMilestone : ${pm.count} ligne(s) supprimée(s).`);
        const ps = await tx.pathwaySession.deleteMany({});
        console.log(`[clearPatientData] PathwaySession : ${ps.count} ligne(s) supprimée(s).`);
        const enc = await tx.encounter.deleteMany({});
        console.log(`[clearPatientData] Encounter : ${enc.count} ligne(s) supprimée(s).`);
        const pat = await tx.patient.deleteMany({});
        console.log(`[clearPatientData] Patient : ${pat.count} ligne(s) supprimée(s).`);
    }, {
        maxWait: 60_000,
        timeout: 600_000,
    });
    console.log("[clearPatientData] Terminé avec succès.");
}
main()
    .catch((e) => {
    console.error("[clearPatientData] Erreur :", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=clearPatientData.js.map