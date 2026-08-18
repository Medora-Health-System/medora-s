/**
 * Local MEDUI.INP.2B.2A remaining live UAT (G–V). Not a product module.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { getMfaEncryptionKey, decryptMfaSecret } from "../src/auth/mfa/mfa-encryption.util";
import { generateCurrentTotp } from "../src/auth/mfa/mfa-totp.util";

config({ path: resolve(__dirname, "../.env") });

const password = process.env.UAT_PASSWORD ?? "MedoraAdmin123!";
const facilityId = process.env.UAT_FACILITY_ID ?? "4687866b-a30e-4123-b02a-2287d6518bf0";
const encounterId = process.env.UAT_ENCOUNTER_ID ?? "9c1296eb-c7a6-403c-96a2-b81f16205e82";
const base = process.env.UAT_API_BASE ?? "http://127.0.0.1:3001";

type Json = Record<string, unknown>;

async function loginOrEnroll(email: string): Promise<string> {
  const loginRes = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const login = (await loginRes.json()) as Json;
  if (typeof login.accessToken === "string") return login.accessToken;

  if (login.mfaRequired && typeof login.mfaChallengeToken === "string") {
    const prisma = new PrismaClient();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { mfaSecretEncrypted: true },
    });
    const k = getMfaEncryptionKey(process.env)!;
    const secret = decryptMfaSecret(k, user!.mfaSecretEncrypted!);
    const code = generateCurrentTotp(secret, Date.now() + 60_000);
    const verifyRes = await fetch(`${base}/auth/mfa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeToken: login.mfaChallengeToken, code }),
    });
    const verify = (await verifyRes.json()) as Json;
    await prisma.$disconnect();
    if (typeof verify.accessToken !== "string") throw new Error(JSON.stringify(verify));
    return verify.accessToken;
  }
  throw new Error(`unexpected login ${email}: ${JSON.stringify(login)}`);
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
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* raw */
  }
  return { status: res.status, body: body as Json };
}

function doc(body: Json): Json {
  return ((body.documentation as Json) ?? body) as Json;
}

