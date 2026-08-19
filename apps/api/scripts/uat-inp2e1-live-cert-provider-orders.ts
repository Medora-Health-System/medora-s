/**
 * Local MEDUI.INP.2E.1 live UAT helper. Not a product module. Does not disable MFA.
 * Creates fresh standing medication orders so RN MAR can bind a clean DUE dose.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { getMfaEncryptionKey, decryptMfaSecret } from "../src/auth/mfa/mfa-encryption.util";
import { generateCurrentTotp } from "../src/auth/mfa/mfa-totp.util";

config({ path: resolve(__dirname, "../.env") });

const password = process.env.UAT_PASSWORD ?? "MedoraAdmin123!";
const facilityId = "4687866b-a30e-4123-b02a-2287d6518bf0";
const encounterId = "9c1296eb-c7a6-403c-96a2-b81f16205e82";
const base = "http://127.0.0.1:3001";

type Json = Record<string, unknown>;

async function loginOrMfa(email: string): Promise<{ token: string; via: string }> {
  const loginRes = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const login = (await loginRes.json()) as Json;
  if (typeof login.accessToken === "string") return { token: login.accessToken, via: "password" };

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
      throw new Error(`mfa verify failed ${email}: ${JSON.stringify(verify).slice(0, 240)}`);
    }
    return { token: verify.accessToken, via: "mfa" };
  }
  throw new Error(`unexpected login ${email}: ${JSON.stringify(login).slice(0, 240)}`);
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

async function createMed(
  token: string,
  label: string,
  extras: { frequencyCode: string; priority: string }
) {
  return api(token, `/encounters/${encounterId}/orders`, {
    method: "POST",
    body: JSON.stringify({
      type: "MEDICATION",
      priority: extras.priority,
      orderSource: "PROVIDER_ORDER",
      prescriberName: "Dr INP2E1 UAT",
      items: [
        {
          catalogItemType: "MEDICATION",
          manualLabel: label,
          quantity: 1,
          route: "PO",
          frequencyCode: extras.frequencyCode,
          medicationFulfillmentIntent: "ADMINISTER_CHART",
        },
      ],
    }),
  });
}

async function createStandingMed(token: string, label: string) {
  return createMed(token, label, { frequencyCode: "BID", priority: "ROUTINE" });
}

function firstItem(body: unknown): { orderId: string | null; itemId: string | null } {
  const order = body as Json;
  const items = Array.isArray(order?.items) ? (order.items as Json[]) : [];
  return {
    orderId: typeof order?.id === "string" ? order.id : null,
    itemId: typeof items[0]?.id === "string" ? items[0].id : null,
  };
}

async function main() {
  const out: Record<string, unknown> = {};
  const provider = await loginOrMfa("provider@medora.local");
  out.providerLogin = provider.via;

  if (process.env.INP2E1_MODE === "recon-proof") {
    const prisma = new PrismaClient();
    const rn = await loginOrMfa("rn@medora.local");
    out.rnLogin = rn.via;
    const day = await api(
      rn.token,
      `/facilities/${facilityId}/mar-shift-timeline?shiftCode=7A_7P&encounterId=${encounterId}&includeCompleted=true&includeUpcoming=true`
    );
    const night = await api(
      rn.token,
      `/facilities/${facilityId}/mar-shift-timeline?shiftCode=7P_7A&encounterId=${encounterId}&includeCompleted=true&includeUpcoming=true`
    );
    const bindDoseId = "7ac0fad5-a9f3-44c6-bcaf-07e6bea8ff87";
    const flatten = (body: unknown) => {
      const shift = (body as Json)?.shift as Json | undefined;
      const columns = Array.isArray(shift?.columns) ? (shift!.columns as Json[]) : [];
      const labelByKey = new Map(
        columns.map((c) => [String(c.key), typeof c.label === "string" ? c.label : null])
      );
      const rows = Array.isArray((body as Json)?.rows) ? ((body as Json).rows as Json[]) : [];
      const items: Json[] = [];
      for (const row of rows) {
        const cells = Array.isArray(row.cells) ? (row.cells as Json[]) : [];
        for (const cell of cells) {
          const columnKey = typeof cell.columnKey === "string" ? cell.columnKey : null;
          const cellItems = Array.isArray(cell.items) ? (cell.items as Json[]) : [];
          for (const item of cellItems) {
            items.push({
              columnLabel: columnKey ? labelByKey.get(columnKey) ?? null : null,
              columnKey,
              medicationDoseInstanceId: item.medicationDoseInstanceId,
              medicationLabel: item.medicationLabel,
              doseStatus: item.doseStatus,
              secondaryText: item.secondaryText,
              scheduledAt: item.scheduledAt,
              administeredAt: item.administeredAt,
              completionSummary: item.completionSummary,
              tertiaryText: item.tertiaryText,
              readOnly: item.readOnly,
            });
          }
        }
      }
      return items;
    };
    const dayItems = flatten(day.body);
    const nightItems = flatten(night.body);
    out.dayStatus = day.status;
    out.nightStatus = night.status;
    out.dayShift = (day.body as Json)?.shift;
    out.originalBindOnDay = dayItems.find((i) => i.medicationDoseInstanceId === bindDoseId) ?? null;
    out.originalBindOnNight = nightItems.find((i) => i.medicationDoseInstanceId === bindDoseId) ?? null;
    out.dayBindLike = dayItems.filter((i) =>
      String(i.medicationLabel ?? "").includes("INP2E1")
    );
    await prisma.$disconnect();
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (process.env.INP2E1_MODE === "recon-create") {
    const prisma = new PrismaClient();
    const created: Array<Record<string, unknown>> = [];
    for (const label of [
      "INP2E1 recon bind acetaminophen 500 mg",
      "INP2E1 recon refuse acetaminophen 500 mg",
    ]) {
      const res = await createStandingMed(provider.token, label);
      const ids = firstItem(res.body);
      created.push({
        label,
        status: res.status,
        ...ids,
        error: res.status >= 400 ? JSON.stringify(res.body).slice(0, 240) : undefined,
      });
    }
    out.created = created;
    const itemIds = created.map((c) => c.itemId).filter((id): id is string => typeof id === "string");
    const targetScheduled = new Date("2026-08-19T13:00:00.000Z");
    const doses = await prisma.medicationDoseInstance.findMany({
      where: { encounterId, orderItemId: { in: itemIds } },
      select: {
        id: true,
        orderItemId: true,
        doseStatus: true,
        scheduledAt: true,
        dueWindowStartAt: true,
        dueWindowEndAt: true,
      },
      orderBy: { scheduledAt: "asc" },
    });
    out.dosesBefore = doses;
    const dueUpdates = [];
    for (const dose of doses) {
      if (dose.scheduledAt.toISOString() !== targetScheduled.toISOString()) continue;
      const updated = await prisma.medicationDoseInstance.update({
        where: { id: dose.id },
        data: {
          doseStatus: "DUE",
          dueWindowStartAt: targetScheduled,
          dueWindowEndAt: new Date("2026-08-19T14:00:00.000Z"),
        },
        select: { id: true, orderItemId: true, doseStatus: true, scheduledAt: true },
      });
      dueUpdates.push(updated);
    }
    out.promotedDue = dueUpdates;
    await prisma.$disconnect();
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (process.env.INP2E1_MODE === "perf-get") {
    const rn = await loginOrMfa("rn@medora.local");
    out.rnLogin = rn.via;
    const url = `/facilities/${facilityId}/mar-shift-timeline?shiftCode=7A_7P&encounterId=${encounterId}&includeCompleted=true`;
    const runs: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 3; i += 1) {
      const started = Date.now();
      const res = await api(rn.token, url);
      const ms = Date.now() - started;
      const rows = Array.isArray((res.body as Json)?.rows) ? ((res.body as Json).rows as Json[]) : [];
      const cellCount = rows.reduce((n, row) => {
        const cells = Array.isArray(row.cells) ? (row.cells as Json[]) : [];
        return n + cells.reduce((m, cell) => m + (Array.isArray(cell.items) ? cell.items.length : 0), 0);
      }, 0);
      runs.push({ i: i + 1, status: res.status, ms, cellCount });
    }
    const sorted = runs.map((r) => Number(r.ms)).sort((a, b) => a - b);
    out.runs = runs;
    out.medianMs = sorted[1] ?? null;
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (process.env.INP2E1_MODE === "recon-live") {
    const prisma = new PrismaClient();
    const rn = await loginOrMfa("rn@medora.local");
    out.rnLogin = rn.via;
    const bindDoseId = "497caf8f-ab2f-4420-b349-74e5cbef49e5";
    const bindItemId = "b8c7d924-9440-49f8-84e5-1842cb8cd127";
    const refuseDoseId = "a0eef2fc-fe3f-496f-b13d-af9011493bc6";
    const refuseItemId = "2ac07aba-dd36-485a-9da0-f113b0886e6b";
    const flatten = (body: unknown) => {
      const shift = (body as Json)?.shift as Json | undefined;
      const columns = Array.isArray(shift?.columns) ? (shift!.columns as Json[]) : [];
      const labelByKey = new Map(
        columns.map((c) => [String(c.key), typeof c.label === "string" ? c.label : null])
      );
      const rows = Array.isArray((body as Json)?.rows) ? ((body as Json).rows as Json[]) : [];
      const items: Json[] = [];
      for (const row of rows) {
        const cells = Array.isArray(row.cells) ? (row.cells as Json[]) : [];
        for (const cell of cells) {
          const columnKey = typeof cell.columnKey === "string" ? cell.columnKey : null;
          const cellItems = Array.isArray(cell.items) ? (cell.items as Json[]) : [];
          for (const item of cellItems) {
            if (
              item.medicationDoseInstanceId !== bindDoseId &&
              item.medicationDoseInstanceId !== refuseDoseId
            ) {
              continue;
            }
            items.push({
              columnLabel: columnKey ? labelByKey.get(columnKey) ?? null : null,
              medicationDoseInstanceId: item.medicationDoseInstanceId,
              medicationLabel: item.medicationLabel,
              doseStatus: item.doseStatus,
              secondaryText: item.secondaryText,
              scheduledAt: item.scheduledAt,
              administeredAt: item.administeredAt,
              completionSummary: item.completionSummary,
              tertiaryText: item.tertiaryText,
              readOnly: item.readOnly,
            });
          }
        }
      }
      return items;
    };
    const dayUrl = `/facilities/${facilityId}/mar-shift-timeline?shiftCode=7A_7P&encounterId=${encounterId}&includeCompleted=true&includeUpcoming=true`;
    const before = await api(rn.token, dayUrl);
    out.before = { status: before.status, cells: flatten(before.body) };
    out.beforeDose = await prisma.medicationDoseInstance.findMany({
      where: { id: { in: [bindDoseId, refuseDoseId] } },
      select: { id: true, doseStatus: true, scheduledAt: true },
    });
    const adminPost = await api(rn.token, `/encounters/${encounterId}/medication-administrations`, {
      method: "POST",
      body: JSON.stringify({
        orderItemId: bindItemId,
        medicationDoseInstanceId: bindDoseId,
        marAction: "administered",
        administeredQuantity: 1,
        administeredAt: "2026-08-19T04:15:00.000Z",
        safetyAcknowledgedMedicationAllergies: true,
      }),
    });
    out.adminPost = {
      status: adminPost.status,
      id: (adminPost.body as Json)?.id ?? null,
      medicationDoseInstanceId: (adminPost.body as Json)?.medicationDoseInstanceId ?? null,
      administeredAt: (adminPost.body as Json)?.administeredAt ?? null,
      marAction: (adminPost.body as Json)?.marAction ?? null,
      error: adminPost.status >= 400 ? JSON.stringify(adminPost.body).slice(0, 400) : undefined,
    };
    const afterAdmin = await api(rn.token, dayUrl);
    out.afterAdmin = { status: afterAdmin.status, cells: flatten(afterAdmin.body) };
    const repeat = await api(rn.token, `/encounters/${encounterId}/medication-administrations`, {
      method: "POST",
      body: JSON.stringify({
        orderItemId: bindItemId,
        medicationDoseInstanceId: bindDoseId,
        marAction: "administered",
        administeredQuantity: 1,
        administeredAt: "2026-08-19T04:16:00.000Z",
        safetyAcknowledgedMedicationAllergies: true,
      }),
    });
    out.repeat = {
      status: repeat.status,
      error: JSON.stringify(repeat.body).slice(0, 240),
    };
    const reloadAdmin = await api(rn.token, dayUrl);
    out.reloadAdmin = { status: reloadAdmin.status, cells: flatten(reloadAdmin.body) };
    const refusePost = await api(rn.token, `/encounters/${encounterId}/medication-administrations`, {
      method: "POST",
      body: JSON.stringify({
        orderItemId: refuseItemId,
        medicationDoseInstanceId: refuseDoseId,
        marAction: "refused",
        notes: "Refused: PATIENT_REFUSED",
        administeredAt: "2026-08-19T04:20:00.000Z",
        safetyAcknowledgedMedicationAllergies: true,
      }),
    });
    out.refusePost = {
      status: refusePost.status,
      id: (refusePost.body as Json)?.id ?? null,
      medicationDoseInstanceId: (refusePost.body as Json)?.medicationDoseInstanceId ?? null,
      marAction: (refusePost.body as Json)?.marAction ?? null,
      error: refusePost.status >= 400 ? JSON.stringify(refusePost.body).slice(0, 400) : undefined,
    };
    const afterRefuse = await api(rn.token, dayUrl);
    out.afterRefuse = { status: afterRefuse.status, cells: flatten(afterRefuse.body) };
    const reloadRefuse = await api(rn.token, dayUrl);
    out.reloadRefuse = { status: reloadRefuse.status, cells: flatten(reloadRefuse.body) };
    out.adminCounts = {
      bind: await prisma.medicationAdministration.count({ where: { medicationDoseInstanceId: bindDoseId } }),
      refuse: await prisma.medicationAdministration.count({ where: { medicationDoseInstanceId: refuseDoseId } }),
    };
    await prisma.$disconnect();
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (process.env.INP2E1_MODE === "inspect-dc") {
    const prisma = new PrismaClient();
    const discItemId = "a81c93e4-137a-416b-aac0-20d1c5297455";
    const bindItemId = "f47e9b81-c138-4170-8b3b-2416aaead9e2";
    const bindDoseId = "7ac0fad5-a9f3-44c6-bcaf-07e6bea8ff87";
    const refuseItemId = "5daf0bd8-fec0-48a8-afa7-bada49cc67d8";
    const nowBindItemId = "9590dbc5-b803-4204-9265-2d83cd67f6aa";
    out.admins = await prisma.medicationAdministration.findMany({
      where: {
        encounterId,
        OR: [
          { medicationDoseInstanceId: bindDoseId },
          { orderItemId: bindItemId },
          { orderItemId: refuseItemId },
          { orderItemId: nowBindItemId },
        ],
      },
      select: {
        id: true,
        orderItemId: true,
        medicationDoseInstanceId: true,
        marAction: true,
        administeredAt: true,
        notes: true,
      },
      orderBy: { createdAt: "asc" },
    });
    const dc = await api(provider.token, `/orders/items/${discItemId}/discontinue`, {
      method: "POST",
      body: JSON.stringify({ reason: "Changement clinique", note: "INP2E1 UAT DC" }),
    });
    out.discontinue = { status: dc.status, bodyPreview: JSON.stringify(dc.body).slice(0, 400) };
    out.itemAfter = await prisma.orderItem.findUnique({
      where: { id: discItemId },
      select: { id: true, status: true, lifecycleState: true, manualLabel: true },
    });
    await prisma.$disconnect();
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  const labels: string[] = [];
  const created: Array<{ label: string; status: number; orderId: string | null; itemId: string | null }> = [];
  for (const label of labels) {
    const res = await createStandingMed(provider.token, label);
    const ids = firstItem(res.body);
    created.push({ label, status: res.status, ...ids, error: res.status >= 400 ? JSON.stringify(res.body).slice(0, 240) : undefined } as never);
  }
  out.created = created;
  const nowLabels = [
    "INP2E1 UAT NOW bind acetaminophen 500 mg",
    "INP2E1 UAT NOW refuse acetaminophen 500 mg",
  ];
  const createdNow: Array<{ label: string; status: number; orderId: string | null; itemId: string | null }> = [];
  for (const label of nowLabels) {
    const res = await createMed(provider.token, label, { frequencyCode: "NOW", priority: "STAT" });
    const ids = firstItem(res.body);
    createdNow.push({
      label,
      status: res.status,
      ...ids,
      error: res.status >= 400 ? JSON.stringify(res.body).slice(0, 240) : undefined,
    } as never);
  }
  out.createdNow = createdNow;

  let pharmacyLogin = "SKIP";
  try {
    const pharmacy = await loginOrMfa("pharmacy@medora.local");
    pharmacyLogin = pharmacy.via;
    const pharmacyGet = await api(pharmacy.token, `/encounters/${encounterId}/medication-administrations`);
    out.pharmacyListMar = pharmacyGet.status;
    const pharmacyPost = await api(pharmacy.token, `/encounters/${encounterId}/medication-administrations`, {
      method: "POST",
      body: JSON.stringify({ orderItemId: created[0]?.itemId, marAction: "administered" }),
    });
    out.pharmacyPostMar = pharmacyPost.status;
  } catch (e) {
    pharmacyLogin = `FAIL ${e instanceof Error ? e.message.slice(0, 180) : String(e)}`;
  }
  out.pharmacyLogin = pharmacyLogin;

  let adminLogin = "SKIP";
  try {
    const admin = await loginOrMfa("admin@medora.local");
    adminLogin = admin.via;
    const adminGet = await api(admin.token, `/encounters/${encounterId}/medication-administrations`);
    out.adminListMar = adminGet.status;
    const adminTimeline = await api(
      admin.token,
      `/facilities/${facilityId}/mar-shift-timeline?shiftCode=7P_7A&encounterId=${encounterId}&includeCompleted=true`
    );
    out.adminTimeline = adminTimeline.status;
  } catch (e) {
    adminLogin = `FAIL ${e instanceof Error ? e.message.slice(0, 180) : String(e)}`;
  }
  out.adminLogin = adminLogin;

  const prisma = new PrismaClient();
  const pct = await prisma.user.findFirst({
    where: { email: { contains: "pct", mode: "insensitive" } },
    select: { email: true, id: true },
  });
  await prisma.$disconnect();
  out.pctUser = pct?.email ?? null;

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
