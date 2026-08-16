/**
 * Local MEDUI.D5A.5C UAT — Facility ADMIN clinical authoring + platform negative.
 * LOCAL ONLY. Does not touch production.
 */
import { PrismaClient } from "@prisma/client";
import {
  resolveEnterpriseDentalEncounterAuthoring,
  resolveFacilityClinicalAuthoringAuthority,
} from "@medora/shared";
import { getMfaEncryptionKey, decryptMfaSecret } from "../src/auth/mfa/mfa-encryption.util";
import { generateCurrentTotp } from "../src/auth/mfa/mfa-totp.util";

const adminEmail = process.env.UAT_ADMIN_EMAIL ?? "admin@medora.local";
const providerEmail = process.env.UAT_PROVIDER_EMAIL ?? "provider@medora.local";
const password = process.env.UAT_PASSWORD ?? "MedoraAdmin123!";
const facilityId = process.env.UAT_FACILITY_ID ?? "4687866b-a30e-4123-b02a-2287d6518bf0";
const patientId = process.env.UAT_PATIENT_ID ?? "3a000311-20e3-42e0-9958-75a8871296d7";
const base = process.env.UAT_API_BASE ?? "http://localhost:3001";

type Json = Record<string, unknown>;

async function loginOrEnroll(email: string): Promise<string> {
  const loginRes = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const login = (await loginRes.json()) as Json;
  if (typeof login.accessToken === "string") return login.accessToken;

  if (login.mfaEnrollmentRequired && typeof login.mfaEnrollmentToken === "string") {
    const enrollmentToken = login.mfaEnrollmentToken;
    const initRes = await fetch(`${base}/auth/mfa/enroll/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentToken }),
    });
    if (!initRes.ok) throw new Error(`enroll init ${initRes.status} ${await initRes.text()}`);
    const prisma = new PrismaClient();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { mfaSecretEncrypted: true },
    });
    const k = getMfaEncryptionKey(process.env);
    if (!k || !user?.mfaSecretEncrypted) throw new Error("missing mfa key/secret");
    const secret = decryptMfaSecret(k, user.mfaSecretEncrypted);
    const code = generateCurrentTotp(secret);
    const verifyRes = await fetch(`${base}/auth/mfa/enroll/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentToken, code }),
    });
    const verify = (await verifyRes.json()) as Json;
    await prisma.$disconnect();
    if (typeof verify.accessToken !== "string") throw new Error(JSON.stringify(verify));
    return verify.accessToken;
  }

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

async function api(token: string, path: string, init: RequestInit = {}, fid = facilityId) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-facility-id": fid,
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
  return { status: res.status, body };
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