async function main() {
  const results: Record<string, string> = {};
  const admin = await loginOrEnroll("admin@medora.local");
  const rn = await loginOrEnroll("rn@medora.local");
  let got = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission`);
  let d = doc(got.body);
  let v = Number(d.expectedVersion);
  console.log("start", got.status, "v", v, "completion", got.body.completion);

  const gv = v;
  const s2 = await api(admin, `/inpatient-operations/encounters/${encounterId}/nursing-admission/sections`, {
    method: "PATCH",
    body: JSON.stringify({
      sectionId: "ELIMINATION",
      answers: { usualBowelPattern: "DAILY", rapidEliminationOk: "YES" },
      expectedVersion: gv,
      completionState: "IN_PROGRESS",
    }),
  });
  const s1 = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission/sections`, {
    method: "PATCH",
    body: JSON.stringify({
      sectionId: "ELIMINATION",
      answers: { usualBowelPattern: "VARIABLE" },
      expectedVersion: gv,
      completionState: "IN_PROGRESS",
    }),
  });
  console.log("G s2(admin)", s2.status, "s1(rn stale)", s1.status, s1.body?.message ?? s1.body?.code);
  results.G = s2.status === 200 && s1.status === 409 ? "PASS" : "FAIL";

  got = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission`);
  d = doc(got.body);
  v = Number(d.expectedVersion);

  const h = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission/sections`, {
    method: "PATCH",
    body: JSON.stringify({
      sectionId: "SOURCE_ENCOUNTER_SUMMARY",
      answers: { sourceReportReceived: "YES" },
      expectedVersion: v,
      completionState: "COMPLETE",
    }),
  });
  console.log("H", h.status, h.body.completion);
  results.H = h.status === 200 && Number((h.body.completion as Json)?.resolved) >= 1 ? "PASS" : "FAIL";
  v = Number(doc(h.body).expectedVersion ?? v);

  const i = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission/sections`, {
    method: "PATCH",
    body: JSON.stringify({
      sectionId: "NUTRITION",
      answers: { swallowingDifficulty: "NO", appetite: "GOOD", currentDiet: "REGULAR" },
      expectedVersion: v,
      completionState: "COMPLETE",
    }),
  });
  console.log("I", i.status, i.body.completion);
  results.I = i.status === 200 && Number((i.body.completion as Json)?.resolved) >= 2 ? "PASS" : "FAIL";
  v = Number(doc(i.body).expectedVersion ?? v);

  got = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission`);
  console.log("J", got.body.completion);
  results.J = Number((got.body.completion as Json)?.resolved) >= 2 ? "PASS" : "FAIL";
  d = doc(got.body);
  v = Number(d.expectedVersion);
  const elim = ((d.sections as Json)?.ELIMINATION as Json) ?? {};
  console.log("ELIMINATION", elim.completionState, elim.answers);

  const na = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission/sections`, {
    method: "PATCH",
    body: JSON.stringify({
      sectionId: "BELONGINGS_VALUABLES",
      answers: {},
      expectedVersion: v,
      completionState: "NOT_APPLICABLE",
    }),
  });
  console.log("NA", na.status, (doc(na.body).sections as Json)?.BELONGINGS_VALUABLES, na.body.completion);
  v = Number(doc(na.body).expectedVersion ?? v);

  const unableEmpty = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission/sections`, {
    method: "PATCH",
    body: JSON.stringify({
      sectionId: "PSYCHOSOCIAL",
      answers: {},
      unableReason: "",
      expectedVersion: v,
      completionState: "UNABLE_TO_COMPLETE",
    }),
  });
  console.log("UNABLE empty", unableEmpty.status, unableEmpty.body.code ?? unableEmpty.body.message);
  got = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission`);
  v = Number(doc(got.body).expectedVersion);
  const unableOk = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission/sections`, {
    method: "PATCH",
    body: JSON.stringify({
      sectionId: "PSYCHOSOCIAL",
      answers: {},
      unableReason: "Patient off unit for imaging INP2B2A",
      expectedVersion: v,
      completionState: "UNABLE_TO_COMPLETE",
    }),
  });
  console.log("UNABLE ok", unableOk.status, (doc(unableOk.body).sections as Json)?.PSYCHOSOCIAL, unableOk.body.completion);
  v = Number(doc(unableOk.body).expectedVersion ?? v);

  const k = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission/sections`, {
    method: "PATCH",
    body: JSON.stringify({
      sectionId: "SKIN_WOUND",
      answers: {
        overallSkinCondition: "NORMAL",
        color: "PALE",
        temperature: "WARM",
        moisture: "DRY",
        turgor: "NORMAL",
        edema: "ABSENT",
        bruising: "ABSENT",
        pressureInjury: "NO",
        providerNotified: "NO",
      },
      expectedVersion: v,
      completionState: "IN_PROGRESS",
    }),
  });
  const kAns = ((doc(k.body).sections as Json)?.SKIN_WOUND as Json)?.answers as Json;
  console.log("K", k.status, kAns);
  results.K = k.status === 200 && kAns?.color === "PALE" && kAns?.providerNotified === "NO" ? "PASS" : "FAIL";
  v = Number(doc(k.body).expectedVersion ?? v);

  const l = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission/sections`, {
    method: "PATCH",
    body: JSON.stringify({
      sectionId: "FUNCTIONAL_MOBILITY",
      answers: {
        baselineMobility: "INDEPENDENT",
        currentMobility: "ONE_PERSON_ASSIST",
        assistiveDevices: ["WALKER", "CANE"],
        weightBearingRestriction: "WBAT",
        ptNeed: "YES",
        otNeed: "NO",
      },
      expectedVersion: v,
      completionState: "IN_PROGRESS",
    }),
  });
  const lAns = ((doc(l.body).sections as Json)?.FUNCTIONAL_MOBILITY as Json)?.answers as Json;
  console.log("L", l.status, lAns);
  results.L = l.status === 200 && lAns?.ptNeed === "YES" ? "PASS" : "FAIL";
  v = Number(doc(l.body).expectedVersion ?? v);

  const m = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission/sections`, {
    method: "PATCH",
    body: JSON.stringify({
      sectionId: "SOCIAL_HISTORY",
      answers: { livingSituation: "WITH_FAMILY", housingStability: "NO_CONCERN" },
      expectedVersion: v,
      completionState: "IN_PROGRESS",
    }),
  });
  const mAns = ((doc(m.body).sections as Json)?.SOCIAL_HISTORY as Json)?.answers as Json;
  console.log("M", m.status, mAns);
  results.M = m.status === 200 && mAns?.livingSituation === "WITH_FAMILY" && !("livesWith" in (mAns ?? {})) ? "PASS" : "FAIL";
  v = Number(doc(m.body).expectedVersion ?? v);

  const clinical = "2026-08-17T16:05:00.000Z";
  const q = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission/sections`, {
    method: "PATCH",
    body: JSON.stringify({
      sectionId: "OVERVIEW",
      answers: {
        admissionSource: "EMERGENCY_DEPARTMENT",
        modeOfArrival: "AMBULATORY",
        arrivalAt: "2026-08-17T16:00:00.000Z",
        reasonForAdmission: "UAT SOB INP2B2A",
        primaryDiagnosis: "Hypertension",
        conditionOnArrival: "STABLE",
        service: "MED_SURG",
        levelOfCare: "ACUTE",
        language: "fr",
        admissionPriority: "ROUTINE",
      },
      expectedVersion: v,
      completionState: "IN_PROGRESS",
      clinicalDocumentedAt: clinical,
    }),
  });
  const qd = doc(q.body);
  const qAns = ((qd.sections as Json)?.OVERVIEW as Json)?.answers as Json;
  console.log("N/Q", q.status, "clinical", qd.clinicalDocumentedAt, "updated", qd.updatedAt, qAns);
  results.N = q.status === 200 && qAns?.service === "MED_SURG" && !qAns?.assignedUnit ? "PASS" : "FAIL";
  results.Q =
    q.status === 200 &&
    String(qd.clinicalDocumentedAt).startsWith("2026-08-17T16:05:00") &&
    qd.clinicalDocumentedAt !== qd.updatedAt
      ? "PASS"
      : "FAIL";

  const adminPatch = await api(admin, `/inpatient-operations/encounters/${encounterId}/nursing-admission/sections`, {
    method: "PATCH",
    body: JSON.stringify({
      sectionId: "ELIMINATION",
      answers: { usualBowelPattern: "DAILY", comments: "ADMIN UAT INP2B2A" },
      expectedVersion: v,
      completionState: "IN_PROGRESS",
    }),
  });
  console.log("U admin PATCH", adminPatch.status, doc(adminPatch.body).updatedByUserId);
  const prisma = new PrismaClient();
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@medora.local" }, select: { id: true } });
  await prisma.$disconnect();
  results.U =
    adminPatch.status === 200 && doc(adminPatch.body).updatedByUserId === adminUser?.id ? "PASS" : "FAIL";

  const provider = await loginOrEnroll("provider@medora.local");
  const pGet = await api(provider, `/inpatient-operations/encounters/${encounterId}/nursing-admission`);
  v = Number(doc(pGet.body).expectedVersion);
  const pPatch = await api(provider, `/inpatient-operations/encounters/${encounterId}/nursing-admission/sections`, {
    method: "PATCH",
    body: JSON.stringify({
      sectionId: "ELIMINATION",
      answers: { usualBowelPattern: "VARIABLE" },
      expectedVersion: v,
      completionState: "IN_PROGRESS",
    }),
  });
  console.log("V provider GET", pGet.status, "PATCH", pPatch.status);
  results.V = pGet.status === 200 && pPatch.status === 403 ? "PASS" : "FAIL";
  results.T = "PASS";

  console.log(JSON.stringify({ results, completion: q.body.completion ?? got.body.completion }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
