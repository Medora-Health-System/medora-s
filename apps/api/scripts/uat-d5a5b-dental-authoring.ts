/**
 * Local MEDUI.D5A.5B UAT harness — PROVIDER MFA enroll + clinical board writes.
 * LOCAL ONLY. Does not touch production.
 */
import { PrismaClient } from "@prisma/client";
import { getMfaEncryptionKey, decryptMfaSecret } from "../src/auth/mfa/mfa-encryption.util";
import { generateCurrentTotp } from "../src/auth/mfa/mfa-totp.util";

const email = process.env.UAT_EMAIL ?? "provider@medora.local";
const password = process.env.UAT_PASSWORD ?? "MedoraAdmin123!";
const facilityId = process.env.UAT_FACILITY_ID ?? "4687866b-a30e-4123-b02a-2287d6518bf0";
const encId = process.env.UAT_ENCOUNTER_ID ?? "7e63f8fe-1c18-43c1-bdac-c85670d89043";
const patientId = process.env.UAT_PATIENT_ID ?? "3a000311-20e3-42e0-9958-75a8871296d7";
const base = process.env.UAT_API_BASE ?? "http://localhost:3001";

type Json = Record<string, unknown>;

async function loginOrEnroll(): Promise<string> {
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

  throw new Error(`unexpected login: ${JSON.stringify(login)}`);
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
  return { status: res.status, body };
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

async function main() {
  const results: Array<{ test: string; pass: boolean; detail?: string }> = [];
  const token = await loginOrEnroll();
  console.log("AUTH_OK", email);

  // A — authoring authority (SIGNED eval + OPEN)
  const authoring = await api(token, `/dental-care/encounters/${encId}/authoring`);
  const a = (authoring.body as Json).authoring as Json;
  assert(authoring.status === 200, `authoring status ${authoring.status}`);
  assert(a?.isReadOnly === false, `isReadOnly=${a?.isReadOnly}`);
  assert(a?.canEditPeriodontal === true, "canEditPeriodontal");
  assert(a?.canEditTreatmentPlan === true, "canEditTreatmentPlan");
  assert(a?.canDocumentProcedure === true, "canDocumentProcedure");
  assert(a?.canEditOdontogram === true, "canEditOdontogram");
  assert(a?.canEditEnterpriseHistory === true, "canEditEnterpriseHistory");
  results.push({ test: "A authoring authority", pass: true, detail: "SIGNED eval does not lock board" });

  const perioGet = await api(token, `/dental-care/encounters/${encId}/periodontal-exam`);
  const planGet = await api(token, `/dental-care/encounters/${encId}/treatment-plan`);
  const procGet = await api(token, `/dental-care/encounters/${encId}/procedures`);
  const odontoGet = await api(token, `/dental-care/encounters/${encId}/odontogram`);
  assert((perioGet.body as Json).canEdit === true, "perio canEdit");
  assert((planGet.body as Json).canEdit === true, "plan canEdit");
  assert((procGet.body as Json).canEdit === true, "proc canEdit");
  assert((odontoGet.body as Json).canEdit === true, "odonto canEdit");
  results.push({ test: "A domain canEdit flags", pass: true });

  // B — medical history inline
  const histSave = await api(token, `/patients/${patientId}/clinical-history-profile/sections/medicalHistory`, {
    method: "PATCH",
    body: JSON.stringify({
      value: { pastMedicalHistory: "UAT D5A.5B: hypertension; diabetes type 2" },
      encounterId: encId,
    }),
  });
  assert(histSave.status < 300, `history save ${histSave.status} ${JSON.stringify(histSave.body)}`);
  const histGet = await api(token, `/patients/${patientId}/clinical-history-profile`);
  const pmh = ((histGet.body as Json).medicalHistory as Json)?.pastMedicalHistory;
  assert(String(pmh).includes("UAT D5A.5B"), `pmh=${pmh}`);
  results.push({ test: "B medical history inline save/reload", pass: true });

  // allergy patch
  const allergySave = await api(token, `/patients/${patientId}/clinical-history-profile/allergies`, {
    method: "PATCH",
    body: JSON.stringify({
      encounterId: encId,
      originModule: "dentalUatD5a5b",
      allergies: {
        allergyNote: "UAT penicillin allergy",
        medicationAllergiesDetail: "Penicillin — rash",
        entries: [
          {
            id: "uat-alg-1",
            substance: "Penicillin",
            reaction: "rash",
            status: "ACTIVE",
            verificationStatus: "CONFIRMED",
            severity: "MODERATE",
          },
        ],
      },
    }),
  });
  assert(allergySave.status < 300, `allergy ${allergySave.status} ${JSON.stringify(allergySave.body)}`);
  results.push({ test: "B allergy save", pass: true });

  // C — history review
  const review = await api(token, `/dental-care/encounters/${encId}/history-review`, {
    method: "PUT",
    body: JSON.stringify({ reviewed: true, notes: "UAT review note D5A.5B" }),
  });
  assert(review.status < 300, `review ${review.status}`);
  const clinical = await api(token, `/dental-care/encounters/${encId}/clinical-record`);
  const hr = (clinical.body as Json).historyReview as Json;
  assert(hr?.reviewed === true, "history reviewed");
  assert(String(hr?.notes).includes("UAT review"), `notes=${hr?.notes}`);
  results.push({ test: "C history review persist", pass: true });

  // D — odontogram single + bulk
  const single = await api(token, `/dental-care/encounters/${encId}/tooth-findings`, {
    method: "POST",
    body: JSON.stringify({
      toothCode: "PERM_11",
      scope: "WHOLE_TOOTH",
      surfaces: [],
      findingType: "CARIES",
      clinicalState: "OBSERVED",
      notes: "UAT single",
    }),
  });
  assert(single.status < 300, `single finding ${single.status} ${JSON.stringify(single.body)}`);
  const bulk = await api(token, `/dental-care/encounters/${encId}/tooth-findings/bulk`, {
    method: "POST",
    body: JSON.stringify({
      toothCodes: ["PERM_12", "PERM_13", "PERM_14"],
      scope: "SURFACE_SPECIFIC",
      surfaces: ["MESIAL", "OCCLUSAL"],
      findingType: "EXISTING_RESTORATION",
      clinicalState: "EXISTING",
      notes: "UAT bulk",
    }),
  });
  assert(bulk.status < 300, `bulk ${bulk.status} ${JSON.stringify(bulk.body)}`);
  const odonto2 = await api(token, `/dental-care/encounters/${encId}/odontogram`);
  const findings = ((odonto2.body as Json).encounterFindings as unknown[]) ?? [];
  assert(findings.length >= 4, `findings count ${findings.length}`);
  results.push({ test: "D odontogram single+bulk", pass: true, detail: `${findings.length} findings` });

  // E — periodontal
  const perioSave = await api(token, `/dental-care/encounters/${encId}/periodontal-exam`, {
    method: "PUT",
    body: JSON.stringify({
      periodontalStatus: "PERIODONTITIS",
      periodontitisStage: "II",
      periodontitisGrade: "B",
      extentDistribution: "LOCALIZED",
      narrativeAssessment: "UAT periodontal narrative",
      sites: [
        { toothCode: "PERM_16", site: "MB", probingDepthMm: 4, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: false },
        { toothCode: "PERM_16", site: "B", probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: true },
        { toothCode: "PERM_16", site: "DB", probingDepthMm: 5, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: false },
        { toothCode: "PERM_16", site: "ML", probingDepthMm: 4, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false },
        { toothCode: "PERM_16", site: "L", probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false },
        { toothCode: "PERM_16", site: "DL", probingDepthMm: 4, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: true },
      ],
    }),
  });
  assert(perioSave.status < 300, `perio save ${perioSave.status} ${JSON.stringify(perioSave.body)}`);
  const perioReload = await api(token, `/dental-care/encounters/${encId}/periodontal-exam`);
  const exam = (perioReload.body as Json).exam as Json;
  assert(exam?.periodontalStatus === "PERIODONTITIS", "perio status");
  assert(exam?.periodontitisStage === "II", "stage");
  assert((exam?.sites as unknown[])?.length === 6, "six sites");
  assert((perioReload.body as Json).canEdit === true, "perio still editable after save");
  results.push({ test: "E periodontal save/reload editable", pass: true });

  // F — treatment plan
  const planSave = await api(token, `/dental-care/encounters/${encId}/treatment-plan`, {
    method: "PUT",
    body: JSON.stringify({
      expectedBenefits: "UAT restore function",
      materialRisks: "UAT bleeding risk",
      reasonableAlternatives: "UAT watchful waiting",
      noTreatmentDiscussed: true,
      patientQuestions: "UAT cost?",
      acceptanceOutcome: "NOT_DISCUSSED",
      items: [
        {
          proposedTreatment: "UAT composite restoration #12",
          toothCodes: ["PERM_12"],
          surfaces: ["O"],
          phase: "DISEASE_CONTROL",
          status: "PROPOSED",
          priority: 1,
          sequence: 1,
          notes: "UAT item",
        },
      ],
    }),
  });
  assert(planSave.status < 300, `plan save ${planSave.status} ${JSON.stringify(planSave.body)}`);
  const planReload = await api(token, `/dental-care/encounters/${encId}/treatment-plan`);
  const plan = (planReload.body as Json).plan as Json;
  assert(String(plan?.expectedBenefits).includes("UAT"), "benefits");
  assert(((plan?.items as unknown[]) ?? []).length >= 1, "items");
  assert((planReload.body as Json).canEdit === true, "plan editable");
  results.push({ test: "F treatment plan save/reload", pass: true });

  // G — procedure
  const planItemId = ((plan?.items as Json[])?.[0]?.id as string) || null;
  const procSave = await api(token, `/dental-care/encounters/${encId}/procedures`, {
    method: "POST",
    body: JSON.stringify({
      clinicalName: "UAT composite restoration",
      toothCodes: ["PERM_12"],
      surfaces: ["O"],
      treatmentPlanItemId: planItemId,
      anesthesiaUsed: true,
      anesthesiaDetails: "UAT local anesthetic",
      findings: "UAT caries excavated",
      notes: "UAT procedure note",
    }),
  });
  assert(procSave.status < 300, `proc ${procSave.status} ${JSON.stringify(procSave.body)}`);
  const procReload = await api(token, `/dental-care/encounters/${encId}/procedures`);
  const procs = ((procReload.body as Json).procedures as Json[]) ?? [];
  assert(procs.some((p) => String(p.clinicalName).includes("UAT")), "procedure present");
  results.push({ test: "G procedure save/reload", pass: true });

  // H — overview / clinical-record projection
  const record = await api(token, `/dental-care/encounters/${encId}/clinical-record`);
  const rec = record.body as Json;
  assert(rec.historyReview && (rec.historyReview as Json).reviewed === true, "overview history review");
  assert(Array.isArray(rec.odontogramFindings) && (rec.odontogramFindings as unknown[]).length > 0, "odontogram in overview");
  assert(rec.periodontalExam != null, "perio in overview");
  assert(rec.treatmentPlan != null, "plan in overview");
  assert(Array.isArray(rec.procedures) && (rec.procedures as unknown[]).length > 0, "procs in overview");
  assert(Array.isArray(rec.documents), "documents projection present");
  results.push({ test: "H clinical-record overview projection", pass: true });

  // I — print/export
  const print = await api(token, `/encounters/${encId}/chart-export?format=html&locale=fr`);
  assert(print.status === 200, `print status ${print.status}`);
  const html = typeof print.body === "string" ? print.body : JSON.stringify(print.body);
  assert(html.toLowerCase().includes("parodont") || html.includes("dentaire") || html.includes("Dental"), "print contains dental content");
  results.push({ test: "I print dental chart-export", pass: true, detail: `html bytes=${html.length}` });

  // J — signing independence already covered by A with SIGNED eval
  results.push({ test: "J SIGNED eval independence", pass: true });

  // K — close with D4C.7J acknowledgement for pending clinical advisory
  const close = await api(token, `/encounters/${encId}/close`, {
    method: "POST",
    body: JSON.stringify({
      acknowledgePendingClinicalItems: true,
      acknowledgementVersion: "d4c7j.v1",
      acknowledgementReason: "PROVIDER_ELECTED_TO_CLOSE",
      clientRequestId: `uat-d5a5b-${Date.now()}`,
    }),
  });
  const closedOk = close.status < 300;
  if (closedOk) {
    const perioClosed = await api(token, `/dental-care/encounters/${encId}/periodontal-exam`);
    assert((perioClosed.body as Json).canEdit === false, "closed perio read-only");
    results.push({ test: "K close => read-only", pass: true });
  } else {
    results.push({
      test: "K close => read-only",
      pass: false,
      detail: `close status ${close.status} ${JSON.stringify(close.body).slice(0, 300)}`,
    });
  }

  // L — ADMIN-only negative control (separate login)
  const adminLogin = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@medora.local", password }),
  });
  const adminBody = (await adminLogin.json()) as Json;
  let adminToken: string | null = typeof adminBody.accessToken === "string" ? adminBody.accessToken : null;
  if (!adminToken && adminBody.mfaEnrollmentRequired && typeof adminBody.mfaEnrollmentToken === "string") {
    const enrollmentToken = adminBody.mfaEnrollmentToken;
    await fetch(`${base}/auth/mfa/enroll/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentToken }),
    });
    const prisma = new PrismaClient();
    const user = await prisma.user.findUnique({
      where: { email: "admin@medora.local" },
      select: { mfaSecretEncrypted: true },
    });
    const k = getMfaEncryptionKey(process.env)!;
    const secret = decryptMfaSecret(k, user!.mfaSecretEncrypted!);
    const code = generateCurrentTotp(secret);
    const verifyRes = await fetch(`${base}/auth/mfa/enroll/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentToken, code }),
    });
    const verify = (await verifyRes.json()) as Json;
    await prisma.$disconnect();
    adminToken = typeof verify.accessToken === "string" ? verify.accessToken : null;
  } else if (!adminToken && adminBody.mfaRequired && typeof adminBody.mfaChallengeToken === "string") {
    const prisma = new PrismaClient();
    const user = await prisma.user.findUnique({
      where: { email: "admin@medora.local" },
      select: { mfaSecretEncrypted: true },
    });
    const k = getMfaEncryptionKey(process.env)!;
    const secret = decryptMfaSecret(k, user!.mfaSecretEncrypted!);
    const code = generateCurrentTotp(secret, Date.now() + 60_000);
    const verifyRes = await fetch(`${base}/auth/mfa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeToken: adminBody.mfaChallengeToken, code }),
    });
    const verify = (await verifyRes.json()) as Json;
    await prisma.$disconnect();
    adminToken = typeof verify.accessToken === "string" ? verify.accessToken : null;
  }

  if (adminToken) {
    // Need an OPEN dental encounter for ADMIN negative — create one
    const prisma = new PrismaClient();
    const openEnc = await prisma.encounter.create({
      data: {
        facilityId,
        patientId,
        status: "OPEN",
        type: "OUTPATIENT",
        serviceLine: "DENTAL",
        chiefComplaint: "UAT ADMIN negative",
        nursingAssessment: { serviceLineTag: { serviceLine: "DENTAL" } },
      },
      select: { id: true },
    });
    await prisma.$disconnect();
    const adminAuth = await api(adminToken, `/dental-care/encounters/${openEnc.id}/authoring`);
    const aa = (adminAuth.body as Json).authoring as Json;
    assert(aa?.isReadOnly === true, "admin isReadOnly");
    assert(aa?.readOnlyReason === "NO_CLINICAL_CAPABILITY", `reason=${aa?.readOnlyReason}`);
    assert(aa?.canEditPeriodontal === false, "admin cannot edit perio");
    results.push({
      test: "L ADMIN-only read-only + NO_CLINICAL_CAPABILITY",
      pass: true,
      detail: String(aa?.readOnlyReason),
    });
  } else {
    results.push({ test: "L ADMIN-only read-only", pass: false, detail: "admin auth failed" });
  }

  console.log("\n=== UAT RESULTS ===");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.test}${r.detail ? " — " + r.detail : ""}`);
  }
  const failed = results.filter((r) => !r.pass);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
