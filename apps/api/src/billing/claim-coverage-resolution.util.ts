import { PrismaService } from "../prisma/prisma.service";

function utcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function coverageActiveForServiceDate(
  cov: { isActive: boolean; effectiveFrom: Date | null; effectiveTo: Date | null },
  serviceDate: Date | null
): boolean {
  if (!cov.isActive) return false;
  if (!serviceDate) return true;
  const svc = utcDay(serviceDate);
  if (cov.effectiveFrom && svc < utcDay(cov.effectiveFrom)) return false;
  if (cov.effectiveTo && svc > utcDay(cov.effectiveTo)) return false;
  return true;
}

export type ResolvedPrimaryCoverage =
  | {
      ok: true;
      coverage: {
        payerId: string | null;
        payerNameFreeText: string | null;
        memberId: string | null;
        policyNumber: string | null;
        subscriberName: string | null;
        relationToSubscriber: string | null;
        payer: { id: string; name: string; isActive: boolean } | null;
      };
    }
  | {
      ok: false;
      reasonCode: "MISSING_PRIMARY_COVERAGE" | "MULTIPLE_PRIMARY_COVERAGE";
    };

/**
 * Resolve one active PRIMARY coverage valid for service date.
 * Returns explicit reason when none or many match.
 */
export async function resolvePrimaryCoverage(
  prisma: PrismaService,
  input: { facilityId: string; patientId: string; serviceDate: Date | null }
): Promise<ResolvedPrimaryCoverage> {
  const primaryRows = await prisma.patientInsuranceCoverage.findMany({
    where: {
      patientId: input.patientId,
      facilityId: input.facilityId,
      rank: "PRIMARY",
    },
    include: { payer: { select: { id: true, name: true, isActive: true } } },
  });

  const activePrimary = primaryRows.filter((row) => coverageActiveForServiceDate(row, input.serviceDate));
  if (activePrimary.length === 0) {
    return { ok: false, reasonCode: "MISSING_PRIMARY_COVERAGE" };
  }
  if (activePrimary.length > 1) {
    return { ok: false, reasonCode: "MULTIPLE_PRIMARY_COVERAGE" };
  }
  const row = activePrimary[0]!;
  return {
    ok: true,
    coverage: {
      payerId: row.payerId,
      payerNameFreeText: row.payerNameFreeText,
      memberId: row.memberId,
      policyNumber: row.policyNumber,
      subscriberName: row.subscriberName,
      relationToSubscriber: row.relationToSubscriber,
      payer: row.payer ? { id: row.payer.id, name: row.payer.name, isActive: row.payer.isActive } : null,
    },
  };
}

