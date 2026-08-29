import { InpatientLifecycleService } from "./inpatient-lifecycle.service";

describe("InpatientLifecycleService D4A.2.5", () => {
  function build(overrides?: {
    orderCount?: number;
    marCount?: number;
    noteCount?: number;
    status?: string;
  }) {
    const encounter = {
      id: "enc-1",
      facilityId: "fac-1",
      patientId: "pat-1",
      type: "INPATIENT",
      status: overrides?.status ?? "OPEN",
      roomLabel: "MS-2",
      admittedAt: new Date(),
      physicianAssignedUserId: null,
      nurseAssignedUserId: "rn-1",
      admissionSummaryJson: {
        admissionSource: "DIRECT",
        assignedBedKey: "MS:2",
      },
      version: 1,
    };
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(encounter),
        update: jest.fn().mockResolvedValue({ id: "enc-1" }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      encounterLifecycleTransition: {
        create: jest.fn().mockResolvedValue({ id: "lt-1" }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      order: { count: jest.fn().mockResolvedValue(overrides?.orderCount ?? 0) },
      medicationAdministration: {
        count: jest.fn().mockResolvedValue(overrides?.marCount ?? 0),
      },
      encounterNote: { count: jest.fn().mockResolvedValue(overrides?.noteCount ?? 0) },
      $transaction: jest.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          encounter: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findFirst: jest.fn().mockResolvedValue(encounter),
          },
          encounterLifecycleTransition: {
            create: jest.fn().mockResolvedValue({ id: "lt-1" }),
            findFirst: jest.fn().mockResolvedValue(null),
          },
          encounterClinicalEvent: {
            create: jest.fn().mockResolvedValue({ id: "evt-1" }),
          },
        })
      ),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const bedBoardService = {
      getEffectiveBedRow: jest.fn().mockResolvedValue({
        bedKey: "MS:3",
        status: "AVAILABLE",
        occupantEncounterId: null,
      }),
    };
    const enterpriseLifecycle = {
      applyCloseTransition: jest.fn().mockResolvedValue({
        closedAt: new Date(),
        transitionType: "ENCOUNTER_CLOSED",
        sequence: 1,
      }),
      recordLifecycleTransition: jest.fn().mockResolvedValue(1),
    };
    const svc = new InpatientLifecycleService(
      prisma as never,
      audit as never,
      bedBoardService as never,
      enterpriseLifecycle as never
    );
    return { svc, prisma, audit, bedBoardService, enterpriseLifecycle };
  }

  it("edit admission details retains prior values in lifecycle audit history", async () => {
    const { svc, prisma, audit } = build();
    const res = await svc.editAdmissionDetails("fac-1", "enc-1", "admin-1", {
      admissionDiagnosis: "Pneumonia",
      reasonForAdmission: "IV antibiotics",
      editReason: "Correct diagnosis spelling",
    });
    expect(res.changedFields).toEqual(
      expect.arrayContaining(["admissionDiagnosis", "reasonForAdmission"])
    );
    expect(prisma.encounter.update).toHaveBeenCalled();
    const data = prisma.encounter.update.mock.calls[0][0].data;
    expect(data.admissionSummaryJson.inpatientLifecycleV1.admissionDetailEdits.length).toBe(1);
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      "InpatientLifecycle",
      expect.objectContaining({
        metadata: expect.objectContaining({ event: "INPATIENT_ADMISSION_DETAILS_EDITED" }),
      })
    );
  });

  it("transfer bed updates roomLabel and records from/to", async () => {
    const { svc, prisma } = build();
    const res = await svc.transferBed("fac-1", "enc-1", "rn-1", {
      toBedKey: "MS:3",
      reason: "Closer to nursing station",
    });
    expect(res.toBedKey).toBe("MS:3");
    expect(res.fromBedKey).toBe("MS:2");
    const data = prisma.encounter.update.mock.calls[0][0].data;
    expect(data.roomLabel).toBe("MS-3");
    expect(data.admissionSummaryJson.assignedBedKey).toBe("MS:3");
  });

  it("discharge closes encounter via enterprise lifecycle authority without deleting chart", async () => {
    const { svc, prisma, enterpriseLifecycle } = build();
    const res = await svc.dischargeEncounter("fac-1", "enc-1", "rn-1", {
      disposition: "HOME",
    });
    expect(res.status).toBe("CLOSED");
    expect(enterpriseLifecycle.applyCloseTransition).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
    const closeArg = enterpriseLifecycle.applyCloseTransition.mock.calls[0][1];
    expect(closeArg.forceDischargedAt).toBe(true);
    expect(closeArg.clearRoomLabel).toBe(true);
    expect(closeArg.extraData.disposition).toBe("HOME");
  });

  it("discharge persists clinicalEventOnClose inside the close transaction", async () => {
    const { svc, prisma } = build();
    const clinicalEventCreate = jest.fn().mockResolvedValue({ id: "evt-final" });
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        encounter: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findFirst: jest.fn().mockResolvedValue({ id: "enc-1" }),
        },
        encounterLifecycleTransition: {
          create: jest.fn().mockResolvedValue({ id: "lt-1" }),
          findFirst: jest.fn().mockResolvedValue(null),
        },
        encounterClinicalEvent: { create: clinicalEventCreate },
      })
    );

    await svc.dischargeEncounter("fac-1", "enc-1", "rn-1", {
      disposition: "ELOPED",
      clinicalDispositionCode: "ELOPED",
      dischargeStatus: "AMA",
      clinicalEventOnClose: {
        eventType: "DISCHARGE_SUMMARY_SAVED",
        createdByUserId: "rn-1",
        payloadJson: {
          event: "INPATIENT_FINAL_DISCHARGE_COMPLETED",
          clinicalDispositionCode: "ELOPED",
          lifecycleStatus: "AMA",
        },
      },
    });

    expect(clinicalEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          encounterId: "enc-1",
          eventType: "DISCHARGE_SUMMARY_SAVED",
          payloadJson: expect.objectContaining({
            clinicalDispositionCode: "ELOPED",
            lifecycleStatus: "AMA",
          }),
        }),
      })
    );
  });

  it("discharge rolls back when final clinical event persistence fails", async () => {
    const { svc, prisma, enterpriseLifecycle } = build();
    const clinicalEventCreate = jest.fn().mockRejectedValue(new Error("event persistence failed"));
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        encounter: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findFirst: jest.fn().mockResolvedValue({ id: "enc-1" }),
        },
        encounterLifecycleTransition: {
          create: jest.fn().mockResolvedValue({ id: "lt-1" }),
          findFirst: jest.fn().mockResolvedValue(null),
        },
        encounterClinicalEvent: { create: clinicalEventCreate },
      })
    );

    await expect(
      svc.dischargeEncounter("fac-1", "enc-1", "rn-1", {
        disposition: "HOME",
        clinicalEventOnClose: {
          eventType: "DISCHARGE_SUMMARY_SAVED",
          createdByUserId: "rn-1",
          payloadJson: { event: "INPATIENT_FINAL_DISCHARGE_COMPLETED" },
        },
      })
    ).rejects.toThrow("event persistence failed");

    expect(enterpriseLifecycle.applyCloseTransition).toHaveBeenCalled();
    expect(clinicalEventCreate).toHaveBeenCalled();
  });

  it("cancel admission retains record and rejects substantial clinical activity", async () => {
    const blocked = build({ orderCount: 2 });
    await expect(
      blocked.svc.cancelAdmission("fac-1", "enc-1", "admin-1", {
        reasonCode: "CREATED_IN_ERROR",
        explanation: "Duplicate chart opened",
      })
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: "CANCEL_NOT_ALLOWED_AFTER_CARE" }) });

    const { svc, prisma } = build({ orderCount: 0, marCount: 0, noteCount: 0 });
    const res = await svc.cancelAdmission("fac-1", "enc-1", "admin-1", {
      reasonCode: "CREATED_IN_ERROR",
      explanation: "Duplicate chart opened",
    });
    expect(res.status).toBe("CANCELLED");
    expect(prisma.encounter.update.mock.calls[0][0].data.status).toBe("CANCELLED");
    expect(JSON.stringify(prisma.encounter.update.mock.calls)).not.toMatch(/deleteMany|hardDelete/i);
  });

  it("void never hard-deletes and requires confirm", async () => {
    const { svc } = build();
    await expect(
      svc.voidEncounter("fac-1", "enc-1", "admin-1", {
        reason: "Wrong patient selected",
        confirm: false,
      })
    ).rejects.toMatchObject({ message: expect.stringMatching(/confirm/i) });

    const ok = build();
    const res = await ok.svc.voidEncounter("fac-1", "enc-1", "admin-1", {
      reason: "Wrong patient selected",
      confirm: true,
    });
    expect(res.hardDeleted).toBe(false);
    expect(res.voided).toBe(true);
    expect(ok.prisma.encounter.update).toHaveBeenCalled();
  });
});
