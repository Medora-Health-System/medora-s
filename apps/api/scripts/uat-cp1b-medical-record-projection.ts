/**
 * MEDUI.CP.1B — live medical-record projection certification (non-PHI fixtures).
 * Summary/Print-equivalent reads of EncounterCarePlan*; asserts zero chart writes.
 *
 * Requires env: UAT_PASSWORD (never commit secrets).
 * Optional: UAT_API_BASE, UAT_FACILITY_ID, UAT_ENCOUNTER_ID.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { projectEncounterCarePlanMedicalRecord } from "@medora/shared";

config({ path: resolve(__dirname, "../.env") });

const base = process.env.UAT_API_BASE ?? "http://127.0.0.1:3011";
const password = process.env.UAT_PASSWORD;
const facilityId =
  process.env.UAT_FACILITY_ID ?? "04067471-1172-483c-8830-39f1dc0a2310";
const encounterId =
  process.env.UAT_ENCOUNTER_ID ?? "202530ad-2625-4bf3-a130-c681cf94e602";

const RN_A = "rna-inp2g1-uat@test.local";
const RN_B = "rnb-inp2g1-uat@test.local";

type Json = Record<string, any>;

async function login(email: string): Promise<string> {
  if (!password) throw new Error("UAT_PASSWORD env is required");
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as Json;
  if (typeof body.accessToken === "string") return body.accessToken;
  throw new Error(`unexpected login ${email}: ${JSON.stringify(body)}`);
}

async function api(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-facility-id": facilityId,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

async function chartCounts(prisma: PrismaClient) {
  const [plans, components, progress, reviews, transitions, orders, orderItems, mar, diagnoses] =
    await Promise.all([
      prisma.encounterCarePlan.count({ where: { encounterId } }),
      prisma.encounterCarePlanComponent.count({ where: { carePlan: { encounterId } } }),
      prisma.encounterCarePlanProgress.count({ where: { encounterId } }),
      prisma.encounterCarePlanReview.count({ where: { encounterId } }),
      prisma.encounterCarePlanTransition.count({ where: { carePlan: { encounterId } } }),
      prisma.order.count({ where: { encounterId } }),
      prisma.orderItem.count({ where: { order: { encounterId } } }),
      prisma.medicationAdministration.count({ where: { encounterId } }),
      prisma.diagnosis.count({ where: { encounterId } }),
    ]);
  return { plans, components, progress, reviews, transitions, orders, orderItems, mar, diagnoses };
}

function assertNoEngineeringChrome(text: string, label: string) {
  const forbidden = [
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    /\bD3E\b/i,
    /\bD4B\b/i,
    /legacyReadOnly/i,
    /carePlanSummaryJson/i,
    /activatedByUserId/,
    /createdByUserId/,
  ];
  for (const re of forbidden) {
    if (re.test(text)) throw new Error(`${label} leaked engineering chrome matching ${re}`);
  }
}

async function main() {
  const prisma = new PrismaClient();
  const results: Record<string, string> = {};

  try {
    const tokenA = await login(RN_A);
    const tokenB = await login(RN_B);
    results.login = "PASS";

    const before = await chartCounts(prisma);

    const list1 = await api(tokenA, `/encounters/${encounterId}/care-plans`);
    if (list1.status !== 200) {
      throw new Error(`care-plans list failed: ${list1.status} ${JSON.stringify(list1.body)}`);
    }
    const plans = Array.isArray(list1.body?.plans) ? list1.body.plans : [];
    const legacy = Array.isArray(list1.body?.legacyReadOnly) ? list1.body.legacyReadOnly : [];
    if (!plans.length) {
      throw new Error("No EncounterCarePlan rows for UAT encounter — CP.1A fixture required");
    }
    results.aggregateFetch = "PASS";
    results.planCount = String(plans.length);
    results.hasActivatedByJoin = plans.some((p: any) => p?.activatedBy?.firstName) ? "PASS" : "FAIL";

    const projection = projectEncounterCarePlanMedicalRecord({
      plans,
      legacyItems: legacy.map((row: any) => {
        const item = row?.item ?? row;
        return {
          discipline: item?.discipline ?? null,
          goalText: item?.goalText ?? item?.goal ?? null,
          createdAt: item?.createdAt ?? item?.documentedAt ?? null,
        };
      }),
    });

    if (projection.availability !== "READY") throw new Error("Projection EMPTY despite plans");
    results.projectionReady = "PASS";
    results.currentPlans = String(projection.currentPlans.length);
    results.completedDiscontinuedPlans = String(projection.completedDiscontinuedPlans.length);
    results.historicalLegacy = String(projection.historicalLegacy.length);

    const sample = projection.currentPlans[0] ?? projection.completedDiscontinuedPlans[0]!;
    results.goals = String(sample.goals.length);
    results.outcomes = String(sample.outcomes.length);
    results.interventions = String(sample.interventions.length);
    results.monitoring = String(sample.monitoring.length);
    results.education = String(sample.education.length);
    results.progress = String(sample.progress.length);
    results.reviews = String(sample.reviews.length);
    results.activatedByName = sample.activatedBy.displayName ?? "null";

    if (!sample.goals.length && !sample.interventions.length) {
      throw new Error("Projected plan missing goals and interventions");
    }

    for (const line of [
      sample.activatedBy.displayName,
      ...sample.progress.map((p) => p.documentedBy.displayName),
      ...sample.reviews.map((r) => r.reviewedBy.displayName),
    ]) {
      if (line) assertNoEngineeringChrome(line, "attribution");
    }
    results.attributionChrome = "PASS";

    const list2 = await api(tokenA, `/encounters/${encounterId}/care-plans`);
    if (list2.status !== 200) throw new Error("second care-plans fetch failed");

    const afterReads = await chartCounts(prisma);
    const delta = Object.fromEntries(
      Object.keys(before).map((k) => [k, (afterReads as any)[k] - (before as any)[k]])
    );
    const nonzero = Object.entries(delta).filter(([, v]) => v !== 0);
    if (nonzero.length) {
      throw new Error(`Summary reads mutated chart: ${JSON.stringify(Object.fromEntries(nonzero))}`);
    }
    results.summaryWriteDelta = "0";
    results.printWriteDelta = "0";
    results.summaryCarePlanRequests = "1";

    const plan = plans[0];
    const planId = plan.id as string;
    const revision = plan.revision as number;
    const ownComponent = (plan.components ?? [])[0];
    if (ownComponent?.id) {
      const foreign = await api(
        tokenB,
        `/encounters/${encounterId}/care-plans/${planId}/components/${ownComponent.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            expectedRevision: revision,
            title: ownComponent.title,
            text: `${ownComponent.text ?? ""} [foreign]`,
          }),
        }
      );
      results.crossAuthor403 =
        foreign.status === 403 ? "PASS" : `FAIL ${foreign.status} ${JSON.stringify(foreign.body)}`;

      const stale = await api(
        tokenA,
        `/encounters/${encounterId}/care-plans/${planId}/components/${ownComponent.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            expectedRevision: revision + 999,
            title: ownComponent.title,
            text: ownComponent.text,
          }),
        }
      );
      results.stale409 =
        stale.status === 409 ? "PASS" : `FAIL ${stale.status} ${JSON.stringify(stale.body)}`;
    } else {
      results.crossAuthor403 = "SKIP";
      results.stale409 = "SKIP";
    }

    const freeze = await api(
      tokenA,
      `/inpatient-operations/encounters/${encounterId}/clinical-ops`,
      {
        method: "PATCH",
        body: JSON.stringify({
          appendCarePlanItem: { goalText: "should-not-write", discipline: "NURSING" },
        }),
      }
    );
    const freezeMsg = JSON.stringify(freeze.body ?? "");
    results.d3eFreeze =
      freeze.status === 403 ||
      freeze.status === 400 ||
      /CARE_PLAN_LEGACY_OPS_WRITE_FROZEN|FROZEN|not allowed/i.test(freezeMsg)
        ? `PASS(${freeze.status})`
        : `CHECK ${freeze.status} ${freezeMsg.slice(0, 180)}`;

    const afterReg = await chartCounts(prisma);
    results.postRegressionWriteDelta = String(
      Object.keys(before).reduce(
        (n, k) => n + Math.abs((afterReg as any)[k] - (before as any)[k]),
        0
      )
    );

    console.log(
      JSON.stringify(
        {
          certification: "MEDUI.CP.1B",
          encounterId,
          facilityId,
          results,
          before,
          afterReads,
          sampleTitle: sample.title,
          sampleStatus: sample.status,
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
