import { generateMrnCandidate, generateUniqueMrn } from "./mrn";

function makeSequentialRandomBytes() {
  let n = 0;
  return (size: number) => {
    if (size !== 4) throw new Error(`expected 4 bytes, got ${size}`);
    const buf = Buffer.alloc(4);
    buf.writeUInt32BE(n, 0);
    n++;
    return buf;
  };
}

describe("MRN generator", () => {
  it("generates MS-YYYY-XXXXXXXX", () => {
    const randomBytesFn = () => Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    expect(generateMrnCandidate(2026, randomBytesFn)).toBe("MS-2026-DEADBEEF");
  });

  it("handles DB collisions by retrying", async () => {
    const randomBytesFn = (() => {
      const bufs = [Buffer.from([0, 0, 0, 1]), Buffer.from([0, 0, 0, 2])];
      let i = 0;
      return () => bufs[i++]!;
    })();

    const prisma = {
      patient: {
        findUnique: jest.fn(async ({ where }: { where: { globalMrn: string } }) => {
          // Force a collision on the first candidate
          if (where.globalMrn.endsWith("-00000001")) return { id: "p1" };
          return null;
        })
      }
    } as any;

    const mrn = await generateUniqueMrn(prisma, { year: 2026, randomBytesFn, maxAttempts: 5 });
    expect(mrn).toBe("MS-2026-00000002");
    expect(prisma.patient.findUnique).toHaveBeenCalledTimes(2);
  });

  it("creates 1,000 MRNs without collisions (deterministic)", async () => {
    const randomBytesFn = makeSequentialRandomBytes();
    const seen = new Set<string>();

    const prisma = {
      patient: {
        findUnique: jest.fn(async () => null)
      }
    } as any;

    for (let i = 0; i < 1000; i++) {
      const mrn = await generateUniqueMrn(prisma, { year: 2026, randomBytesFn });
      expect(seen.has(mrn)).toBe(false);
      seen.add(mrn);
    }

    expect(seen.size).toBe(1000);
    expect(prisma.patient.findUnique).toHaveBeenCalledTimes(1000);
  });
});

