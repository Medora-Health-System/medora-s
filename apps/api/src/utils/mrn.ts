import crypto from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export type RandomBytesFn = (size: number) => Buffer;

export function generateMrnCandidate(
  year: number = new Date().getUTCFullYear(),
  randomBytesFn: RandomBytesFn = crypto.randomBytes
) {
  const hex = randomBytesFn(4).toString("hex").toUpperCase();
  return `MS-${year}-${hex}`;
}

export async function generateUniqueMrn(
  prisma: Pick<PrismaClient, "patient">,
  opts?: {
    year?: number;
    randomBytesFn?: RandomBytesFn;
    maxAttempts?: number;
  }
) {
  const year = opts?.year ?? new Date().getUTCFullYear();
  const randomBytesFn = opts?.randomBytesFn ?? crypto.randomBytes;
  const maxAttempts = opts?.maxAttempts ?? 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateMrnCandidate(year, randomBytesFn);
    const exists = await prisma.patient.findUnique({
      where: { globalMrn: candidate },
      select: { id: true }
    });
    if (!exists) return candidate;
  }

  throw new Error("MRN generation exceeded maxAttempts");
}

