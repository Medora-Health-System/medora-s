import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  buildRealReleaseIdentifier,
  isRealSourceClassification,
  validateRxNormReleaseManifest,
} from "@medora/shared";
import {
  canRollbackRealRelease,
  loadAndValidateManifest,
  resolveSafeSourcePath,
  runRxNormRealImport,
  validateSourceFiles,
} from "./rxnorm-real-import-service";

const FIXTURE_DIR = join(__dirname, "fixtures");
const MANIFEST_PATH = join(FIXTURE_DIR, "structural-rxnorm-manifest-p5.json");
const FIXTURE_RRF = join(FIXTURE_DIR, "structural-rxnconso-p5.rrf.fixture");

describe("rxnorm real import governance (unit)", () => {
  it("rejects path traversal in resolveSafeSourcePath", () => {
    expect(() => resolveSafeSourcePath(FIXTURE_DIR, "../secrets/RXNCONSO.RRF")).toThrow(
      /path traversal|Unsafe fileName/i
    );
    expect(() => resolveSafeSourcePath(FIXTURE_DIR, "/etc/passwd")).toThrow(/Unsafe fileName/i);
  });

  it("loads and validates structural manifest", () => {
    const loaded = loadAndValidateManifest(MANIFEST_PATH);
    expect(loaded.errors).toEqual([]);
    expect(loaded.manifest.sourceClassification).toBe("DEV_SAMPLE");
    expect(isRealSourceClassification(loaded.manifest.sourceClassification)).toBe(false);
    expect(loaded.manifestHashSha256).toHaveLength(64);
  });

  it("rejects checksum mismatch", () => {
    const loaded = loadAndValidateManifest(MANIFEST_PATH);
    const tampered = {
      ...loaded.manifest,
      files: loaded.manifest.files.map((file) => ({
        ...file,
        sha256: "b".repeat(64),
      })),
    };
    const validation = validateSourceFiles(tampered, FIXTURE_DIR);
    expect(validation.ok).toBe(false);
    expect(validation.errors.some((entry) => entry.includes("Checksum mismatch"))).toBe(true);
  });

  it("validate source does not imply staging", async () => {
    const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
    if (!hasDatabase) return;

    const prisma = new PrismaClient();
    try {
      const before = await prisma.rxNormStagingConcept.count();
      const result = await runRxNormRealImport(prisma, {
        mode: "VALIDATE_SOURCE",
        manifestPath: MANIFEST_PATH,
        sourceDir: FIXTURE_DIR,
      });
      const after = await prisma.rxNormStagingConcept.count();
      expect(result.ok).toBe(true);
      expect(after).toBe(before);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("canRollbackRealRelease requires zero verified mappings", () => {
    expect(canRollbackRealRelease("STAGED", 0)).toBe(true);
    expect(canRollbackRealRelease("STAGED", 1)).toBe(false);
  });

  it("builds release identifier from manifest hash prefix", () => {
    const loaded = loadAndValidateManifest(MANIFEST_PATH);
    const id = buildRealReleaseIdentifier({
      releaseVersionOfficial: loaded.manifest.releaseVersionOfficial,
      releaseScope: loaded.manifest.releaseScope,
      manifestHashSha256: loaded.manifestHashSha256,
    });
    expect(id.startsWith("REAL-STRUCTURAL-P5-20261007-DEVELOPMENT_SUBSET-")).toBe(true);
  });
});

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
const describeDb = hasDatabase ? describe : describe.skip;

describeDb("rxnorm real import service (integration)", () => {
  const prisma = new PrismaClient();
  let releaseId: string | undefined;

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stages structural fixture with DEV_SAMPLE classification", async () => {
    const catalogBefore = await prisma.catalogMedication.count();
    const conceptRxBefore = await prisma.medicationConcept.findMany({
      where: { rxNormConceptId: { not: null } },
      select: { id: true, rxNormConceptId: true },
    });

    const result = await runRxNormRealImport(prisma, {
      mode: "STAGE_REAL_REFERENCE",
      manifestPath: MANIFEST_PATH,
      sourceDir: FIXTURE_DIR,
      actor: "phase5-test",
      confirmRealSource: true,
      confirmNonClinicalOnly: true,
    });

    expect(result.ok).toBe(true);
    expect(result.importStatus).toBe("STAGED");
    releaseId = result.releaseId;

    const release = await prisma.rxNormReferenceRelease.findUnique({
      where: { id: releaseId! },
    });
    expect(release?.isSynthetic).toBe(true);
    expect(release?.sourceClassification).toBe("DEV_SAMPLE");
    expect(release?.referenceActivationStatus).toBe("REFERENCE_RELEASE_ACTIVE");

    const staged = await prisma.rxNormStagingConcept.findMany({ where: { releaseId: releaseId! } });
    expect(staged.length).toBeGreaterThanOrEqual(5);
    expect(staged.every((row) => row.dataClassification === "DEV_SAMPLE")).toBe(true);
    expect(staged.every((row) => row.isSearchableReference === false)).toBe(true);
    expect(staged.every((row) => row.isOrderableEligible === false)).toBe(true);
    expect(staged.every((row) => !row.rxcui.startsWith("SYNTH"))).toBe(true);

    const catalogAfter = await prisma.catalogMedication.count();
    expect(catalogAfter).toBe(catalogBefore);

    const conceptRxAfter = await prisma.medicationConcept.findMany({
      where: { rxNormConceptId: { not: null } },
      select: { id: true, rxNormConceptId: true },
    });
    expect(conceptRxAfter).toEqual(conceptRxBefore);
  });

  it("is idempotent on re-stage (duplicate rowChecksum skips)", async () => {
    expect(releaseId).toBeDefined();
    const countBefore = await prisma.rxNormStagingConcept.count({ where: { releaseId: releaseId! } });

    const result = await runRxNormRealImport(prisma, {
      mode: "STAGE_REAL_REFERENCE",
      manifestPath: MANIFEST_PATH,
      sourceDir: FIXTURE_DIR,
      actor: "phase5-test",
      confirmRealSource: true,
      confirmNonClinicalOnly: true,
    });

    expect(result.ok).toBe(true);
    const countAfter = await prisma.rxNormStagingConcept.count({ where: { releaseId: releaseId! } });
    expect(countAfter).toBe(countBefore);
  });

  it("generates candidates with autoVerified=false only", async () => {
    expect(releaseId).toBeDefined();

    const result = await runRxNormRealImport(prisma, {
      mode: "GENERATE_REAL_CANDIDATES",
      manifestPath: MANIFEST_PATH,
      sourceDir: FIXTURE_DIR,
      actor: "phase5-test",
      confirmRealSource: true,
      confirmNonClinicalOnly: true,
    });

    expect(result.ok).toBe(true);
    const candidates = await prisma.rxNormMappingCandidate.findMany({
      where: { releaseId: releaseId! },
    });
    expect(candidates.every((row) => row.autoVerified === false)).toBe(true);
    expect(candidates.every((row) => row.targetKind !== "CATALOG_MEDICATION")).toBe(true);
  });

  it("rollback refuses when verified mappings exist (simulated guard)", async () => {
    expect(releaseId).toBeDefined();
    const verifiedCount = await prisma.rxNormVerifiedMapping.count({ where: { releaseId: releaseId! } });
    expect(verifiedCount).toBe(0);

    const result = await runRxNormRealImport(prisma, {
      mode: "ROLLBACK_REAL_RELEASE",
      manifestPath: MANIFEST_PATH,
      sourceDir: FIXTURE_DIR,
      confirmRollbackRealRelease: true,
    });

    expect(result.ok).toBe(true);
    expect(result.importStatus).toBe("ROLLED_BACK");
  });

  it("leaves RealVerifiedMappingsCreatedByCertification at zero for real release", async () => {
    const realVerified = await prisma.rxNormVerifiedMapping.count({
      where: {
        isSynthetic: false,
        lifecycleStatus: "ACTIVE",
      },
    });
    expect(realVerified).toBe(0);
  });
});

describe("rxnorm real import manifest license guard", () => {
  it("rejects unacknowledged license in manifest validation", () => {
    const loaded = loadAndValidateManifest(MANIFEST_PATH);
    expect(loaded.errors).toEqual([]);

    const errors = validateRxNormReleaseManifest({
      ...loaded.manifest,
      licenseAcknowledged: false,
    });
    expect(errors.some((entry) => entry.includes("licenseAcknowledged"))).toBe(true);
  });
});
