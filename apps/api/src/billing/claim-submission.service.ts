import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { ClaimExportPackage, EncounterClaimExportResult, EncounterX12ExportResult } from "@medora/shared";
import { ClaimSubmissionKind, ClaimSubmissionStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ClaimControlNumberService } from "./claim-control-number.service";
import { ClaimExportService } from "./claim-export.service";
import { X12837GeneratorService } from "./x12-837-generator.service";
import { X12EnvelopeBuilderService, type EnvelopeTransactionInput } from "./x12-envelope-builder.service";
import { evaluateSubmissionGate } from "./claim-submission-gate.util";

/** Missing-field codes that block READY_TO_SEND until payer / identity modeling is complete. */
const HARD_MISSING_FOR_READY = new Set([
  "MISSING_PAYER_CONTEXT",
  "MISSING_SUBSCRIBER_DATA",
  "MISSING_ENCOUNTER",
  "MISSING_PROVIDER_NPI",
]);

function computeSubmissionStatus(params: {
  exportSummary: EncounterClaimExportResult["summary"];
  packageHeader: ClaimExportPackage["header"] | null;
  x12Missing: string[];
}): ClaimSubmissionStatus {
  const { exportSummary, packageHeader, x12Missing } = params;
  const gate = evaluateSubmissionGate(exportSummary);
  if (!gate.allowed) {
    return ClaimSubmissionStatus.DRAFT;
  }
  if (!packageHeader?.ready) {
    return ClaimSubmissionStatus.GENERATED;
  }
  if (x12Missing.some((m) => HARD_MISSING_FOR_READY.has(m))) {
    return ClaimSubmissionStatus.GENERATED;
  }
  if (x12Missing.length > 0) {
    return ClaimSubmissionStatus.GENERATED;
  }
  return ClaimSubmissionStatus.READY_TO_SEND;
}

export type ClaimSubmissionSummaryDto = {
  id: string;
  facilityId: string;
  encounterId: string;
  claimType: ClaimSubmissionKind;
  status: ClaimSubmissionStatus;
  batchId: string | null;
  transactionCtrl: string | null;
  externalReference: string | null;
  warnings: string[];
  missingFields: string[];
  createdAt: string;
  updatedAt: string;
};

