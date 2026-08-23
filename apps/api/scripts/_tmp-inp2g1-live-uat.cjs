#!/usr/bin/env node
/**
 * MEDUI.INP.2G.1 disposable live UAT — Nursing Admission ownership / sign / amend / 409.
 * Run against local API (default PORT 3011). Do not commit results.
 */
"use strict";

const crypto = require("crypto");

const BASE = process.env.UAT_API_BASE || "http://127.0.0.1:3011";
const FACILITY = process.env.UAT_FACILITY_ID || "04067471-1172-483c-8830-39f1dc0a2310";
  const ENC =
  process.env.UAT_ENCOUNTER_ID || "eb7ea927-3f54-43fc-85e7-09262069883e";
const RN_A = {
  email: "rna-inp2g1-uat@test.local",
  password: "MedoraAdmin123!",
  userId: "2e290fa5-f225-43e9-8d74-22e0301d1871",
  displayName: "RN A INP2G1 UAT",
};
const RN_B = {
  email: "rnb-inp2g1-uat@test.local",
  password: "MedoraAdmin123!",
  userId: "8a840fbc-eba7-4b05-8fe2-54edbac536ce",
  displayName: "RN B INP2G1 UAT",
};

const report = {};

async function req(method, path, { token, body, facility = FACILITY } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
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
    json = { _raw: text.slice(0, 2000) };
  }
  return { status: res.status, json, text };
}

async function login(user) {
  const r = await req("POST", "/auth/login", {
    body: { email: user.email, password: user.password },
    facility: null,
  });
  if (!(r.status === 200 || r.status === 201) || !r.json?.accessToken) {
    throw new Error(`login failed ${user.email}: ${r.status} ${JSON.stringify(r.json)}`);
  }
  return r.json.accessToken;
}

function docOf(payload) {
  return payload?.documentation ?? payload?.document ?? payload ?? {};
}

function expectedVersionOf(payload) {
  const d = docOf(payload);
  return Number(d.expectedVersion ?? 0);
}

function ownerOf(payload) {
  const d = docOf(payload);
  return d.documentOwnerUserId ?? null;
}

function sigOf(payload) {
  const d = docOf(payload);
  return d.nurseSignature ?? null;
}

function amendmentsOf(payload) {
  const d = docOf(payload);
  return Array.isArray(d.amendments) ? d.amendments : [];
}

async function getAdmission(token) {
  return req("GET", `/inpatient-operations/encounters/${ENC}/nursing-admission`, { token });
}

async function patchSection(token, body) {
  return req("PATCH", `/inpatient-operations/encounters/${ENC}/nursing-admission/sections`, {
    token,
    body,
  });
}

async function review(token) {
  return req("GET", `/inpatient-operations/encounters/${ENC}/nursing-admission/review`, {
    token,
  });
}

async function sign(token, expectedVersion) {
  return req("POST", `/inpatient-operations/encounters/${ENC}/nursing-admission/sign`, {
    token,
    body: {
      expectedVersion,
      credentials: "RN",
      displayName: RN_A.displayName,
      createProviderHandoff: false,
    },
  });
}

async function amend(token, body) {
  return req("POST", `/inpatient-operations/encounters/${ENC}/nursing-admission/amendments`, {
    token,
    body,
  });
}

