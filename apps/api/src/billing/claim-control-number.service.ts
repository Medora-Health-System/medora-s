import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Atomic monotonic sequence for X12 control numbers (ISA-13, GS06, ST02/ST in SE).
 * Uses a single ClaimControlCounter row — additive, production-safe, collision-avoidant vs hardcoded literals.
 */
@Injectable()
export class ClaimControlNumberService {
  constructor(private readonly prisma: PrismaService) {}

  /** Nine-digit numeric string (fits ISA-13 and common GS/ST refs). */
  async nextNineDigitControl(): Promise<string> {
    const rows = await this.prisma.$queryRaw<{ value: bigint }[]>`
      UPDATE "ClaimControlCounter"
      SET "value" = "value" + 1
      WHERE "id" = 'default'
      RETURNING "value"
    `;
    const n = rows[0]?.value ?? 1n;
    return this.toNineDigits(n);
  }

  private toNineDigits(n: bigint): string {
    const mod = n % 1_000_000_000n;
    const num = Number(mod);
    return String(num).padStart(9, "0");
  }
}
