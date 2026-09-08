import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AuditAction, OrganizationDataExportFormat, OrganizationDataExportStatus } from "@prisma/client";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { assertFacilityAdminFacilityScope } from "./user-mutation-boundary";
import { EncounterChartExportService } from "../encounters/chart-export.service";
import { renderEncounterChartExportHtml } from "../encounters/chart-export-html.util";
import { buildStoredZip, readStoredZipEntries, type ZipEntryInput } from "./organization-data-export.zip";
import { DocumentSecureExportStorage, type SecureExportStorage } from "./organization-data-export.storage";
import { unwrapServerSecret, wrapServerSecret } from "../auth/mfa/server-secret-encryption.util";
import { createEncryptedExportEnvelope, parseEncryptedExportEnvelope } from "./organization-data-export-envelope";

const EXPORT_SCHEMA_VERSION = 1;
const ENCRYPTION_ALGORITHM = "AES-256-GCM";
const QUERY_BATCH_SIZE = 500;
const DEFAULT_TTL_HOURS = 24;

type SqlFileExportSpec = {
  filePath: string;
  queryBase: string;
  countQuery: string;
  format: "csv" | "jsonl";
  reconciliationKey: string;
};

type ExportedFileSummary = {
  path: string;
  sizeBytes: number;
  sha256: string;
  rowCount: number;
};

type RawRow = Record<string, unknown>;

function hashSha256Hex(input: Buffer | string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (value && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      out[key] = canonicalize(source[key]);
    }
    return out;
  }
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString("base64");
  return value;
}

function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function csvEscape(v: string): string {
  if (!/[",\n\r]/.test(v)) return v;
  return `"${v.replace(/"/g, "\"\"")}"`;
}

function scalarToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Buffer.isBuffer(value)) return value.toString("base64");
  if (typeof value === "object") return canonicalJsonStringify(value);
  return String(value);
}

function rowsToCsv(rows: RawRow[]): Buffer {
  if (rows.length === 0) return Buffer.from("", "utf8");
  const headers = Object.keys(rows[0] ?? {});
  const lines: string[] = [headers.join(",")];
  for (const row of rows) {
    const line = headers.map((header) => csvEscape(scalarToString(row[header]))).join(",");
    lines.push(line);
  }
  return Buffer.from(`${lines.join("\n")}\n`, "utf8");
}

function rowsToJsonl(rows: RawRow[]): Buffer {
  if (rows.length === 0) return Buffer.from("", "utf8");
  return Buffer.from(`${rows.map((row) => canonicalJsonStringify(row)).join("\n")}\n`, "utf8");
}

function ttlHours(): number {
  const parsed = Number(process.env.ORGANIZATION_EXPORT_DOWNLOAD_TTL_HOURS ?? DEFAULT_TTL_HOURS);
  if (!Number.isFinite(parsed)) return DEFAULT_TTL_HOURS;
  return Math.max(1, Math.floor(parsed));
}

function exportTimestamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function facilityExportSpecs(): SqlFileExportSpec[] {
  return [
    {
      filePath: "patients.csv",
      queryBase: `SELECT * FROM "Patient" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "Patient" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "patients",
    },
    {
      filePath: "encounters.csv",
      queryBase: `SELECT * FROM "Encounter" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "Encounter" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "encounters",
    },
    {
      filePath: "diagnoses.csv",
      queryBase: `SELECT * FROM "Diagnosis" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "Diagnosis" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "diagnoses",
    },
    {
      filePath: "procedures.csv",
      queryBase: `SELECT * FROM "DentalProcedureRecord" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "DentalProcedureRecord" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "procedures",
    },
    {
      filePath: "medications.csv",
      queryBase: `SELECT oi.* FROM "OrderItem" oi INNER JOIN "Order" o ON o."id" = oi."orderId" WHERE o."facilityId" = $1 AND oi."catalogItemType" = 'MEDICATION' ORDER BY oi."id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "OrderItem" oi INNER JOIN "Order" o ON o."id" = oi."orderId" WHERE o."facilityId" = $1 AND oi."catalogItemType" = 'MEDICATION'`,
      format: "csv",
      reconciliationKey: "medications",
    },
    {
      filePath: "medication-administrations.csv",
      queryBase: `SELECT * FROM "MedicationAdministration" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "MedicationAdministration" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "medicationAdministrations",
    },
    {
      filePath: "medication-dispenses.csv",
      queryBase: `SELECT * FROM "MedicationDispense" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "MedicationDispense" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "medicationDispenses",
    },
    {
      filePath: "medication-order-schedules.csv",
      queryBase: `SELECT * FROM "MedicationOrderSchedule" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "MedicationOrderSchedule" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "medicationOrderSchedules",
    },
    {
      filePath: "allergies.jsonl",
      queryBase: `SELECT p."id" AS "patientId", p."facilityId" AS "facilityId", (p."clinicalHistoryProfileJson"::jsonb)->'allergies' AS "allergies" FROM "Patient" p WHERE p."facilityId" = $1 AND jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies') = 'object' ORDER BY p."id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "Patient" p WHERE p."facilityId" = $1 AND jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies') = 'object'`,
      format: "jsonl",
      reconciliationKey: "allergies",
    },
    {
      filePath: "vitals.csv",
      queryBase: `SELECT * FROM "TriageVitalsReading" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "TriageVitalsReading" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "vitals",
    },
    {
      filePath: "laboratory-results.csv",
      queryBase: `SELECT r.* FROM "Result" r INNER JOIN "OrderItem" oi ON oi."id" = r."orderItemId" WHERE r."facilityId" = $1 AND oi."catalogItemType" = 'LAB' ORDER BY r."id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "Result" r INNER JOIN "OrderItem" oi ON oi."id" = r."orderItemId" WHERE r."facilityId" = $1 AND oi."catalogItemType" = 'LAB'`,
      format: "csv",
      reconciliationKey: "labResults",
    },
    {
      filePath: "imaging-results.csv",
      queryBase: `SELECT r.* FROM "Result" r INNER JOIN "OrderItem" oi ON oi."id" = r."orderItemId" WHERE r."facilityId" = $1 AND oi."catalogItemType" = 'RADIOLOGY' ORDER BY r."id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "Result" r INNER JOIN "OrderItem" oi ON oi."id" = r."orderItemId" WHERE r."facilityId" = $1 AND oi."catalogItemType" = 'RADIOLOGY'`,
      format: "csv",
      reconciliationKey: "imagingResults",
    },
    {
      filePath: "orders.csv",
      queryBase: `SELECT * FROM "Order" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "Order" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "orders",
    },
    {
      filePath: "order-items.csv",
      queryBase: `SELECT oi.* FROM "OrderItem" oi INNER JOIN "Order" o ON o."id" = oi."orderId" WHERE o."facilityId" = $1 ORDER BY oi."id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "OrderItem" oi INNER JOIN "Order" o ON o."id" = oi."orderId" WHERE o."facilityId" = $1`,
      format: "csv",
      reconciliationKey: "orderItems",
    },
    {
      filePath: "notes.csv",
      queryBase: `SELECT * FROM "EncounterNote" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "EncounterNote" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "notes",
    },
    {
      filePath: "provider-addenda.csv",
      queryBase: `SELECT * FROM "EncounterProviderAddendum" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "EncounterProviderAddendum" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "providerAddenda",
    },
    {
      filePath: "provider-documentation-versions.jsonl",
      queryBase: `SELECT * FROM "EncounterProviderDocumentationVersion" WHERE "facilityId" = $1 ORDER BY "encounterId", "versionNumber", "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "EncounterProviderDocumentationVersion" WHERE "facilityId" = $1`,
      format: "jsonl",
      reconciliationKey: "providerDocumentationVersions",
    },
    {
      filePath: "consents.csv",
      queryBase: `SELECT * FROM "EnterpriseDocument" WHERE "facilityId" = $1 AND ("type" ILIKE '%CONSENT%' OR "category" = 'LEGAL') ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "EnterpriseDocument" WHERE "facilityId" = $1 AND ("type" ILIKE '%CONSENT%' OR "category" = 'LEGAL')`,
      format: "csv",
      reconciliationKey: "consents",
    },
    {
      filePath: "documents.csv",
      queryBase: `SELECT * FROM "EnterpriseDocument" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "EnterpriseDocument" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "documents",
    },
    {
      filePath: "clinical-events.csv",
      queryBase: `SELECT * FROM "EncounterClinicalEvent" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "EncounterClinicalEvent" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "clinicalEvents",
    },
    {
      filePath: "care-plans.csv",
      queryBase: `SELECT * FROM "EncounterCarePlan" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "EncounterCarePlan" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "carePlans",
    },
    {
      filePath: "care-plan-progress.csv",
      queryBase: `SELECT * FROM "EncounterCarePlanProgress" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "EncounterCarePlanProgress" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "carePlanProgress",
    },
    {
      filePath: "care-plan-reviews.csv",
      queryBase: `SELECT * FROM "EncounterCarePlanReview" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "EncounterCarePlanReview" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "carePlanReviews",
    },
    {
      filePath: "enterprise-documents.csv",
      queryBase: `SELECT * FROM "EnterpriseDocumentPacketSource" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "EnterpriseDocumentPacketSource" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "enterpriseDocuments",
    },
    {
      filePath: "clinical-documentation-entries.csv",
      queryBase: `SELECT * FROM "EncounterClinicalDocumentationEntry" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "EncounterClinicalDocumentationEntry" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "clinicalDocumentationEntries",
    },
    {
      filePath: "triage.csv",
      queryBase: `SELECT * FROM "Triage" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "Triage" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "triage",
    },
    {
      filePath: "triage-vitals.csv",
      queryBase: `SELECT * FROM "TriageVitalsReading" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "TriageVitalsReading" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "triageVitals",
    },
    {
      filePath: "dental-tooth-findings.csv",
      queryBase: `SELECT * FROM "ToothFinding" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "ToothFinding" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "dentalToothFindings",
    },
    {
      filePath: "dental-dentition-states.csv",
      queryBase: `SELECT * FROM "PatientDentitionState" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "PatientDentitionState" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "dentalDentitionStates",
    },
    {
      filePath: "dental-periodontal-exams.csv",
      queryBase: `SELECT * FROM "DentalPeriodontalExam" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "DentalPeriodontalExam" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "dentalPeriodontalExams",
    },
    {
      filePath: "dental-treatments.csv",
      queryBase: `SELECT * FROM "DentalTreatmentPlan" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "DentalTreatmentPlan" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "dentalTreatments",
    },
    {
      filePath: "vaccine-administrations.csv",
      queryBase: `SELECT * FROM "VaccineAdministration" WHERE "facilityId" = $1 ORDER BY "id"`,
      countQuery: `SELECT COUNT(*)::bigint AS "count" FROM "VaccineAdministration" WHERE "facilityId" = $1`,
      format: "csv",
      reconciliationKey: "vaccineAdministrations",
    },
  ];
}

@Injectable()
export class OrganizationDataExportService {
  private readonly logger = new Logger(OrganizationDataExportService.name);
  private readonly exportStorage: SecureExportStorage;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly chartExportService: EncounterChartExportService,
    exportStorage: DocumentSecureExportStorage
  ) {
    this.exportStorage = exportStorage;
  }

  async requestExport(params: {
    actorUserId: string;
    facilityId: string;
    format: "ZIP" | "XLSX";
    ip?: string;
    userAgent?: string;
  }) {
    const { actorUserId, facilityId } = params;
    await assertFacilityAdminFacilityScope(this.prisma, actorUserId, facilityId);

    const facility = await this.prisma.facility.findFirst({
      where: { id: facilityId, isActive: true },
      select: { id: true, code: true, name: true },
    });
    if (!facility) throw new ForbiddenException("Établissement non autorisé.");
    if (params.format !== "ZIP") {
      throw new BadRequestException("Only ZIP export is currently supported.");
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!actor) throw new ForbiddenException("Authentication required");

    const decryptionSecret = crypto.randomBytes(32).toString("base64url");
    const exportKeyWrappedJson = wrapServerSecret(decryptionSecret);

    const row = await this.prisma.organizationDataExport.create({
      data: {
        facilityId,
        requestedByUserId: actor.id,
        status: OrganizationDataExportStatus.QUEUED,
        exportFormat: OrganizationDataExportFormat.ZIP,
        schemaVersion: EXPORT_SCHEMA_VERSION,
        exportKeyWrappedJson,
      },
      select: {
        id: true,
        requestedAt: true,
        status: true,
      },
    });

    await this.audit.log(AuditAction.ORGANIZATION_EXPORT_REQUESTED, "OrganizationDataExport", {
      userId: actor.id,
      facilityId,
      entityId: row.id,
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: {
        format: "ZIP",
        schemaVersion: EXPORT_SCHEMA_VERSION,
      },
    });

    this.scheduleProcessing(row.id);

    return {
      exportId: row.id,
      status: row.status,
      createdAt: row.requestedAt.toISOString(),
      decryptionSecret,
    };
  }

  async listExports(actorUserId: string, facilityId: string, limit: number, offset: number) {
    await assertFacilityAdminFacilityScope(this.prisma, actorUserId, facilityId);
    const rows = await this.prisma.organizationDataExport.findMany({
      where: { facilityId },
      orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: limit,
    });
    return rows.map((row) => this.toApiRow(row));
  }

  async getExport(actorUserId: string, facilityId: string, exportId: string) {
    await assertFacilityAdminFacilityScope(this.prisma, actorUserId, facilityId);
    const row = await this.prisma.organizationDataExport.findFirst({
      where: { id: exportId, facilityId },
    });
    if (!row) throw new NotFoundException("Export not found");
    return this.toApiRow(row);
  }

  async downloadExport(params: {
    actorUserId: string;
    facilityId: string;
    exportId: string;
    ip?: string;
    userAgent?: string;
  }) {
    const { actorUserId, facilityId, exportId } = params;
    await assertFacilityAdminFacilityScope(this.prisma, actorUserId, facilityId);
    const row = await this.prisma.organizationDataExport.findFirst({
      where: { id: exportId, facilityId },
    });
    if (!row) throw new NotFoundException("Export not found");
    if (row.status === OrganizationDataExportStatus.FAILED || row.status === OrganizationDataExportStatus.PROCESSING || row.status === OrganizationDataExportStatus.QUEUED) {
      throw new ConflictException("Export is not ready for download");
    }

    const now = new Date();
    if (row.expiresAt && row.expiresAt.getTime() <= now.getTime()) {
      if (row.status !== OrganizationDataExportStatus.EXPIRED) {
        await this.prisma.organizationDataExport.update({
          where: { id: row.id },
          data: { status: OrganizationDataExportStatus.EXPIRED },
        });
        await this.audit.log(AuditAction.ORGANIZATION_EXPORT_EXPIRED, "OrganizationDataExport", {
          userId: actorUserId,
          facilityId,
          entityId: row.id,
          metadata: { reason: "TTL_EXPIRED" },
        });
      }
      throw new ForbiddenException("Export expired");
    }

    if (!row.objectStorageKey) throw new NotFoundException("Encrypted artifact unavailable");
    if (!row.encryptedSha256) {
      await this.audit.log(AuditAction.ORGANIZATION_EXPORT_FAILED, "OrganizationDataExport", {
        userId: actorUserId,
        facilityId,
        entityId: row.id,
        metadata: {
          failureCode: "EXPORT_INTEGRITY_METADATA_MISSING",
          event: "ORGANIZATION_EXPORT_INTEGRITY_CHECK_FAILED",
          expectedSha256: null,
          actualSha256: null,
        },
      });
      throw new ConflictException("Encrypted artifact integrity metadata unavailable");
    }

    let expectedSha256: Buffer;
    try {
      expectedSha256 = this.parseSha256HexOrThrow(row.encryptedSha256);
    } catch (error) {
      await this.audit.log(AuditAction.ORGANIZATION_EXPORT_FAILED, "OrganizationDataExport", {
        userId: actorUserId,
        facilityId,
        entityId: row.id,
        metadata: {
          failureCode: "EXPORT_INTEGRITY_METADATA_INVALID",
          event: "ORGANIZATION_EXPORT_INTEGRITY_CHECK_FAILED",
          expectedSha256: row.encryptedSha256,
          actualSha256: null,
        },
      });
      throw error;
    }
    const encryptedArtifact = await this.exportStorage.read(row.objectStorageKey, row.id);
    if (!encryptedArtifact) throw new NotFoundException("Encrypted artifact unavailable");
    const actualSha256 = hashSha256Hex(encryptedArtifact);
    const actualSha256Buffer = Buffer.from(actualSha256, "hex");
    const hashMatch = expectedSha256.length === actualSha256Buffer.length && crypto.timingSafeEqual(expectedSha256, actualSha256Buffer);
    if (!hashMatch) {
      await this.audit.log(AuditAction.ORGANIZATION_EXPORT_FAILED, "OrganizationDataExport", {
        userId: actorUserId,
        facilityId,
        entityId: row.id,
        metadata: {
          failureCode: "EXPORT_INTEGRITY_CHECK_FAILED",
          event: "ORGANIZATION_EXPORT_INTEGRITY_CHECK_FAILED",
          expectedSha256: row.encryptedSha256.trim().toLowerCase(),
          actualSha256,
        },
      });
      throw new ConflictException("Encrypted artifact integrity check failed");
    }

    await this.prisma.organizationDataExport.update({
      where: { id: row.id },
      data: {
        downloadedAt: now,
        downloadedByUserId: actorUserId,
      },
    });

    await this.audit.log(AuditAction.ORGANIZATION_EXPORT_DOWNLOADED, "OrganizationDataExport", {
      userId: actorUserId,
      facilityId,
      entityId: row.id,
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: {
        format: row.exportFormat,
        encryptedSha256: row.encryptedSha256,
      },
    });

    return {
      fileName: `medora-export-${facilityId}-${exportTimestamp(row.requestedAt)}.zip.enc`,
      contentType: "application/octet-stream",
      buffer: encryptedArtifact,
    };
  }

  async verifyEncryptedArtifact(input: {
    encryptedArtifact: Buffer;
    decryptionSecret: string;
    ivBase64?: string;
    authTagBase64?: string;
    plaintextSha256: string;
  }) {
    const key = Buffer.from(input.decryptionSecret, "base64url");
    if (key.length !== 32) {
      throw new Error("Invalid export decryption secret.");
    }

    const magic = input.encryptedArtifact.subarray(0, 4).toString("ascii");
    const isMed1Envelope = magic === "MED1";

    let ciphertext = input.encryptedArtifact;
    let iv: Buffer;
    let authTag: Buffer;

    if (isMed1Envelope) {
      const parsed = parseEncryptedExportEnvelope(input.encryptedArtifact);
      if (parsed.algorithm !== ENCRYPTION_ALGORITHM) {
        throw new Error(`Unsupported export encryption algorithm: ${parsed.algorithm}`);
      }
      iv = parsed.iv;
      authTag = parsed.authTag;
      ciphertext = parsed.ciphertext;
    } else {
      if (!input.ivBase64 || !input.authTagBase64) {
        throw new Error("Legacy encrypted artifact requires ivBase64 and authTagBase64.");
      }
      iv = Buffer.from(input.ivBase64, "base64");
      authTag = Buffer.from(input.authTagBase64, "base64");
      if (iv.length !== 12) {
        throw new Error("Invalid legacy export IV.");
      }
      if (authTag.length !== 16) {
        throw new Error("Invalid legacy export auth tag.");
      }
    }

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const plaintextSha256 = hashSha256Hex(plaintext);
    if (plaintextSha256 !== input.plaintextSha256) {
      throw new Error("Plaintext package hash mismatch.");
    }

    const entries = readStoredZipEntries(plaintext);
    const manifestPath = [...entries.keys()].find((k) => k.endsWith("/manifest.json"));
    if (!manifestPath) throw new Error("manifest.json missing from export package.");
    const manifest = JSON.parse(entries.get(manifestPath)!.toString("utf8")) as {
      files?: Array<{ path: string; sha256: string; sizeBytes: number }>;
    };
    const rootPrefix = manifestPath.slice(0, manifestPath.length - "manifest.json".length);

    for (const file of manifest.files ?? []) {
      const fileBuffer = entries.get(`${rootPrefix}${file.path}`);
      if (!fileBuffer) throw new Error(`Missing file in package: ${file.path}`);
      const computed = hashSha256Hex(fileBuffer);
      if (computed !== file.sha256) throw new Error(`Hash mismatch for ${file.path}`);
      if (fileBuffer.length !== file.sizeBytes) throw new Error(`Size mismatch for ${file.path}`);
    }

    return { ok: true };
  }

  protected scheduleProcessing(exportId: string): void {
    // Known limitation: this is still in-process scheduling and is not durable
    // across process restarts. Durable queued workers are tracked as follow-up hardening.
    setTimeout(() => {
      void this.processQueuedExport(exportId);
    }, 0);
  }

  private async processQueuedExport(exportId: string): Promise<void> {
    const job = await this.prisma.organizationDataExport.findUnique({
      where: { id: exportId },
      select: {
        id: true,
        facilityId: true,
        requestedByUserId: true,
        exportFormat: true,
        status: true,
        exportKeyWrappedJson: true,
      },
    });
    if (!job) return;

    const claim = await this.prisma.organizationDataExport.updateMany({
      where: { id: job.id, status: OrganizationDataExportStatus.QUEUED },
      data: {
        status: OrganizationDataExportStatus.PROCESSING,
        startedAt: new Date(),
      },
    });
    if (claim.count !== 1) return;

    if (!job.exportKeyWrappedJson) {
      await this.failExport(job, "MISSING_EXPORT_SECRET", "Encryption secret is unavailable.");
      return;
    }

    let storedObjectKey: string | null = null;
    try {
      await this.audit.log(AuditAction.ORGANIZATION_EXPORT_STARTED, "OrganizationDataExport", {
        userId: job.requestedByUserId ?? undefined,
        facilityId: job.facilityId,
        entityId: job.id,
        metadata: { format: job.exportFormat },
      });

      const generatedAt = new Date();
      const decryptionSecret = unwrapServerSecret(job.exportKeyWrappedJson);
      const decryptionKey = Buffer.from(decryptionSecret, "base64url");
      if (decryptionKey.length !== 32) {
        throw new Error("Invalid export encryption secret.");
      }
      const pkg = await this.buildPlaintextPackage({
        facilityId: job.facilityId,
        requestedByUserId: job.requestedByUserId,
        generatedAt,
      });
      const plaintextSha256 = hashSha256Hex(pkg.zipBuffer);

      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", decryptionKey, iv);
      const ciphertext = Buffer.concat([cipher.update(pkg.zipBuffer), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const encryptedArtifact = createEncryptedExportEnvelope(ENCRYPTION_ALGORITHM, iv, authTag, ciphertext);
      const encryptedSha256 = hashSha256Hex(encryptedArtifact);
      const expiration = new Date(generatedAt.getTime() + ttlHours() * 3600_000);
      const fileName = `medora-export-${job.facilityId}-${exportTimestamp(generatedAt)}.zip.enc`;

      const stored = await this.exportStorage.put(job.id, job.facilityId, fileName, encryptedArtifact, {
        algorithm: ENCRYPTION_ALGORITHM,
        encryptedSha256,
      });
      storedObjectKey = stored.objectKey;

      await this.prisma.organizationDataExport.update({
        where: { id: job.id },
        data: {
          status: OrganizationDataExportStatus.COMPLETED,
          completedAt: new Date(),
          patientCount: pkg.patientCount,
          encounterCount: pkg.encounterCount,
          fileSizeBytes: BigInt(stored.sizeBytes),
          plaintextSha256,
          encryptedSha256,
          encryptionAlgorithm: ENCRYPTION_ALGORITHM,
          encryptionIvBase64: iv.toString("base64"),
          encryptionAuthTagBase64: authTag.toString("base64"),
          wrappedKeyReference: "mfa-secret-encryption:v1",
          objectStorageKey: storedObjectKey,
          expiresAt: expiration,
          failureCode: null,
          failureMessage: null,
        },
      });

      await this.audit.log(AuditAction.ORGANIZATION_EXPORT_COMPLETED, "OrganizationDataExport", {
        userId: job.requestedByUserId ?? undefined,
        facilityId: job.facilityId,
        entityId: job.id,
        metadata: {
          format: job.exportFormat,
          patientCount: pkg.patientCount,
          encounterCount: pkg.encounterCount,
          providerDocumentationVersionCount: pkg.providerDocumentationVersionCount,
          encryptedSha256,
        },
      });
    } catch (error) {
      if (storedObjectKey) {
        await this.cleanupPartialArtifact({
          exportId: job.id,
          facilityId: job.facilityId,
          objectKey: storedObjectKey,
        });
      }
      await this.failExport(
        job,
        "EXPORT_PROCESSING_FAILED",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async failExport(
    job: { id: string; facilityId: string; requestedByUserId: string | null },
    failureCode: string,
    failureMessage: string
  ) {
    const updated = await this.prisma.organizationDataExport.updateMany({
      where: {
        id: job.id,
        status: { in: [OrganizationDataExportStatus.QUEUED, OrganizationDataExportStatus.PROCESSING] },
      },
      data: {
        status: OrganizationDataExportStatus.FAILED,
        failedAt: new Date(),
        failureCode,
        failureMessage: failureMessage.slice(0, 4000),
      },
    });
    if (updated.count !== 1) return false;
    await this.audit.log(AuditAction.ORGANIZATION_EXPORT_FAILED, "OrganizationDataExport", {
      userId: job.requestedByUserId ?? undefined,
      facilityId: job.facilityId,
      entityId: job.id,
      metadata: { failureCode },
    });
    return true;
  }

  private async buildPlaintextPackage(args: {
    facilityId: string;
    requestedByUserId: string | null;
    generatedAt: Date;
  }): Promise<{
    zipBuffer: Buffer;
    patientCount: number;
    encounterCount: number;
    providerDocumentationVersionCount: number;
  }> {
    const [facility, requester] = await Promise.all([
      this.prisma.facility.findUnique({
        where: { id: args.facilityId },
        select: { id: true, code: true, name: true },
      }),
      args.requestedByUserId
        ? this.prisma.user.findUnique({
            where: { id: args.requestedByUserId },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve(null),
    ]);
    if (!facility) throw new Error("Facility not found for export.");

    const rootFolder = `medora-export-${facility.id}-${exportTimestamp(args.generatedAt)}`;
    const entries: ZipEntryInput[] = [];
    const files: ExportedFileSummary[] = [];
    const reconciledCounts: Record<string, number> = {};

    for (const spec of facilityExportSpecs()) {
      const rows = await this.readPagedRows(spec.queryBase, args.facilityId);
      const dbCount = await this.readCount(spec.countQuery, args.facilityId);
      if (rows.length !== dbCount) {
        throw new Error(`RECONCILIATION_MISMATCH:${spec.reconciliationKey}:${rows.length}:${dbCount}`);
      }
      reconciledCounts[spec.reconciliationKey] = dbCount;
      const content = spec.format === "jsonl" ? rowsToJsonl(rows) : rowsToCsv(rows);
      const sha256 = hashSha256Hex(content);
      files.push({ path: spec.filePath, sizeBytes: content.length, sha256, rowCount: rows.length });
      entries.push({ path: `${rootFolder}/${spec.filePath}`, data: content });
    }

    const clinicalRecords = await this.readPagedRows(
      `SELECT "id", "patientId" FROM "Encounter" WHERE "facilityId" = $1 ORDER BY "id"`,
      args.facilityId
    );
    for (const row of clinicalRecords) {
      const encounterId = typeof row.id === "string" ? row.id : "";
      const patientId = typeof row.patientId === "string" ? row.patientId : "";
      if (!encounterId || !patientId) continue;
      const manifest = await this.chartExportService.getManifest(
        args.facilityId,
        encounterId,
        args.requestedByUserId ?? undefined,
        undefined,
        undefined,
        { exportFormat: "html", skipAudit: true }
      );
      const html = Buffer.from(renderEncounterChartExportHtml(manifest), "utf8");
      const relPath = `clinical-records/${patientId}/${encounterId}.html`;
      files.push({ path: relPath, sizeBytes: html.length, sha256: hashSha256Hex(html), rowCount: 1 });
      entries.push({ path: `${rootFolder}/${relPath}`, data: html });
    }

    const readme = Buffer.from(
      [
        "Medora facility export package (encrypted container plaintext).",
        "",
        `Facility: ${facility.id} (${facility.code})`,
        `Generated at: ${args.generatedAt.toISOString()}`,
        "Encoding: UTF-8",
        "Timestamps: ISO-8601",
        "Integrity: SHA-256 per file + package level hash stored in export metadata.",
        "Encryption: AES-256-GCM (artifact distributed as .zip.enc).",
        "Security notice: encryption secret is delivered once and is never stored in plaintext.",
      ].join("\n"),
      "utf8"
    );
    files.push({ path: "README.txt", sizeBytes: readme.length, sha256: hashSha256Hex(readme), rowCount: 1 });
    entries.push({ path: `${rootFolder}/README.txt`, data: readme });

    const manifestPayload = {
      exportSchemaVersion: EXPORT_SCHEMA_VERSION,
      generatedAt: args.generatedAt.toISOString(),
      facility: {
        id: facility.id,
        code: facility.code,
        name: facility.name,
      },
      requestedBy: requester
        ? {
            userId: requester.id,
            firstName: requester.firstName,
            lastName: requester.lastName,
          }
        : null,
      patientCount: reconciledCounts.patients ?? 0,
      encounterCount: reconciledCounts.encounters ?? 0,
      files: files
        .map((f) => ({
          path: f.path,
          sizeBytes: f.sizeBytes,
          sha256: f.sha256,
        }))
        .sort((a, b) => a.path.localeCompare(b.path)),
      reconciliation: canonicalize(reconciledCounts),
    };
    const manifestBuffer = Buffer.from(`${canonicalJsonStringify(manifestPayload)}\n`, "utf8");
    entries.push({ path: `${rootFolder}/manifest.json`, data: manifestBuffer });

    const zipBuffer = buildStoredZip(entries, args.generatedAt);

    return {
      zipBuffer,
      patientCount: reconciledCounts.patients ?? 0,
      encounterCount: reconciledCounts.encounters ?? 0,
      providerDocumentationVersionCount: reconciledCounts.providerDocumentationVersions ?? 0,
    };
  }

  private async readPagedRows(queryBase: string, facilityId: string): Promise<RawRow[]> {
    const rows: RawRow[] = [];
    let offset = 0;
    while (true) {
      const pagedQuery = `${queryBase} LIMIT $2 OFFSET $3`;
      const page = (await this.prisma.$queryRawUnsafe(pagedQuery, facilityId, QUERY_BATCH_SIZE, offset)) as RawRow[];
      if (page.length === 0) break;
      rows.push(...page);
      offset += page.length;
      if (page.length < QUERY_BATCH_SIZE) break;
    }
    return rows;
  }

  private async readCount(countQuery: string, facilityId: string): Promise<number> {
    const rows = (await this.prisma.$queryRawUnsafe(countQuery, facilityId)) as Array<{ count?: number | bigint | string }>;
    const raw = rows[0]?.count ?? 0;
    if (typeof raw === "number") return raw;
    if (typeof raw === "bigint") return Number(raw);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toApiRow(row: {
    id: string;
    facilityId: string;
    status: OrganizationDataExportStatus;
    exportFormat: OrganizationDataExportFormat;
    requestedAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    failedAt: Date | null;
    patientCount: number;
    encounterCount: number;
    fileSizeBytes: bigint | null;
    plaintextSha256: string | null;
    encryptedSha256: string | null;
    encryptionAlgorithm: string | null;
    expiresAt: Date | null;
    downloadedAt: Date | null;
    failureCode: string | null;
    failureMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      facilityId: row.facilityId,
      status: row.status,
      exportFormat: row.exportFormat,
      requestedAt: row.requestedAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      failedAt: row.failedAt?.toISOString() ?? null,
      patientCount: row.patientCount,
      encounterCount: row.encounterCount,
      fileSizeBytes: row.fileSizeBytes ? Number(row.fileSizeBytes) : null,
      plaintextSha256: row.plaintextSha256,
      encryptedSha256: row.encryptedSha256,
      encryptionAlgorithm: row.encryptionAlgorithm,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      downloadedAt: row.downloadedAt?.toISOString() ?? null,
      failureCode: row.failureCode,
      failureMessage: this.sanitizeFailureMessageForPublicApi(row.failureCode, row.failureMessage),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private parseSha256HexOrThrow(value: string): Buffer {
    const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (!/^[0-9a-f]{64}$/.test(normalized)) {
      throw new ConflictException("Encrypted artifact integrity metadata invalid");
    }
    return Buffer.from(normalized, "hex");
  }

  private sanitizeFailureMessageForPublicApi(
    failureCode: string | null,
    failureMessage: string | null
  ): string | null {
    if (!failureMessage) return null;
    if (failureCode) {
      return `Export failed (${failureCode}).`;
    }
    return "Export failed.";
  }

  private async cleanupPartialArtifact(args: {
    exportId: string;
    facilityId: string;
    objectKey: string;
  }): Promise<void> {
    try {
      await this.exportStorage.delete(args.objectKey, args.exportId);
    } catch (error) {
      this.logger.error("export_partial_artifact_cleanup_failed", {
        exportId: args.exportId,
        facilityId: args.facilityId,
        objectKeySha256: hashSha256Hex(args.objectKey),
        errorName: error instanceof Error ? error.name : "unknown",
      });
    }
  }
}