function mark(key, pass, detail) {
  report[key] = { pass: !!pass, detail };
  const tag = pass ? "PASS" : "FAIL";
  console.log(`[${tag}] ${key}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}

async function completeAllRequiredSections(token) {
  // Legitimate clinical path: mark remaining sections UNABLE_TO_COMPLETE with reason.
  // (Full structured COMPLETE answers are not required to prove ownership/amendment.)
  let g = await getAdmission(token);
  let v = expectedVersionOf(g.json);
  const sections = Object.keys(docOf(g.json).sections || {});
  for (const sectionId of sections) {
    const st = docOf(g.json).sections?.[sectionId]?.completionState;
    if (st === "COMPLETE" || st === "UNABLE_TO_COMPLETE" || st === "NOT_APPLICABLE") {
      continue;
    }
    const r = await patchSection(token, {
      sectionId,
      expectedVersion: v,
      completionState: "UNABLE_TO_COMPLETE",
      unableReason: "UAT disposable — patient unavailable for full structured admission section",
      draftText: `UAT unable ${sectionId}`,
      answers: {},
    });
    if (r.status !== 200) {
      console.log(
        `  warn section ${sectionId} unable -> ${r.status}`,
        r.json?.message || r.json?.code || r.json?.missing
      );
      continue;
    }
    v = expectedVersionOf(r.json);
    g = r;
  }
  return v;
}

async function main() {
  console.log("=== MEDUI.INP.2G.1 live UAT ===");
  console.log({ BASE, FACILITY, ENC, RN_A: RN_A.userId, RN_B: RN_B.userId });

  const tokenA = await login(RN_A);
  const tokenB = await login(RN_B);

  // --- 3. Unsigned draft ownership ---
  let g0 = await getAdmission(tokenA);
  let v = expectedVersionOf(g0.json);
  const first = await patchSection(tokenA, {
    sectionId: "OVERVIEW",
    expectedVersion: v,
    completionState: "IN_PROGRESS",
    draftText: "RN A first legitimate draft",
    answers: { chiefComplaintNote: "ownership-proof" },
  });
  const ownerA = ownerOf(first.json);
  mark(
    "RN_A_draft_ownership",
    first.status === 200 && ownerA === RN_A.userId,
    { status: first.status, documentOwnerUserId: ownerA, expectedVersion: expectedVersionOf(first.json) }
  );
  v = expectedVersionOf(first.json);

  const reloadA = await getAdmission(tokenA);
  mark(
    "RN_A_draft_reload_editable",
    ownerOf(reloadA.json) === RN_A.userId && expectedVersionOf(reloadA.json) === v,
    { documentOwnerUserId: ownerOf(reloadA.json), expectedVersion: expectedVersionOf(reloadA.json) }
  );

  const hijack = await patchSection(tokenB, {
    sectionId: "OVERVIEW",
    expectedVersion: v,
    completionState: "IN_PROGRESS",
    draftText: "RN B hijack attempt",
    answers: { chiefComplaintNote: "should-fail" },
  });
  mark(
    "RN_B_draft_rejection",
    hijack.status === 403 &&
      String(hijack.json?.message || hijack.json?.code || "").includes("NURSING_ADMISSION_NOT_DOCUMENT_OWNER"),
    { status: hijack.status, body: hijack.json }
  );

  // --- 4. Sign ---
  await completeAllRequiredSections(tokenA);
  const beforeSign = await getAdmission(tokenA);
  v = expectedVersionOf(beforeSign.json);
  const rev = await review(tokenA);
  console.log("review incomplete:", rev.json?.incompleteSections || rev.json?.incomplete || rev.json?.status || Object.keys(rev.json || {}).slice(0, 12));

  let signRes = await sign(tokenA, v);
  if (signRes.status !== 200) {
    // One more pass: mark remaining as UNABLE if needed
    console.log("sign first attempt", signRes.status, signRes.json?.message || signRes.json?.code, signRes.json?.incompleteSections || signRes.json?.details);
    const incomplete =
      signRes.json?.incompleteSections ||
      signRes.json?.details?.incompleteSections ||
      rev.json?.incompleteSections ||
      [];
    if (Array.isArray(incomplete) && incomplete.length) {
      for (const item of incomplete) {
        const sectionId = typeof item === "string" ? item : item?.sectionId;
        if (!sectionId) continue;
        const cur = await getAdmission(tokenA);
        const rv = expectedVersionOf(cur.json);
        const p = await patchSection(tokenA, {
          sectionId,
          expectedVersion: rv,
          completionState: "UNABLE",
          unableReason: "UAT unable to complete structured answers — disposable",
          draftText: "unable",
          answers: {},
        });
        console.log(`  unable ${sectionId} -> ${p.status}`);
      }
    }
    const cur2 = await getAdmission(tokenA);
    signRes = await sign(tokenA, expectedVersionOf(cur2.json));
  }

  const sig = sigOf(signRes.json);
  mark(
    "RN_A_sign",
    signRes.status === 200 && sig?.signed === true && sig?.signedByUserId === RN_A.userId,
    { status: signRes.status, signature: sig, message: signRes.json?.message || signRes.json?.code }
  );

  const afterSign = await getAdmission(tokenA);
  const signedAt = sigOf(afterSign.json)?.signedAt;
  const signedBy = sigOf(afterSign.json)?.signedByUserId;
  const signedVersion = expectedVersionOf(afterSign.json);
  mark(
    "RN_A_sign_reload",
    sigOf(afterSign.json)?.signed === true && signedBy === RN_A.userId,
    { signedBy, signedAt, expectedVersion: signedVersion }
  );

  // Draft patch after sign should fail / lock
  const postSignDraft = await patchSection(tokenA, {
    sectionId: "OVERVIEW",
    expectedVersion: signedVersion,
    completionState: "COMPLETE",
    draftText: "should be locked",
    answers: {},
  });
  mark(
    "post_sign_normal_edit_locked",
    postSignDraft.status >= 400 &&
      String(postSignDraft.json?.message || postSignDraft.json?.code || "").includes(
        "NURSING_ADMISSION_ALREADY_SIGNED"
      ),
    { status: postSignDraft.status, body: postSignDraft.json }
  );

  // --- 5. Owner correction ---
  const amendOk = await amend(tokenA, {
    type: "CORRECTION",
    clientRequestId: `uat-amend-${crypto.randomUUID()}`,
    reason: "Correction de test UAT — champ Overview",
    note: "INP.2G.1 owner correction",
    sectionId: "OVERVIEW",
    originalValue: { draftText: "pre" },
    correctedValue: { draftText: "RN A corrected overview after sign", uatField: "safe-test-field" },
    expectedVersion: signedVersion,
  });
  const amends = amendmentsOf(amendOk.json);
  const last = amends[amends.length - 1];
  const sigAfterAmend = sigOf(amendOk.json);
  mark(
    "RN_A_correction",
    amendOk.status === 200 &&
      last?.amendedByUserId === RN_A.userId &&
      !!last?.amendedAt &&
      String(last?.reason || "").length > 0,
    { status: amendOk.status, last, message: amendOk.json?.message || amendOk.json?.code }
  );
  mark(
    "original_signature_immutable",
    sigAfterAmend?.signedByUserId === RN_A.userId &&
      sigAfterAmend?.signedAt === signedAt &&
      sigAfterAmend?.signed === true,
    { before: { signedBy, signedAt }, after: sigAfterAmend }
  );
  mark(
    "amendment_reason",
    !!last?.reason && String(last.reason).includes("UAT"),
    { reason: last?.reason }
  );
  mark(
    "amendment_history",
    amends.length >= 1 && expectedVersionOf(amendOk.json) > signedVersion,
    { count: amends.length, expectedVersion: expectedVersionOf(amendOk.json) }
  );

  const reloadAmend = await getAdmission(tokenA);
  mark(
    "amendment_durable",
    amendmentsOf(reloadAmend.json).length === amends.length &&
      sigOf(reloadAmend.json)?.signedAt === signedAt,
    {
      count: amendmentsOf(reloadAmend.json).length,
      signedAt: sigOf(reloadAmend.json)?.signedAt,
      expectedVersion: expectedVersionOf(reloadAmend.json),
    }
  );

  // --- 6. Non-owner correction ---
  const vAfter = expectedVersionOf(reloadAmend.json);
  const amendB = await amend(tokenB, {
    type: "CORRECTION",
    clientRequestId: `uat-amend-b-${crypto.randomUUID()}`,
    reason: "RN B unauthorized correction",
    note: "should fail",
    sectionId: "OVERVIEW",
    originalValue: {},
    correctedValue: { draftText: "hijack" },
    expectedVersion: vAfter,
  });
  const afterB = await getAdmission(tokenA);
  mark(
    "RN_B_signed_correction_rejection",
    amendB.status === 403 &&
      String(amendB.json?.message || "").includes("NURSING_ADMISSION_NOT_DOCUMENT_OWNER") &&
      amendmentsOf(afterB.json).length === amendmentsOf(reloadAmend.json).length &&
      sigOf(afterB.json)?.signedAt === signedAt,
    { status: amendB.status, body: amendB.json, amendCount: amendmentsOf(afterB.json).length }
  );

  // --- 7. 409 concurrency ---
  const vNow = expectedVersionOf(afterB.json);
  const a1 = await amend(tokenA, {
    type: "CORRECTION",
    clientRequestId: `uat-conflict-1-${crypto.randomUUID()}`,
    reason: "Session 1 concurrent save",
    note: "s1",
    sectionId: "OVERVIEW",
    originalValue: {},
    correctedValue: { draftText: "session1" },
    expectedVersion: vNow,
  });
  const a2 = await amend(tokenA, {
    type: "CORRECTION",
    clientRequestId: `uat-conflict-2-${crypto.randomUUID()}`,
    reason: "Session 2 stale expectedVersion",
    note: "s2",
    sectionId: "OVERVIEW",
    originalValue: {},
    correctedValue: { draftText: "session2-stale" },
    expectedVersion: vNow, // stale
  });
  mark(
    "stale_write_409",
    a1.status === 200 && a2.status === 409,
    { s1: a1.status, s2: a2.status, s2body: a2.json }
  );

  console.log("\n=== PARTIAL REPORT (admission) ===");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
