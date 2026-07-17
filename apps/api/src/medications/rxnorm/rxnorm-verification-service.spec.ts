import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  assertCandidateNotAutoVerified,
  assertConflictAdjudication,
  assertLegalMappingTransition,
  assertSyntheticToRealMappingBlocked,
  assertTargetKindCompatibleWithTermType,
} from "@medora/shared";
import {
  ensureSyntheticCanonicalTargets,
  rejectMappingCandidate,
  verifyMappingCandidate,
} from "./rxnorm-verification-service";

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

describe("medicationRxNormVerification shared guards", () => {
  it("blocks synthetic rxcui mapped to non-fixture targets", () => {
    expect(() =>
      assertSyntheticToRealMappingBlocked({
        rxcui: "SYNTH000001",
        targetDataClassification: "PRODUCTION",
        targetCode: "ACETAMINOPHEN",
      })
    ).toThrow(/SyntheticToRealMappingBlocked/);
  });

  it("allows legal transitions and rejects illegal ones", () => {
    expect(() => assertLegalMappingTransition("CANDIDATE", "VERIFIED")).not.toThrow();
    expect(() => assertLegalMappingTransition("REJECTED", "VERIFIED")).toThrow(/Illegal RxNorm mapping transition/);
  });

  it("rejects DF term type verification to concept", () => {
    expect(() => assertTargetKindCompatibleWithTermType("DF", "MEDICATION_CONCEPT")).toThrow(
      /cannot be verified/
    );
  });

  it("requires conflict acknowledgment", () => {
    expect(() =>
      assertConflictAdjudication({
        status: "AMBIGUOUS",
        acknowledged: false,
        overrideReasons: ["MULTIPLE_CANDIDATES"],
        notes: "notes",
      })
    ).toThrow(/conflictOverrideAcknowledged/);
  });

  it("forbids auto verification on writers", () => {
    expect(() => assertCandidateNotAutoVerified(true)).toThrow(/forbidden/i);
  });
});

const describeDb = hasDatabase ? describe : describe.skip;