async function ensureOpenDentalEncounter(): Promise<string> {
  if (process.env.UAT_ENCOUNTER_ID) return process.env.UAT_ENCOUNTER_ID;
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.encounter.findFirst({
      where: { facilityId, patientId, serviceLine: "DENTAL", status: "OPEN" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await prisma.encounter.create({
      data: {
        facilityId,
        patientId,
        status: "OPEN",
        type: "OUTPATIENT",
        serviceLine: "DENTAL",
        chiefComplaint: "UAT D5A.5C facility admin",
        nursingAssessment: { serviceLineTag: { serviceLine: "DENTAL" } },
      },
      select: { id: true },
    });
    return created.id;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const results: Array<{ test: string; pass: boolean; detail?: string }> = [];
  const encId = await ensureOpenDentalEncounter();
  console.log("ENCOUNTER", encId);

  const platformOnly = resolveFacilityClinicalAuthoringAuthority({
    roleCodes: ["MEDORA_SUPER_ADMIN"],
    moduleEnabled: true,
    encounterStatus: "OPEN",
  });
  assert(platformOnly.allowed === false, "platform-only must deny");
  const platformDental = resolveEnterpriseDentalEncounterAuthoring({
    roleCodes: ["MEDORA_SUPER_ADMIN"],
    dentalCareEnabled: true,
    encounterStatus: "OPEN",
    serviceLine: "DENTAL",
  });
  assert(platformDental.isReadOnly === true, "platform dental read-only");
  results.push({ test: "4 PLATFORM_ADMIN only DENY", pass: true });

  const adminToken = await loginOrEnroll(adminEmail);
  console.log("AUTH_OK", adminEmail);

  const authoring = await api(adminToken, `/dental-care/encounters/${encId}/authoring`);
  const a = (authoring.body as Json).authoring as Json;
  assert(authoring.status === 200, `admin authoring status ${authoring.status} ${JSON.stringify(authoring.body)}`);
  assert(a?.isReadOnly === false, `admin isReadOnly=${a?.isReadOnly} reason=${a?.readOnlyReason}`);
  assert(a?.canEditPeriodontal === true, "admin canEditPeriodontal");
  assert(a?.canEditTreatmentPlan === true, "admin canEditTreatmentPlan");
  assert(a?.canDocumentProcedure === true, "admin canDocumentProcedure");
  assert(a?.canEditOdontogram === true, "admin canEditOdontogram");
  assert(a?.canEditEnterpriseHistory === true, "admin canEditEnterpriseHistory");
  assert(a?.canEditClinicalEvaluation === true, "admin canEditClinicalEvaluation");
  results.push({ test: "2 FACILITY_ADMIN authoring WRITE", pass: true });

  const finding = await api(adminToken, `/dental-care/encounters/${encId}/tooth-findings`, {
    method: "POST",
    body: JSON.stringify({
      toothCode: "PERM_21",
      scope: "WHOLE_TOOTH",
      surfaces: [],
      findingType: "CARIES",
      clinicalState: "OBSERVED",
      notes: "D5A.5C facility admin UAT",
    }),
  });
  assert(finding.status < 300, `finding ${finding.status} ${JSON.stringify(finding.body)}`);
  results.push({ test: "11 admin odontogram WRITE", pass: true });

  const perio = await api(adminToken, `/dental-care/encounters/${encId}/periodontal-exam`, {
    method: "PUT",
    body: JSON.stringify({
      periodontalStatus: "GINGIVITIS",
      narrativeAssessment: "D5A.5C admin perio UAT",
      sites: [
        {
          toothCode: "PERM_21",
          site: "B",
          probingDepthMm: 3,
          gingivalMarginMm: 0,
          bleedingOnProbing: false,
          plaque: false,
        },
      ],
    }),
  });
  assert(perio.status < 300, `perio ${perio.status} ${JSON.stringify(perio.body)}`);
  results.push({ test: "12 admin periodontal WRITE", pass: true });

  const plan = await api(adminToken, `/dental-care/encounters/${encId}/treatment-plan`, {
    method: "PUT",
    body: JSON.stringify({
      expectedBenefits: "D5A.5C admin plan UAT",
      materialRisks: "bleeding",
      reasonableAlternatives: "observe",
      noTreatmentDiscussed: true,
      acceptanceOutcome: "NOT_DISCUSSED",
      items: [
        {
          proposedTreatment: "D5A.5C exam",
          toothCodes: ["PERM_21"],
          surfaces: [],
          phase: "DISEASE_CONTROL",
          status: "PROPOSED",
          priority: 1,
          sequence: 1,
        },
      ],
    }),
  });
  assert(plan.status < 300, `plan ${plan.status} ${JSON.stringify(plan.body)}`);
  results.push({ test: "14 admin treatment plan WRITE", pass: true });

  const planBody = (await api(adminToken, `/dental-care/encounters/${encId}/treatment-plan`)).body as Json;
  const planItemId = ((((planBody.plan as Json)?.items as Json[]) ?? [])[0]?.id as string) || null;
  const proc = await api(adminToken, `/dental-care/encounters/${encId}/procedures`, {
    method: "POST",
    body: JSON.stringify({
      clinicalName: "D5A.5C admin procedure UAT",
      toothCodes: ["PERM_21"],
      surfaces: [],
      treatmentPlanItemId: planItemId,
      notes: "D5A.5C procedure",
    }),
  });
  assert(proc.status < 300, `proc ${proc.status} ${JSON.stringify(proc.body)}`);
  results.push({ test: "15 admin procedure WRITE", pass: true });

  const hist = await api(adminToken, `/patients/${patientId}/clinical-history-profile/sections/medicalHistory`, {
    method: "PATCH",
    body: JSON.stringify({
      value: { pastMedicalHistory: "D5A.5C admin history UAT" },
      encounterId: encId,
    }),
  });
  assert(hist.status < 300, `history ${hist.status} ${JSON.stringify(hist.body)}`);
  results.push({ test: "16 admin enterprise history WRITE", pass: true });

  const foreign = await api(
    adminToken,
    `/dental-care/encounters/${encId}/authoring`,
    {},
    "00000000-0000-0000-0000-000000000099"
  );
  assert(foreign.status === 403 || foreign.status === 401, `cross-facility expected deny got ${foreign.status}`);
  results.push({ test: "5 cross-facility DENY", pass: true, detail: `status=${foreign.status}` });

  const providerToken = await loginOrEnroll(providerEmail);
  const pAuth = await api(providerToken, `/dental-care/encounters/${encId}/authoring`);
  const pa = (pAuth.body as Json).authoring as Json;
  assert(pAuth.status === 200 && pa?.isReadOnly === false, "provider still writes");
  results.push({ test: "1+18 PROVIDER WRITE unchanged", pass: true });

  const prisma = new PrismaClient();
  try {
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } });
    const recent = await prisma.toothFinding.findFirst({
      where: { encounterId: encId, notes: { contains: "D5A.5C facility admin UAT" } },
      orderBy: { createdAt: "desc" },
      select: { documentedByUserId: true, facilityId: true, encounterId: true },
    });
    assert(!!recent && !!adminUser, "finding row for audit");
    assert(recent!.documentedByUserId === adminUser!.id, "audit documentedByUserId");
    assert(recent!.facilityId === facilityId, "audit facilityId");
    assert(recent!.encounterId === encId, "audit encounterId");
    results.push({ test: "17 audit attribution", pass: true });
  } finally {
    await prisma.$disconnect();
  }

  console.log(JSON.stringify({ certificationId: "MEDUI.D5A.5C", encounterId: encId, results }, null, 2));
  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.error("UAT_FAILED", failed);
    process.exit(1);
  }
  console.log("UAT_PASS", results.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
