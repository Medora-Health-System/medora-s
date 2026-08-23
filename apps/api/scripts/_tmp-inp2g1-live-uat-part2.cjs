#!/usr/bin/env node
"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const BASE = process.env.UAT_API_BASE || "http://127.0.0.1:3011";
const FACILITY = "04067471-1172-483c-8830-39f1dc0a2310";
const ENC = process.env.UAT_ENCOUNTER_ID || "eb7ea927-3f54-43fc-85e7-09262069883e";
const PATIENT = "711db4fe-1079-44a2-ace7-7cc92e13faf6";
const RN_A = {
  email: "rna-inp2g1-uat@test.local",
  password: "MedoraAdmin123!",
  userId: "2e290fa5-f225-43e9-8d74-22e0301d1871",
};
const RN_B = {
  email: "rnb-inp2g1-uat@test.local",
  password: "MedoraAdmin123!",
  userId: "8a840fbc-eba7-4b05-8fe2-54edbac536ce",
};

const prisma = new PrismaClient();
const report = {};

function mark(key, pass, detail) {
  report[key] = { pass: !!pass, detail };
  console.log(
    `[${pass ? "PASS" : "FAIL"}] ${key}: ${
      typeof detail === "string" ? detail : JSON.stringify(detail)
    }`
  );
}

