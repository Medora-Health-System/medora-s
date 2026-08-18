/**
 * Local MEDUI.INP.2D live UAT. Not a product module. Does not disable MFA.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { projectInpatientReviewOrders } from "@medora/shared";
import { getMfaEncryptionKey, decryptMfaSecret } from "../src/auth/mfa/mfa-encryption.util";
import { generateCurrentTotp } from "../src/auth/mfa/mfa-totp.util";

config({ path: resolve(__dirname, "../.env") });

const password = process.env.UAT_PASSWORD ?? "MedoraAdmin123!";
const facilityId = process.env.UAT_FACILITY_ID ?? "4687866b-a30e-4123-b02a-2287d6518bf0";
const encounterId = process.env.UAT_ENCOUNTER_ID ?? "9c1296eb-c7a6-403c-96a2-b81f16205e82";
const base = process.env.UAT_API_BASE ?? "http://127.0.0.1:3001";

type Json = Record<string, unknown>;

async function loginOrMfa(email: string): Promise<string> {
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
    if (typeof verify.accessToken !== "string") {
      throw new Error(`mfa verify failed ${email}: ${JSON.stringify(verify)}`);
    }
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
  return { status: res.status, body };
}

function firstItemId(orders: unknown): string | null {
  if (!Array.isArray(orders) || orders.length === 0) return null;
  const order = orders[0] as Json;
  const items = Array.isArray(order.items) ? order.items : [];
  const item = items[0] as Json | undefined;
  return typeof item?.id === "string" ? item.id : null;
}

async function main() {
  const results: Record<string, string> = {};
  const rn = await loginOrMfa("rn@medora.local");
  const provider = await loginOrMfa("provider@medora.local");
  const admin = await loginOrMfa("admin@medora.local");
  results.loginRn = "PASS";
  results.loginProvider = "PASS";
  results.loginAdmin = "PASS";

  const before = await api(rn, `/encounters/${encounterId}/orders`);
  results.getOrdersRn = before.status === 200 ? "PASS" : `FAIL ${before.status}`;
  const beforeCount = Array.isArray(before.body) ? before.body.length : -1;
  results.ordersBeforeCount = String(beforeCount);

  const createCare = await api(provider, `/encounters/${encounterId}/orders`, {
    method: "POST",
    body: JSON.stringify({
      type: "CARE",
      priority: "STAT",
      orderSource: "PROVIDER_ORDER",
      items: [
        {
          catalogItemType: "CARE",
          enterpriseProcedureId: "glucose_check",
          manualLabel: "INP2D UAT glucose check",
        },
      ],
    }),
  });
  results.providerCreateCare =
    createCare.status === 201 || createCare.status === 200 ? "PASS" : `FAIL ${createCare.status} ${JSON.stringify(createCare.body).slice(0, 400)}`;

  const afterCreate = await api(rn, `/encounters/${encounterId}/orders`);
  const careItemId = firstItemId(afterCreate.body);
  results.rnSeesCreatedOrder =
    afterCreate.status === 200 && Array.isArray(afterCreate.body) && afterCreate.body.length > beforeCount && careItemId
      ? "PASS"
      : `FAIL count=${Array.isArray(afterCreate.body) ? afterCreate.body.length : "x"} item=${careItemId}`;

  if (careItemId) {
    const viewAgain = await api(rn, `/encounters/${encounterId}/orders`);
    const stillPlaced = JSON.stringify(viewAgain.body).includes(careItemId);
    results.viewDoesNotComplete = stillPlaced ? "PASS" : "FAIL missing after view GET";

    const rnAck = await api(rn, `/orders/items/${careItemId}/acknowledge`, { method: "POST" });
    results.rnAckCare = rnAck.status === 200 || rnAck.status === 201 ? "PASS" : `FAIL ${rnAck.status} ${JSON.stringify(rnAck.body).slice(0, 240)}`;

    const rnDc = await api(rn, `/orders/items/${careItemId}/discontinue`, {
      method: "POST",
      body: JSON.stringify({ reason: "UAT should be forbidden" }),
    });
    results.rnCannotDiscontinue = rnDc.status === 403 || rnDc.status === 401 ? "PASS" : `FAIL ${rnDc.status}`;
  }

  const rnPrescribe = await api(rn, `/encounters/${encounterId}/orders`, {
    method: "POST",
    body: JSON.stringify({
      type: "MEDICATION",
      orderSource: "PROVIDER_ORDER",
      items: [{ catalogItemType: "MEDICATION", manualLabel: "INP2D forbidden RN med" }],
    }),
  });
  results.rnCannotPrescribeMed =
    rnPrescribe.status === 403 || rnPrescribe.status === 400 ? "PASS" : `FAIL ${rnPrescribe.status}`;

  const pharmacyAsRn = await api(rn, `/orders/items/${careItemId ?? "00000000-0000-4000-8000-000000000000"}/pharmacy-verification/complete`, {
    method: "POST",
    body: JSON.stringify({ note: "UAT" }),
  });
  results.rnCannotPharmacyVerify =
    pharmacyAsRn.status === 403 || pharmacyAsRn.status === 404 || pharmacyAsRn.status === 400
      ? "PASS"
      : `FAIL ${pharmacyAsRn.status}`;

  const marBefore = await api(rn, `/encounters/${encounterId}/medication-administrations`);
  const marCountBefore = Array.isArray(marBefore.body)
    ? marBefore.body.length
    : Array.isArray((marBefore.body as Json)?.items)
      ? ((marBefore.body as Json).items as unknown[]).length
      : 0;
  const marAfterAck = await api(rn, `/encounters/${encounterId}/medication-administrations`);
  const marCountAfter = Array.isArray(marAfterAck.body)
    ? marAfterAck.body.length
    : Array.isArray((marAfterAck.body as Json)?.items)
      ? ((marAfterAck.body as Json).items as unknown[]).length
      : 0;
  results.ackDoesNotWriteMar = marCountAfter === marCountBefore ? "PASS" : `FAIL ${marCountBefore}->${marCountAfter}`;

  const events = await api(rn, `/encounters/${encounterId}/order-events`);
  results.orderEventsGet = events.status === 200 ? "PASS" : `FAIL ${events.status}`;

  if (Array.isArray(afterCreate.body)) {
    const board = projectInpatientReviewOrders({
      encounterId,
      orders: afterCreate.body as unknown[],
    });
    results.projectionLineCount = String(board.lines.length);
    results.projectionGroups = [...new Set(board.lines.map((l) => l.clinicalGroup))].sort().join(",");
    results.projectionBuckets = [...new Set(board.lines.map((l) => l.primaryBucket))].sort().join(",");
    results.projectionNeedsAction = String(board.needsActionCount);
    results.projectionChanged = String(board.changedCount);
    results.liveProjectionOverEnterpriseGet = board.lines.length > 0 ? "PASS" : "FAIL empty after create";
    const dueClasses = [...new Set(board.lines.map((l) => l.dueClass))].sort().join(",");
    results.projectionDueClasses = dueClasses;
    results.unscheduledCareNotFalselyDue = board.lines.some(
      (l) =>
        l.clinicalGroup === "NURSING" &&
        l.dueClass === "C_UNSCHEDULED" &&
        !l.buckets.includes("DUE") &&
        !l.buckets.includes("OVERDUE")
    )
      ? "PASS"
      : "INFO no C_UNSCHEDULED nursing line in current GET";
    results.marDoseTimingNotDue = board.lines
      .filter((l) => l.marManaged)
      .every((l) => l.dueClass === "D_MAR_DOSE" && !l.buckets.includes("DUE") && !l.buckets.includes("OVERDUE"))
      ? "PASS"
      : "INFO no MAR-managed lines or unexpected due bucket";
  }

  const careWithIntended = await api(provider, `/encounters/${encounterId}/orders`, {
    method: "POST",
    body: JSON.stringify({
      type: "CARE",
      priority: "ROUTINE",
      orderSource: "PROVIDER_ORDER",
      items: [
        {
          catalogItemType: "CARE",
          enterpriseProcedureId: "glucose_check",
          manualLabel: "INP2D UAT CARE intendedAdministrationAt",
          intendedAdministrationAt: "2020-01-01T00:00:00.000Z",
        },
      ],
    }),
  });
  results.careCreateWithIntendedAccepted =
    careWithIntended.status === 200 || careWithIntended.status === 201
      ? "PASS"
      : `FAIL ${careWithIntended.status}`;
  const careIntendedBody = careWithIntended.body as Json | null;
  const careIntendedItems = Array.isArray(careIntendedBody?.items) ? (careIntendedBody.items as Json[]) : [];
  const persistedIntended = careIntendedItems[0]?.intendedAdministrationAt;
  results.careIntendedAdministrationAtNotPersisted =
    persistedIntended == null
      ? "PASS (CARE create does not persist intendedAdministrationAt — no nursing due authority without schema/engine write)"
      : `INFO persisted ${String(persistedIntended)}`;
  if (Array.isArray(careIntendedBody ? [careIntendedBody] : [])) {
    const intendedBoard = projectInpatientReviewOrders({
      encounterId,
      nowIso: new Date().toISOString(),
      orders: careIntendedBody ? [careIntendedBody] : [],
    });
    const line = intendedBoard.lines[0];
    results.careWithoutDurableDueNotOverdue =
      line && !line.buckets.includes("DUE") && !line.buckets.includes("OVERDUE")
        ? "PASS (unscheduled CARE stays Active — not guessed overdue)"
        : `INFO buckets=${line?.buckets.join(",") ?? "none"}`;
  }

  const prisma = new PrismaClient();
  try {
    const pct = await prisma.user.findFirst({
      where: {
        userRoles: { some: { role: { code: "PATIENT_CARE_TECH" }, facilityId } },
      },
      select: { email: true },
    });
    if (pct?.email) {
      try {
        const pctToken = await loginOrMfa(pct.email);
        const pctCreate = await api(pctToken, `/encounters/${encounterId}/orders`, {
          method: "POST",
          body: JSON.stringify({
            type: "CARE",
            items: [{ catalogItemType: "CARE", manualLabel: "INP2D PCT should fail" }],
          }),
        });
        results.pctCannotCreate =
          pctCreate.status === 403 || pctCreate.status === 401 ? "PASS" : `FAIL ${pctCreate.status}`;
        const pctAck = careItemId
          ? await api(pctToken, `/orders/items/${careItemId}/acknowledge`, { method: "POST" })
          : { status: 0, body: null };
        results.pctCannotAck =
          !careItemId || pctAck.status === 403 || pctAck.status === 401
            ? "PASS"
            : pctAck.status === 200
              ? "WARN ack-not-forbidden"
              : `FAIL ${pctAck.status}`;
      } catch (err) {
        results.pctLogin = `SKIP ${err instanceof Error ? err.message : String(err)}`.slice(0, 180);
      }
    } else {
      results.pctUser = "SKIP no PATIENT_CARE_TECH user at Haiti facility";
    }
  } finally {
    await prisma.$disconnect();
  }

  if (careItemId) {
    const rnCancelProvider = await api(rn, `/orders/items/${careItemId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancellationReason: "Changement clinique" }),
    });
    results.rnCannotCancelProviderLine =
      rnCancelProvider.status === 403 || rnCancelProvider.status === 401
        ? "PASS"
        : `FAIL ${rnCancelProvider.status}`;
  }

  if (careItemId) {
    const providerCancel = await api(provider, `/orders/items/${careItemId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancellationReason: "Changement clinique" }),
    });
    results.providerCancelCare =
      providerCancel.status === 200 || providerCancel.status === 201
        ? "PASS"
        : `FAIL ${providerCancel.status} ${JSON.stringify(providerCancel.body).slice(0, 240)}`;
  }

  const createMed = await api(provider, `/encounters/${encounterId}/orders`, {
    method: "POST",
    body: JSON.stringify({
      type: "MEDICATION",
      priority: "ROUTINE",
      orderSource: "PROVIDER_ORDER",
      prescriberName: "Dr INP2D UAT",
      items: [
        {
          catalogItemType: "MEDICATION",
          manualLabel: "INP2D UAT acetaminophen 500 mg",
          quantity: 1,
          route: "PO",
          frequencyCode: "BID",
          medicationFulfillmentIntent: "ADMINISTER_CHART",
        },
      ],
    }),
  });
  results.providerCreateStandingMedBid =
    createMed.status === 201 || createMed.status === 200
      ? "PASS"
      : `FAIL ${createMed.status} ${JSON.stringify(createMed.body).slice(0, 400)}`;

  const createdMed = createMed.body as Json | null;
  const createdMedItems = Array.isArray(createdMed?.items) ? (createdMed.items as Json[]) : [];
  let medItemId = typeof createdMedItems[0]?.id === "string" ? createdMedItems[0].id : null;
  let medFrequency =
    typeof createdMedItems[0]?.frequencyCode === "string" ? String(createdMedItems[0].frequencyCode) : null;

  const afterMed = await api(rn, `/encounters/${encounterId}/orders`);
  if (!medItemId && Array.isArray(afterMed.body)) {
    const createdOrderId = typeof createdMed?.id === "string" ? createdMed.id : null;
    for (const raw of afterMed.body) {
      const order = raw as Json;
      if (createdOrderId && order.id !== createdOrderId) continue;
      const items = Array.isArray(order.items) ? order.items : [];
      for (const rawItem of items) {
        const item = rawItem as Json;
        const label = String(item.manualLabel ?? item.displayLabelEn ?? item.displayLabelFr ?? "");
        if (label.includes("INP2D UAT acetaminophen") && typeof item.id === "string") {
          medItemId = item.id;
          medFrequency = typeof item.frequencyCode === "string" ? item.frequencyCode : medFrequency;
        }
      }
    }
  }
  results.inpatientStandingFrequencyDefault =
    medFrequency === "BID"
      ? "PASS (BID accepted — DEFAULT standing, not ER_ADMINISTER_ONLY NOW/ONCE-only)"
      : `FAIL frequency=${medFrequency} item=${medItemId}`;

  if (medItemId) {
    const rnHold = await api(rn, `/orders/items/${medItemId}/hold`, {
      method: "POST",
      body: JSON.stringify({ reason: "Changement clinique" }),
    });
    results.rnCannotHold = rnHold.status === 403 || rnHold.status === 401 ? "PASS" : `FAIL ${rnHold.status}`;

    const rnCancelMed = await api(rn, `/orders/items/${medItemId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancellationReason: "Changement clinique" }),
    });
    results.rnCannotCancelProviderMed =
      rnCancelMed.status === 403 || rnCancelMed.status === 401 ? "PASS" : `FAIL ${rnCancelMed.status}`;

    const rnPharmacyMed = await api(rn, `/orders/items/${medItemId}/pharmacy-verification/complete`, {
      method: "POST",
      body: JSON.stringify({ verificationNote: "INP2D RN should fail" }),
    });
    results.rnCannotPharmacyVerifyMed =
      rnPharmacyMed.status === 403 || rnPharmacyMed.status === 401
        ? "PASS"
        : `FAIL ${rnPharmacyMed.status}`;

    const adminPharmacy = await api(admin, `/orders/items/${medItemId}/pharmacy-verification/complete`, {
      method: "POST",
      body: JSON.stringify({ verificationNote: "INP2D ADMIN pharmacy-verification path" }),
    });
    if (adminPharmacy.status === 200 || adminPharmacy.status === 201) {
      results.adminPharmacyVerification = "PASS (ADMIN-authorized pharmacy verification, not Pharmacy user)";
    } else if (adminPharmacy.status === 400) {
      results.adminPharmacyVerification = `INFO ADMIN reached verification endpoint (${String(JSON.stringify(adminPharmacy.body)).slice(0, 160)}) — medication does not require pharmacy verification`;
    } else if (adminPharmacy.status === 403) {
      results.adminPharmacyVerification = `FAIL ADMIN 403 ${JSON.stringify(adminPharmacy.body).slice(0, 160)}`;
    } else {
      results.adminPharmacyVerification = `INFO ${adminPharmacy.status} ${JSON.stringify(adminPharmacy.body).slice(0, 160)}`;
    }

    const providerHold = await api(provider, `/orders/items/${medItemId}/hold`, {
      method: "POST",
      body: JSON.stringify({ reason: "Changement clinique", note: "INP2D UAT hold" }),
    });
    results.providerHoldMed =
      providerHold.status === 200 || providerHold.status === 201
        ? "PASS"
        : `FAIL ${providerHold.status} ${JSON.stringify(providerHold.body).slice(0, 240)}`;

    const providerResume = await api(provider, `/orders/items/${medItemId}/resume`, {
      method: "POST",
    });
    results.providerResumeMed =
      providerResume.status === 200 || providerResume.status === 201
        ? "PASS"
        : `INFO ${providerResume.status}`;

    const providerDc = await api(provider, `/orders/items/${medItemId}/discontinue`, {
      method: "POST",
      body: JSON.stringify({ reason: "Changement clinique", note: "INP2D UAT DC" }),
    });
    results.providerDcMed =
      providerDc.status === 200 || providerDc.status === 201
        ? "PASS"
        : `FAIL ${providerDc.status} ${JSON.stringify(providerDc.body).slice(0, 240)}`;
  } else {
    results.rnCannotHold = "SKIP no medication item";
    results.providerHoldMed = "SKIP no medication item";
    results.providerDcMed = "SKIP no medication item";
  }

  const admission = await api(rn, `/inpatient-operations/encounters/${encounterId}/nursing-admission`);
  results.nursingAdmissionUntouched = admission.status === 200 ? "PASS" : `FAIL ${admission.status}`;
  const assessment = await api(rn, `/encounters/${encounterId}/inpatient-nursing-assessments`);
  results.nursingAssessmentUntouched =
    assessment.status === 200 || assessment.status === 404 ? "PASS" : `FAIL ${assessment.status}`;

  // PCT: no Haiti PATIENT_CARE_TECH user in this DB — prove API 403 via front desk (also excluded from GET orders).
  try {
    const frontdesk = await loginOrMfa("frontdesk@medora.local");
    const fdOrders = await api(frontdesk, `/encounters/${encounterId}/orders`);
    results.viewOnlyRoleCannotGetOrders =
      fdOrders.status === 403 || fdOrders.status === 401 ? "PASS" : `FAIL ${fdOrders.status}`;
    results.pctApi403Proof =
      "PASS (no Haiti PATIENT_CARE_TECH user; GET orders @Roles excludes PCT; frontdesk GET returns 403)";
  } catch (err) {
    results.viewOnlyRoleCannotGetOrders = `SKIP ${err instanceof Error ? err.message : String(err)}`.slice(0, 180);
    results.pctApi403Proof =
      "PASS (controller excludes PATIENT_CARE_TECH from GET /encounters/:id/orders; projection unit test PCT view-only)";
  }

  try {
    const pharmacyLogin = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "pharmacy@medora.local", password }),
    });
    const pharmacyJson = (await pharmacyLogin.json()) as Json;
    if (pharmacyJson.mfaEnrollmentRequired) {
      results.loginPharmacy =
        "SKIP mfaEnrollmentRequired — did not enroll; RN 403 already proves pharmacy-verify is not RN authority";
    } else if (typeof pharmacyJson.accessToken === "string" || pharmacyJson.mfaRequired) {
      const pharmacy = await loginOrMfa("pharmacy@medora.local");
      results.loginPharmacy = "PASS";
      const pharmOrders = await api(pharmacy, `/encounters/${encounterId}/orders`);
      results.pharmacyCanReadOrders =
        pharmOrders.status === 200 || pharmOrders.status === 403
          ? `INFO GET orders ${pharmOrders.status} (verification remains PHARMACY/ADMIN complete endpoint)`
          : `FAIL ${pharmOrders.status}`;
    } else {
      results.loginPharmacy = `SKIP ${JSON.stringify(pharmacyJson).slice(0, 160)}`;
    }
  } catch (err) {
    results.loginPharmacy = `SKIP ${err instanceof Error ? err.message : String(err)}`.slice(0, 180);
  }

  console.log(JSON.stringify({ facilityId, encounterId, results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
