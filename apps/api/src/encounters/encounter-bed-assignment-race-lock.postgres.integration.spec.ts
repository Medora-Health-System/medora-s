/**
 * MEDUI.D4A.4.3A — real PostgreSQL serialization for competing exclusive bed claims.
 * Skips unless TEST_DATABASE_URL or DATABASE_URL points at a reachable Postgres.
 */
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import {
  acquireBedAssignmentRaceLock,
  buildBedAssignmentLockMaterial,
  hashBedAssignmentLockKeys,
} from "./encounter-bed-assignment-race-lock.util";

const url = process.env.TEST_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
const describeDb = url ? describe : describe.skip;

jest.setTimeout(60_000);

describeDb("MEDUI.D4A.4.3A PostgreSQL bed-assignment race hardening", () => {
  const prisma = new PrismaClient({ datasourceUrl: url });
  const suffix = randomBytes(4).toString("hex");
  const material = buildBedAssignmentLockMaterial({
    facilityId: `fac-d4a43a-${suffix}`,
    canonicalBedKey: "MS:4",
  });
  const keys = hashBedAssignmentLockKeys(material);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("pg_advisory_xact_lock serializes simultaneous claims on the same bed key", async () => {
    const order: string[] = [];
    let release!: () => void;
    let lockedResolve!: () => void;
    let lockedReject!: (e: unknown) => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    const locked = new Promise<void>((r, j) => {
      lockedResolve = r;
      lockedReject = j;
    });

    const first = prisma
      .$transaction(async (tx) => {
        await acquireBedAssignmentRaceLock(tx, {
          facilityId: `fac-d4a43a-${suffix}`,
          canonicalBedKey: "MS:4",
        });
        order.push("first-locked");
        lockedResolve();
        await held;
        order.push("first-release");
      })
      .catch((e) => {
        lockedReject(e);
        throw e;
      });

    await locked;

    const second = prisma.$transaction(async (tx) => {
      await acquireBedAssignmentRaceLock(tx, {
        facilityId: `fac-d4a43a-${suffix}`,
        canonicalBedKey: "MS:4",
      });
      order.push("second-locked");
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(order).toEqual(["first-locked"]);
    expect(keys.key1).toEqual(hashBedAssignmentLockKeys(material).key1);
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(["first-locked", "first-release", "second-locked"]);
  });
});