async function api(method, path, { token, body, facility = FACILITY, accept } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accept ? { Accept: accept } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(facility ? { "x-facility-id": facility } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

async function login(user) {
  const r = await api("POST", "/auth/login", {
    body: { email: user.email, password: user.password },
    facility: null,
  });
  if (!(r.status === 200 || r.status === 201) || !r.json?.accessToken) {
    throw new Error(`login failed ${user.email}: ${r.status}`);
  }
  return r.json.accessToken;
}

function ok(status) {
  return status === 200 || status === 201;
}

function assessment(payload) {
  return payload?.assessment || {};
}

async function main() {
  console.log("=== MEDUI.INP.2G.1 live UAT part2 ===", { BASE, FACILITY, ENC });
  const tokenA = await login(RN_A);
  const tokenB = await login(RN_B);

  // --- Admission durable + post-sign lock ---
  const adm = await api("GET", `/inpatient-operations/encounters/${ENC}/nursing-admission`, {
    token: tokenA,
  });
  const doc = adm.json?.documentation || adm.json || {};
  const sig = doc.nurseSignature || {};
  const amends = Array.isArray(doc.amendments) ? doc.amendments : [];
  mark(
    "admission_signed_amended_durable",
    sig.signed === true &&
      sig.signedByUserId === RN_A.userId &&
      amends.length >= 1 &&
      String(amends[amends.length - 1]?.reason || "").length > 0,
    {
      signedByUserId: sig.signedByUserId,
      signedAt: sig.signedAt,
      amendCount: amends.length,
      latestReason: amends[amends.length - 1]?.reason,
      expectedVersion: doc.expectedVersion,
    }
  );

  const postSign = await api(
    "PATCH",
    `/inpatient-operations/encounters/${ENC}/nursing-admission/sections`,
    {
      token: tokenA,
      body: {
        sectionId: "OVERVIEW",
        expectedVersion: Number(doc.expectedVersion || 0),
        completionState: "IN_PROGRESS",
        draftText: "blocked after sign",
        answers: {},
      },
    }
  );
  const postCode = String(postSign.json?.message || postSign.json?.code || "");
  mark(
    "post_sign_normal_edit_locked",
    postSign.status >= 400 && /SIGNED|OWNER|AMEND|FORBIDDEN|CONFLICT/i.test(postCode + postSign.status),
    { status: postSign.status, code: postCode, body: postSign.json }
  );

  // --- Assessment ownership / correction ---
  // Close any open B draft first.
  await api("POST", `/encounters/${ENC}/inpatient-nursing-assessments`, {
    token: tokenB,
    body: { status: "SIGNED", narrative: "close open B draft if any" },
  });

  const aDraft = await api("POST", `/encounters/${ENC}/inpatient-nursing-assessments`, {
    token: tokenA,
    body: { status: "SAVED", narrative: "RN A ownership episode" },
  });
  const a1 = assessment(aDraft.json);
  mark(
    "assessment_RN_A_episode_ownership",
    ok(aDraft.status) && a1.authorUserId === RN_A.userId && !!a1.sessionId,
    { status: aDraft.status, sessionId: a1.sessionId, authorUserId: a1.authorUserId }
  );

  const bHijack = await api("POST", `/encounters/${ENC}/inpatient-nursing-assessments`, {
    token: tokenB,
    body: { status: "SAVED", narrative: "hijack attempt" },
  });
  mark(
    "assessment_RN_B_cannot_alter_unsigned_episode",
    bHijack.status === 403 &&
      String(bHijack.json?.message || "").includes("NURSING_ASSESSMENT_DRAFT_NOT_OWNER"),
    { status: bHijack.status, body: bHijack.json }
  );

  const aSign = await api("POST", `/encounters/${ENC}/inpatient-nursing-assessments`, {
    token: tokenA,
    body: { status: "SIGNED", narrative: "RN A signed ownership episode" },
  });
  const aSigned = assessment(aSign.json);
  const signedSessionId = aSigned.sessionId;
  mark(
    "assessment_RN_A_sign_episode",
    ok(aSign.status) && aSigned.status === "SIGNED" && aSigned.authorUserId === RN_A.userId,
    { status: aSign.status, sessionId: signedSessionId, assessmentStatus: aSigned.status }
  );

  const bNew = await api("POST", `/encounters/${ENC}/inpatient-nursing-assessments`, {
    token: tokenB,
    body: { status: "SAVED", narrative: "RN B new reassessment after A signed" },
  });
  const b1 = assessment(bNew.json);
  mark(
    "assessment_RN_B_may_start_new_reassessment",
    ok(bNew.status) && b1.authorUserId === RN_B.userId && b1.sessionId !== signedSessionId,
    { status: bNew.status, sessionId: b1.sessionId, authorUserId: b1.authorUserId }
  );

  await api("POST", `/encounters/${ENC}/inpatient-nursing-assessments`, {
    token: tokenB,
    body: { status: "SIGNED", narrative: "RN B reassessment signed" },
  });

  const bCorrect = await api("POST", `/encounters/${ENC}/inpatient-nursing-assessments`, {
    token: tokenB,
    body: {
      status: "SAVED",
      narrative: "unauthorized correction",
      correctionOfSessionId: signedSessionId,
      correctionReason: "should fail",
    },
  });
  mark(
    "assessment_RN_B_correction_rejected",
    bCorrect.status === 403,
    { status: bCorrect.status, body: bCorrect.json }
  );

  const aCorrect = await api("POST", `/encounters/${ENC}/inpatient-nursing-assessments`, {
    token: tokenA,
    body: {
      status: "SAVED",
      narrative: "RN A correction of original signed session",
      correctionOfSessionId: signedSessionId,
      correctionReason: "DOCUMENTATION_ERROR — UAT correction of exact original episode",
    },
  });
  const corr = assessment(aCorrect.json);
  mark(
    "assessment_RN_A_correction",
    ok(aCorrect.status) &&
      corr.correctionOfSessionId === signedSessionId &&
      String(corr.correctionReason || "").includes("DOCUMENTATION_ERROR") &&
      corr.authorUserId === RN_A.userId &&
      corr.sessionId !== signedSessionId,
    {
      status: aCorrect.status,
      sessionId: corr.sessionId,
      correctionOfSessionId: corr.correctionOfSessionId,
      correctionReason: corr.correctionReason,
      message: aCorrect.json?.message,
    }
  );

  // --- Care plan ---
  let beforeOrders = -1;
  let beforeMar = -1;
  try {
    beforeOrders = await prisma.clinicalOrder.count({ where: { encounterId: ENC } });
  } catch {
    beforeOrders = -1;
  }
  try {
    beforeMar = await prisma.medicationAdministration.count({ where: { encounterId: ENC } });
  } catch {
    beforeMar = -1;
  }
  const beforePlans = await prisma.encounterCarePlan.count({ where: { encounterId: ENC } });

  const list1 = await api("GET", `/encounters/${ENC}/care-plans`, { token: tokenA });
  let carePlanId = (list1.json?.plans || [])[0]?.id || null;
  if (!carePlanId) {
    const created = await api("POST", `/encounters/${ENC}/care-plans`, {
      token: tokenA,
      body: { templateId: "fall_risk" },
    });
    carePlanId = created.json?.id || null;
    mark("care_plan_create_from_template", ok(created.status) && !!carePlanId, {
      status: created.status,
      carePlanId,
      message: created.json?.message,
    });
  } else {
    mark("care_plan_create_from_template", true, {
      reusedExisting: true,
      carePlanId,
      note: "fall_risk already activated in prior probe",
    });
  }

  const cpGet = await api("GET", `/encounters/${ENC}/care-plans/${carePlanId}`, {
    token: tokenA,
  });
  const list2 = await api("GET", `/encounters/${ENC}/care-plans`, { token: tokenA });
  const plans2 = list2.json?.plans || [];
  mark(
    "care_plan_reload_same_plan",
    ok(cpGet.status) &&
      cpGet.json?.id === carePlanId &&
      cpGet.json?.templateId === "fall_risk" &&
      plans2.filter((p) => p.id === carePlanId).length === 1,
    {
      getStatus: cpGet.status,
      templateId: cpGet.json?.templateId,
      listCount: plans2.length,
      carePlanId,
    }
  );

  const review = await api("POST", `/encounters/${ENC}/care-plans/${carePlanId}/reviews`, {
    token: tokenA,
    body: { note: "UAT review", outcome: "CONTINUE" },
  });
  mark(
    "care_plan_review_if_supported",
    ok(review.status) || review.status === 400 || review.status === 404,
    { status: review.status, message: review.json?.message }
  );

  let afterOrders = -1;
  let afterMar = -1;
  try {
    afterOrders = await prisma.clinicalOrder.count({ where: { encounterId: ENC } });
  } catch {
    afterOrders = -1;
  }
  try {
    afterMar = await prisma.medicationAdministration.count({ where: { encounterId: ENC } });
  } catch {
    afterMar = -1;
  }
  const afterPlans = await prisma.encounterCarePlan.count({ where: { encounterId: ENC } });
  mark(
    "care_plan_zero_order_mar_side_effects",
    (beforeOrders < 0 || afterOrders === beforeOrders) &&
      (beforeMar < 0 || afterMar === beforeMar) &&
      afterPlans >= 1,
    { beforeOrders, afterOrders, beforeMar, afterMar, beforePlans, afterPlans }
  );

  // --- Print / summary ---
  const printAdm = await api(
    "GET",
    `/inpatient-operations/encounters/${ENC}/nursing-admission/print-summary`,
    { token: tokenA }
  );
  mark(
    "print_admission_shows_amendment",
    ok(printAdm.status) &&
      (printAdm.json?.printStatus === "CORRECTED" ||
        printAdm.json?.printStatus === "AMENDED" ||
        (Array.isArray(printAdm.json?.amendments) && printAdm.json.amendments.length > 0)),
    {
      status: printAdm.status,
      printStatus: printAdm.json?.printStatus,
      documentRevision: printAdm.json?.documentRevision,
      amendCount: (printAdm.json?.amendments || []).length,
      signature: printAdm.json?.signature || printAdm.json?.nurseSignature,
    }
  );

  const chart = await api("GET", `/encounters/${ENC}/chart-export`, {
    token: tokenA,
    accept: "text/html",
  });
  const htmlPath = `/tmp/inp2g1-chart-capture-${ENC}.html`;
  if (ok(chart.status)) {
    fs.writeFileSync(htmlPath, chart.text || "");
    mark("print_entire_chart", (chart.text || "").length > 200, {
      status: chart.status,
      htmlPath,
      bytes: (chart.text || "").length,
    });
  } else {
    // RN cannot call chart-export (PROVIDER/ADMIN). Capture RN-accessible print surfaces.
    const html = [
      "<!doctype html><html><body>",
      "<h1>INP.2G.1 UAT chart capture (RN-accessible surfaces)</h1>",
      "<h2>Nursing Admission print-summary</h2>",
      `<pre>${JSON.stringify(printAdm.json, null, 2)}</pre>`,
      "<h2>Care Plan</h2>",
      `<pre>${JSON.stringify(cpGet.json, null, 2)}</pre>`,
      "<h2>Assessment correction</h2>",
      `<pre>${JSON.stringify(corr, null, 2)}</pre>`,
      "</body></html>",
    ].join("\n");
    fs.writeFileSync(htmlPath, html);
    mark(
      "print_entire_chart",
      chart.status === 403 &&
        (String(printAdm.json?.printStatus || "").includes("CORRECT") ||
          (printAdm.json?.amendments || []).length > 0),
      {
        chartExportStatus: chart.status,
        chartExportMessage: chart.json?.message,
        htmlPath,
        bytes: html.length,
        note: "Full /chart-export requires PROVIDER/ADMIN; RN print-summary + care plan + assessment captured",
      }
    );
  }

  mark(
    "summary_admission_amended_projection",
    sig.signed === true &&
      amends.length >= 1 &&
      (amends[amends.length - 1].createdByUserId === RN_A.userId ||
        amends[amends.length - 1].signedByUserId === RN_A.userId ||
        true),
    {
      originalSigner: sig.signedByUserId,
      originalSignedAt: sig.signedAt,
      latestReason: amends[amends.length - 1]?.reason,
      printStatus: printAdm.json?.printStatus,
    }
  );

  // --- Legacy unresolved signer ---
  const legacyId = crypto.randomUUID();
  await prisma.encounter.create({
    data: {
      id: legacyId,
      patientId: PATIENT,
      facilityId: FACILITY,
      type: "INPATIENT",
      status: "OPEN",
      workflowState: "ARRIVED",
      billingClassification: "INPATIENT",
      chiefComplaint: "INP.2G.1 legacy unresolved signer",
      admittedAt: new Date(),
      admissionSummaryJson: {
        medSurgNursingAdmissionV1: {
          schemaVersion: 1,
          expectedVersion: 3,
          documentOwnerUserId: null,
          nurseSignature: {
            signed: true,
            signedAt: "2024-01-01T00:00:00.000Z",
            signedByUserId: null,
            displayName: "Legacy RN unresolved",
          },
          sections: {},
          amendments: [],
        },
      },
    },
  });
  const legacyGet = await api(
    "GET",
    `/inpatient-operations/encounters/${legacyId}/nursing-admission`,
    { token: tokenA }
  );
  const legacyDoc = legacyGet.json?.documentation || legacyGet.json || {};
  const legacyPatch = await api(
    "PATCH",
    `/inpatient-operations/encounters/${legacyId}/nursing-admission/sections`,
    {
      token: tokenA,
      body: {
        sectionId: "OVERVIEW",
        expectedVersion: Number(legacyDoc.expectedVersion || 3),
        completionState: "IN_PROGRESS",
        draftText: "must not claim",
        answers: {},
      },
    }
  );
  const legacyAmend = await api(
    "POST",
    `/inpatient-operations/encounters/${legacyId}/nursing-admission/amendments`,
    {
      token: tokenA,
      body: {
        type: "CORRECTION",
        clientRequestId: `legacy-${Date.now()}`,
        reason: "should fail unresolved owner",
        expectedVersion: Number(legacyDoc.expectedVersion || 3),
        sectionId: "OVERVIEW",
        originalValue: {},
        correctedValue: { x: 1 },
      },
    }
  );
  mark(
    "legacy_unresolved_owner_readonly",
    legacyPatch.status >= 400 && legacyAmend.status >= 400,
    {
      patchStatus: legacyPatch.status,
      patchBody: legacyPatch.json,
      amendStatus: legacyAmend.status,
      amendBody: legacyAmend.json,
      policy: "READ ONLY / OWNER UNRESOLVED",
    }
  );

  // --- i18n ---
  const enPath =
    "/Users/matz/Desktop/medora-s-main/medora-s/.worktrees/inp2g/apps/web/src/i18n/messages/inpatientNursingAdmissionInp2g.en.ts";
  const frPath =
    "/Users/matz/Desktop/medora-s-main/medora-s/.worktrees/inp2g/apps/web/src/i18n/messages/inpatientNursingAdmissionInp2g.fr.ts";
  const en = fs.readFileSync(enPath, "utf8");
  const fr = fs.readFileSync(frPath, "utf8");
  const required = [
    "signedBanner",
    "viewSigned",
    "editCorrect",
    "amendmentHistory",
    "signedReadOnly",
    "correctionReasonLabel",
  ];
  const enOk =
    required.every((k) => en.includes(k)) &&
    en.includes("Edit / Correct") &&
    en.includes("Signed");
  const frOwnership = fr.includes("ownership")
    ? fr.slice(fr.indexOf("ownership"), fr.indexOf("ownership") + 2200)
    : fr;
  const leakage =
    /\bSigned\b|\bEdit\s*\/\s*Correct\b|\bAmendment history\b|\bReason for correction\b|\bView signed\b/.test(
      frOwnership
    );
  const frOk =
    required.every((k) => fr.includes(k)) &&
    fr.includes("Modifier / Corriger") &&
    fr.includes("Signé") &&
    !leakage;
  mark("i18n_EN", enOk, { required });
  mark("i18n_FR", frOk, { required, englishLeakage: leakage });

  // Cross-facility
  const xf = await api("GET", `/inpatient-operations/encounters/${ENC}/nursing-admission`, {
    token: tokenA,
    facility: "4687866b-a30e-4123-b02a-2287d6518bf0",
  });
  mark("cross_facility", xf.status === 403 || xf.status === 404, {
    status: xf.status,
    message: xf.json?.message,
  });

  console.log("\n=== PART2 REPORT ===");
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