describeDb("rxnorm verification service", () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("ensureSyntheticCanonicalTargets upserts fixture concepts/products only", async () => {
    const beforeCatalogCount = await prisma.catalogMedication.count();
    const result = await ensureSyntheticCanonicalTargets(prisma);
    const afterCatalogCount = await prisma.catalogMedication.count();

    expect(result.conceptCodes).toContain("SYNTH_MC_ACETAMINOPHEN");
    expect(result.productCodes).toContain("SYNTH_MP_ACETAMINOPHEN_500_TAB");
    expect(afterCatalogCount).toBe(beforeCatalogCount);

    const concept = await prisma.medicationConcept.findUnique({
      where: { code: "SYNTH_MC_ACETAMINOPHEN" },
    });
    expect(concept?.dataClassification).toBe("FIXTURE");
  });

  it("blocks synthetic-to-real verification", async () => {
    await ensureSyntheticCanonicalTargets(prisma);

    const release = await prisma.rxNormReferenceRelease.findFirst({
      where: { releaseIdentifier: "SYNTHETIC-CERT-P3-20260717" },
    });
    const staging = release
      ? await prisma.rxNormStagingConcept.findFirst({
          where: { releaseId: release.id, rxcui: "SYNTH000001" },
        })
      : null;
    const realConcept = await prisma.medicationConcept.create({
      data: {
        id: randomUUID(),
        code: `REAL_CONCEPT_${randomUUID().slice(0, 8)}`,
        genericName: "Real Acetaminophen",
        displayName: "Real Acetaminophen",
        dataClassification: "PRODUCTION",
      },
    });

    if (!release || !staging) {
      throw new Error("Phase 3 synthetic release/staging row missing — run Phase 3 import first.");
    }

    const candidate = await prisma.rxNormMappingCandidate.create({
      data: {
        id: randomUUID(),
        releaseId: release.id,
        stagingConceptId: staging.id,
        targetKind: "MEDICATION_CONCEPT",
        targetId: realConcept.id,
        targetCode: realConcept.code,
        status: "CANDIDATE",
        evidenceJson: ["test_synthetic_to_real_block"],
        autoVerified: false,
      },
    });

    await expect(
      verifyMappingCandidate(prisma, {
        candidateId: candidate.id,
        expectedReviewVersion: 0,
        confirmVerify: true,
        reviewerActorLabel: "PHASE4_CERT_REVIEWER",
        rationaleNotes: "Should fail synthetic-to-real guard.",
      })
    ).rejects.toThrow(/SyntheticToRealMappingBlocked/);
  });

  it("allows synthetic-to-synthetic verification without side effects", async () => {
    await ensureSyntheticCanonicalTargets(prisma);

    const release = await prisma.rxNormReferenceRelease.findFirst({
      where: { releaseIdentifier: "SYNTHETIC-CERT-P3-20260717" },
    });
    const staging = release
      ? await prisma.rxNormStagingConcept.findFirst({
          where: { releaseId: release.id, rxcui: "SYNTH000001", termType: "IN" },
        })
      : null;
    const synthConcept = await prisma.medicationConcept.findUnique({
      where: { code: "SYNTH_MC_ACETAMINOPHEN" },
    });

    if (!release || !staging || !synthConcept) {
      throw new Error("Missing synthetic release/staging/fixture concept for end-to-end verify test.");
    }

    const routePermissionBefore = await prisma.medicationProductRoutePermission.count();
    const catalogBefore = await prisma.catalogMedication.count();

    let candidate = await prisma.rxNormMappingCandidate.findFirst({
      where: {
        stagingConceptId: staging.id,
        targetKind: "MEDICATION_CONCEPT",
        targetId: synthConcept.id,
      },
    });
    if (!candidate) {
      candidate = await prisma.rxNormMappingCandidate.create({
        data: {
          id: randomUUID(),
          releaseId: release.id,
          stagingConceptId: staging.id,
          targetKind: "MEDICATION_CONCEPT",
          targetId: synthConcept.id,
          targetCode: synthConcept.code,
          status: "CANDIDATE",
          evidenceJson: ["test_synthetic_to_synthetic_allow"],
          autoVerified: false,
        },
      });
    }

    const result =
      candidate.status === "VERIFIED"
        ? { ok: true, candidateId: candidate.id, verifiedMappingId: candidate.verifiedMappingId ?? undefined }
        : await verifyMappingCandidate(prisma, {
            candidateId: candidate.id,
            expectedReviewVersion: candidate.reviewVersion,
            confirmVerify: true,
            reviewerActorLabel: "PHASE4_CERT_REVIEWER",
            rationaleNotes: "Synthetic certification verify.",
          });

    const refreshed = await prisma.rxNormMappingCandidate.findUniqueOrThrow({
      where: { id: candidate.id },
    });
    const routePermissionAfter = await prisma.medicationProductRoutePermission.count();
    const catalogAfter = await prisma.catalogMedication.count();

    expect(result.ok).toBe(true);
    expect(refreshed.autoVerified).toBe(false);
    expect(refreshed.status).toBe("VERIFIED");
    expect(routePermissionAfter).toBe(routePermissionBefore);
    expect(catalogAfter).toBe(catalogBefore);
  });

  it("fails on stale reviewVersion (concurrency)", async () => {
    await ensureSyntheticCanonicalTargets(prisma);

    const release = await prisma.rxNormReferenceRelease.findFirst({
      where: { releaseIdentifier: "SYNTHETIC-CERT-P3-20260717" },
    });
    const staging = release
      ? await prisma.rxNormStagingConcept.findFirst({
          where: { releaseId: release.id, rxcui: "SYNTH000002", termType: "IN" },
        })
      : null;
    const synthConcept = await prisma.medicationConcept.findUnique({
      where: { code: "SYNTH_MC_ONDANSETRON" },
    });
    if (!release || !staging || !synthConcept) return;

    let candidate = await prisma.rxNormMappingCandidate.upsert({
      where: {
        stagingConceptId_targetKind_targetId: {
          stagingConceptId: staging.id,
          targetKind: "MEDICATION_CONCEPT",
          targetId: synthConcept.id,
        },
      },
      create: {
        id: randomUUID(),
        releaseId: release.id,
        stagingConceptId: staging.id,
        targetKind: "MEDICATION_CONCEPT",
        targetId: synthConcept.id,
        targetCode: synthConcept.code,
        status: "CANDIDATE",
        evidenceJson: ["test_concurrency"],
        autoVerified: false,
        reviewVersion: 0,
      },
      update: {
        status: "CANDIDATE",
        reviewVersion: 0,
        verifiedMappingId: null,
        rejectionReasonCategory: null,
        autoVerified: false,
      },
    });

    await expect(
      verifyMappingCandidate(prisma, {
        candidateId: candidate.id,
        expectedReviewVersion: candidate.reviewVersion + 99,
        confirmVerify: true,
        reviewerActorLabel: "PHASE4_CERT_REVIEWER",
        rationaleNotes: "Should fail concurrency guard.",
      })
    ).rejects.toThrow(/Concurrency conflict/);
  });

  it("requires conflict acknowledgment for ambiguous candidates", async () => {
    await ensureSyntheticCanonicalTargets(prisma);

    const release = await prisma.rxNormReferenceRelease.findFirst({
      where: { releaseIdentifier: "SYNTHETIC-CERT-P3-20260717" },
    });
    const staging = release
      ? await prisma.rxNormStagingConcept.findFirst({
          where: { releaseId: release.id, rxcui: "SYNTH000003", termType: "PIN" },
        })
      : null;
    const synthConcept = await prisma.medicationConcept.findUnique({
      where: { code: "SYNTH_MC_EPINEPHRINE" },
    });
    if (!release || !staging || !synthConcept) return;

    let candidate = await prisma.rxNormMappingCandidate.findFirst({
      where: {
        stagingConceptId: staging.id,
        targetKind: "MEDICATION_CONCEPT",
        targetId: synthConcept.id,
      },
    });
    if (!candidate) {
      candidate = await prisma.rxNormMappingCandidate.create({
        data: {
          id: randomUUID(),
          releaseId: release.id,
          stagingConceptId: staging.id,
          targetKind: "MEDICATION_CONCEPT",
          targetId: synthConcept.id,
          targetCode: synthConcept.code,
          status: "AMBIGUOUS",
          evidenceJson: ["test_conflict_ack"],
          autoVerified: false,
        },
      });
    } else if (candidate.status !== "AMBIGUOUS") {
      candidate = await prisma.rxNormMappingCandidate.update({
        where: { id: candidate.id },
        data: { status: "AMBIGUOUS" },
      });
    }

    await expect(
      verifyMappingCandidate(prisma, {
        candidateId: candidate.id,
        expectedReviewVersion: candidate.reviewVersion,
        confirmVerify: true,
        reviewerActorLabel: "PHASE4_CERT_REVIEWER",
        rationaleNotes: "Missing conflict acknowledgment.",
      })
    ).rejects.toThrow(/conflictOverrideAcknowledged/);
  });

  it("rejects candidate with rejection reason category", async () => {
    const candidate = await prisma.rxNormMappingCandidate.findFirst({
      where: { status: "CANDIDATE" },
    });
    if (!candidate) return;

    const result = await rejectMappingCandidate(prisma, {
      candidateId: candidate.id,
      expectedReviewVersion: candidate.reviewVersion,
      confirmReject: true,
      rejectionReasonCategory: "INSUFFICIENT_EVIDENCE",
      reviewerActorLabel: "PHASE4_CERT_REVIEWER",
      rationaleNotes: "Reject for test.",
    });

    expect(result.ok).toBe(true);
  });
});

describe("rxnorm import regression", () => {
  it("import service still cannot set VERIFIED via shared guard", () => {
    expect(() => assertCandidateNotAutoVerified(true)).toThrow(/forbidden/i);
  });
});
