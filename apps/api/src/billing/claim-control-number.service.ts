import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/** X12 control bucket per facility (stored in `ClaimControlCounter.type`). */
export const CLAIM_CONTROL_NUMBER_TYPES = ["ISA", "GS", "ST"] as const;
export type ClaimControlNumberType = (typeof CLAIM_CONTROL_NUMBER_TYPES)[number];

/**
 * Atomic per-facility monotonic sequences for X12 control numbers (ISA-13, GS06, ST ref).
 */
@Injectable()
export class ClaimControlNumberService {
  constructor(private readonly prisma: PrismaService) {}

  /** Nine-digit numeric string (fits ISA-13 and common GS/ST refs). */
  async nextNineDigitControl(facilityId: string, controlType: ClaimControlNumberType): Promise<string> {
    const row = await this.prisma.claimControlCounter.upsert({
      where: {
        facilityId_type: { facilityId, type: controlType },
      },
      create: {
        facilityId,
        type: controlType,
        lastValue: 1,
      },
      update: {
        lastValue: { increment: 1 },
      },
    });
    return this.toNineDigits(row.lastValue);
  }

  private toNineDigits(n: number): string {
    return String(n % 1_000_000_000).padStart(9, "0");
  }
}