export type ClaimSubmissionBatchResponseDto = {
  id: string;
  facilityId: string;
  interchangeCtrl: string;
  groupCtrl: string;
  senderId: string | null;
  receiverId: string | null;
  interchangeX12Text: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSubmissionBatchResponseDto = {
  batch: ClaimSubmissionBatchResponseDto;
  submissions: ClaimSubmissionSummaryDto[];
  envelopeWarnings: string[];
};

export type EncounterSubmissionArtifactsDto = {
  batchDraft: {
    interchangeCtrl: string;
    groupCtrl: string;
    senderId: string | null;
    receiverId: string | null;
    interchangeX12Text: string;
  };
  submissionDrafts: {
    claimType: ClaimSubmissionKind;
    status: ClaimSubmissionStatus;
    transactionCtrl: string;
    x12Text: string;
    exportJson: unknown;
    warningsJson: string[];
    missingFieldsJson: string[];
  }[];
  envelopeWarnings: string[];
};

function jsonStringArray(j: Prisma.JsonValue | null): string[] {
  if (Array.isArray(j) && j.every((x) => typeof x === "string")) {
    return j as string[];
  }
  return [];
}

@Injectable()
export class ClaimSubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly claimExport: ClaimExportService,
    private readonly x12837: X12837GeneratorService,
    private readonly envelope: X12EnvelopeBuilderService,
    private readonly controlNumbers: ClaimControlNumberService
  ) {}

  async buildEncounterSubmissionArtifacts(facilityId: string, encounterId: string): Promise<EncounterSubmissionArtifactsDto> {
    const m = await this.materializeSubmissionSnapshot(facilityId, encounterId);
    return {
      batchDraft: m.batchDraft,
      submissionDrafts: m.submissionRows,
      envelopeWarnings: m.envelopeWarnings,
    };
  }

  async createSubmissionBatchForEncounter(
    facilityId: string,
    encounterId: string
  ): Promise<CreateSubmissionBatchResponseDto> {
    const built = await this.materializeSubmissionSnapshot(facilityId, encounterId);

    const batch = await this.prisma.claimSubmissionBatch.create({
      data: {
        facilityId,
        interchangeCtrl: built.batchDraft.interchangeCtrl,
        groupCtrl: built.batchDraft.groupCtrl,
        senderId: built.batchDraft.senderId,
        receiverId: built.batchDraft.receiverId,
        interchangeX12Text: built.batchDraft.interchangeX12Text,
      },
    });

    const submissions: ClaimSubmissionSummaryDto[] = [];

    for (const row of built.submissionRows) {
      const created = await this.prisma.claimSubmission.create({
        data: {
          facilityId,
          encounterId,
          claimType: row.claimType,
          status: row.status,
          batchId: batch.id,
          transactionCtrl: row.transactionCtrl,
          x12Text: row.x12Text,
          exportJson: row.exportJson as Prisma.InputJsonValue,
          warningsJson: row.warningsJson as Prisma.InputJsonValue,
          missingFieldsJson: row.missingFieldsJson as Prisma.InputJsonValue,
        },
      });
      submissions.push(this.toSummaryDto(created));
    }

    return {
      batch: this.batchToDto(batch),
      submissions,
      envelopeWarnings: built.envelopeWarnings,
    };
  }

  async getSubmissionById(facilityId: string, submissionId: string) {
    const s = await this.prisma.claimSubmission.findFirst({
      where: { id: submissionId, facilityId },
    });
    if (!s) {
      throw new NotFoundException("Submission not found");
    }
    return {
      ...this.toSummaryDto(s),
      x12Text: s.x12Text,
      exportJson: s.exportJson,
      warnings: jsonStringArray(s.warningsJson),
      missingFields: jsonStringArray(s.missingFieldsJson),
      externalReference: s.externalReference,
    };
  }

  async listSubmissionsForEncounter(facilityId: string, encounterId: string): Promise<ClaimSubmissionSummaryDto[]> {
    const rows = await this.prisma.claimSubmission.findMany({
      where: { facilityId, encounterId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toSummaryDto(r));
  }

  private batchToDto(b: {
    id: string;
    facilityId: string;
    interchangeCtrl: string;
    groupCtrl: string;
    senderId: string | null;
    receiverId: string | null;
    interchangeX12Text: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ClaimSubmissionBatchResponseDto {
    return {
      id: b.id,
      facilityId: b.facilityId,
      interchangeCtrl: b.interchangeCtrl,
      groupCtrl: b.groupCtrl,
      senderId: b.senderId,
      receiverId: b.receiverId,
      interchangeX12Text: b.interchangeX12Text,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }

  private toSummaryDto(s: {
    id: string;
    facilityId: string;
    encounterId: string;
    claimType: ClaimSubmissionKind;
    status: ClaimSubmissionStatus;
    batchId: string | null;
    transactionCtrl: string | null;
    externalReference: string | null;
    warningsJson: Prisma.JsonValue | null;
    missingFieldsJson: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }): ClaimSubmissionSummaryDto {
    return {
      id: s.id,
      facilityId: s.facilityId,
      encounterId: s.encounterId,
      claimType: s.claimType,
      status: s.status,
      batchId: s.batchId,
      transactionCtrl: s.transactionCtrl,
      externalReference: s.externalReference,
      warnings: jsonStringArray(s.warningsJson),
      missingFields: jsonStringArray(s.missingFieldsJson),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  private async materializeSubmissionSnapshot(facilityId: string, encounterId: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }

    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { code: true },
    });
    const senderId = facility?.code ? facility.code.slice(0, 15) : "MEDORA";
    const receiverId: string | null = null;

    let exportResult: EncounterClaimExportResult;
    try {
      exportResult = await this.claimExport.buildEncounterClaimExport(facilityId, encounterId);
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw e;
    }

    const x12Preview = await this.x12837.buildEncounterX12Preview(facilityId, encounterId);

    const hasProf = exportResult.professional != null && x12Preview.professional != null;
    const hasFac = exportResult.facility != null && x12Preview.facility != null;

    if (!hasProf && !hasFac) {
      throw new BadRequestException("No claim export packages available for submission preview");
    }

    const interchangeCtrl = await this.controlNumbers.nextNineDigitControl(facilityId, "ISA");
    const groupCount = (hasProf ? 1 : 0) + (hasFac ? 1 : 0);
    const groupControls: string[] = [];
    for (let i = 0; i < groupCount; i++) {
      groupControls.push(await this.controlNumbers.nextNineDigitControl(facilityId, "GS"));
    }

    const txs: EnvelopeTransactionInput[] = [];
    const txCtrls: string[] = [];

    if (hasProf) {
      txCtrls.push(await this.controlNumbers.nextNineDigitControl(facilityId, "ST"));
      txs.push({
        kind: "837P",
        segments: x12Preview.professional!.segments,
        transactionControl: txCtrls[txCtrls.length - 1]!,
      });
    }
    if (hasFac) {
      txCtrls.push(await this.controlNumbers.nextNineDigitControl(facilityId, "ST"));
      txs.push({
        kind: "837I",
        segments: x12Preview.facility!.segments,
        transactionControl: txCtrls[txCtrls.length - 1]!,
      });
    }

    const built = this.envelope.buildInterchange({
      interchangeCtrl,
      senderId,
      receiverId: receiverId ?? "",
      transactions: txs,
      groupControls,
    });

    const submissionRows: {
      claimType: ClaimSubmissionKind;
      status: ClaimSubmissionStatus;
      transactionCtrl: string;
      x12Text: string;
      exportJson: unknown;
      warningsJson: string[];
      missingFieldsJson: string[];
    }[] = [];

    let bodyIdx = 0;
    if (hasProf) {
      const prev = x12Preview.professional!;
      const status = computeSubmissionStatus({
        exportSummary: exportResult.summary,
        packageHeader: exportResult.professional!.header,
        x12Missing: prev.missingFields,
      });
      submissionRows.push({
        claimType: ClaimSubmissionKind.PROFESSIONAL_837P,
        status,
        transactionCtrl: txCtrls[bodyIdx]!,
        x12Text: built.transactionBodies[bodyIdx]?.text ?? "",
        exportJson: exportResult.professional,
        warningsJson: [...prev.warnings, ...built.warnings],
        missingFieldsJson: prev.missingFields,
      });
      bodyIdx++;
    }
    if (hasFac) {
      const prev = x12Preview.facility!;
      const status = computeSubmissionStatus({
        exportSummary: exportResult.summary,
        packageHeader: exportResult.facility!.header,
        x12Missing: prev.missingFields,
      });
      submissionRows.push({
        claimType: ClaimSubmissionKind.FACILITY_837I,
        status,
        transactionCtrl: txCtrls[bodyIdx]!,
        x12Text: built.transactionBodies[bodyIdx]?.text ?? "",
        exportJson: exportResult.facility,
        warningsJson: [...prev.warnings, ...built.warnings],
        missingFieldsJson: prev.missingFields,
      });
      bodyIdx++;
    }

    return {
      batchDraft: {
        interchangeCtrl,
        groupCtrl: groupControls[0] ?? interchangeCtrl,
        senderId,
        receiverId,
        interchangeX12Text: built.fullText,
      },
      submissionRows,
      envelopeWarnings: built.warnings,
    };
  }
}
