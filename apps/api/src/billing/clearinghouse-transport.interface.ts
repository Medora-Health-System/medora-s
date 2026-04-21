export type ClearinghouseSendInput = {
  facilityId: string;
  batchId: string;
  submissionId: string;
  x12Text: string;
  claimType: "PROFESSIONAL_837P" | "FACILITY_837I";
  transactionCtrl?: string | null;
};

export type ClearinghouseSendResult = {
  ok: boolean;
  requestMeta: Record<string, unknown>;
  responseMeta: Record<string, unknown>;
  errorMessage?: string;
  externalReference?: string;
};

export interface ClearinghouseTransport {
  readonly key: "MANUAL" | "STUB_API";
  send(input: ClearinghouseSendInput): Promise<ClearinghouseSendResult>;
}

export class ManualClearinghouseTransport implements ClearinghouseTransport {
  readonly key = "MANUAL" as const;

  async send(input: ClearinghouseSendInput): Promise<ClearinghouseSendResult> {
    const ts = new Date().toISOString();
    return {
      ok: true,
      requestMeta: {
        mode: "manual",
        timestamp: ts,
        submissionId: input.submissionId,
        batchId: input.batchId,
        bytes: Buffer.byteLength(input.x12Text, "utf8"),
        claimType: input.claimType,
      },
      responseMeta: {
        acceptedByTransport: true,
        note: "Manual transport accepted payload for audit/testing. No external network call performed.",
      },
      externalReference: `MANUAL-${input.submissionId}-${Date.now()}`,
    };
  }
}

export class StubApiClearinghouseTransport implements ClearinghouseTransport {
  readonly key = "STUB_API" as const;

  async send(input: ClearinghouseSendInput): Promise<ClearinghouseSendResult> {
    return {
      ok: false,
      requestMeta: {
        mode: "stub_api",
        submissionId: input.submissionId,
        batchId: input.batchId,
      },
      responseMeta: {
        configured: false,
        simulated: true,
      },
      errorMessage: "TRANSPORT_NOT_CONFIGURED",
    };
  }
}
