import {
  extractMissingDatabaseObject,
  prismaAlertGroupKey,
  sanitizePrismaException,
  summarizePrismaMessage,
} from "./prisma-error-sanitizer";
import { Prisma } from "@prisma/client";

describe("prisma-error-sanitizer", () => {
  it("extracts missing column from P2022 meta", () => {
    expect(
      extractMissingDatabaseObject({
        modelName: "Encounter",
        column: "hospitalEpisodeId",
      })
    ).toBe("hospitalEpisodeId");
  });

  it("sanitizes PrismaClientKnownRequestError without PHI", () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      "\nInvalid `prisma.encounter.findMany()` invocation:\n\nThe column `hospitalEpisodeId` does not exist in the current database.",
      {
        code: "P2022",
        clientVersion: "6.0.0",
        meta: {
          modelName: "Encounter",
          column: "Encounter.hospitalEpisodeId",
        },
      }
    );
    const s = sanitizePrismaException(err);
    expect(s).toMatchObject({
      prismaCode: "P2022",
      modelName: "Encounter",
      missingDatabaseObject: "Encounter.hospitalEpisodeId",
    });
    expect(s?.messageSummary).toContain("findMany");
    expect(prismaAlertGroupKey(s!, "/trackboard")).toContain("P2022");
    expect(prismaAlertGroupKey(s!, "/trackboard")).toContain("hospitalEpisodeId");
  });

  it("returns null for non-Prisma errors", () => {
    expect(sanitizePrismaException(new Error("boom"))).toBeNull();
  });

  it("summarizes first line only", () => {
    expect(summarizePrismaMessage("line1\nline2 with patient name")).toBe("line1");
  });
});
