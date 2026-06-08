import { BadRequestException } from "@nestjs/common";
import {
  MedicationVerificationStatus,
  MedicationVerificationType,
  MedicationWasteStatus,
} from "@prisma/client";
import {
  assertContinuousInfusionSchedulingGateForScenario,
  assertDirectMarSchedulingGateForScenario,
  buildMarAdministrationTestHarness,
  expectOrderLineCompleted,
  expectOrderLineNotCompleted,
  makeMarTestCatalog,
  makeMarTestOrderItem,
  MAR_REGRESSION_CATALOG_PRESETS,
  MEDICATION_SCHEDULING_REGRESSION_FLAG_SCENARIOS,
  submitTerminalMarAdministered,
  type SchedulingFlagScenario,
} from "./mar-administration-test-harness";

function describeSchedulingRegression(
  apiId: string,
  title: string,
  fn: (scenario: SchedulingFlagScenario) => void
) {
  describe.each(MEDICATION_SCHEDULING_REGRESSION_FLAG_SCENARIOS)(
    `${apiId} — ${title} [flags $id: $label]`,
    (scenario) => {
      fn(scenario);
    }
  );
}

describe("M1.8B.6D medication completion contract regression", () => {
  describeSchedulingRegression("API-01", "NOW order → terminal MAR → OrderItem.COMPLETED", (scenario) => {
    it("completes the order line on terminal MAR", async () => {
      assertDirectMarSchedulingGateForScenario(scenario, "NOW");
      const catalog = makeMarTestCatalog();
      const orderItem = makeMarTestOrderItem({
        catalogItemId: catalog.id,
        notes: "frequency:NOW",
      });
      const { service, orderItemUpdate } = buildMarAdministrationTestHarness({ catalog, orderItem });

      await submitTerminalMarAdministered(service, String(orderItem.id));

      expectOrderLineCompleted(orderItemUpdate);
    });
  });

  describeSchedulingRegression("API-02", "STAT order → terminal MAR → OrderItem.COMPLETED", (scenario) => {
    it("completes the order line on terminal MAR", async () => {
      assertDirectMarSchedulingGateForScenario(scenario, "STAT");
      const catalog = makeMarTestCatalog();
      const orderItem = makeMarTestOrderItem({
        catalogItemId: catalog.id,
        notes: "frequency:STAT",
      });
      const { service, orderItemUpdate } = buildMarAdministrationTestHarness({ catalog, orderItem });

      await submitTerminalMarAdministered(service, String(orderItem.id));

      expectOrderLineCompleted(orderItemUpdate);
    });
  });

  describeSchedulingRegression("API-03", "ONCE order → terminal MAR → OrderItem.COMPLETED", (scenario) => {
    it("completes the order line on terminal MAR", async () => {
      assertDirectMarSchedulingGateForScenario(scenario, "ONCE");
      const catalog = makeMarTestCatalog();
      const orderItem = makeMarTestOrderItem({
        catalogItemId: catalog.id,
        notes: "frequency:ONCE",
      });
      const { service, orderItemUpdate } = buildMarAdministrationTestHarness({ catalog, orderItem });

      await submitTerminalMarAdministered(service, String(orderItem.id));

      expectOrderLineCompleted(orderItemUpdate);
    });
  });

  describeSchedulingRegression(
    "API-04",
    "legacy frequency-less order → terminal MAR → OrderItem.COMPLETED",
    (scenario) => {
      it("completes the order line on terminal MAR", async () => {
        assertDirectMarSchedulingGateForScenario(scenario, null);
        const catalog = makeMarTestCatalog();
        const orderItem = makeMarTestOrderItem({
          catalogItemId: catalog.id,
          notes: null,
        });
        const { service, orderItemUpdate } = buildMarAdministrationTestHarness({ catalog, orderItem });

        await submitTerminalMarAdministered(service, String(orderItem.id));

        expectOrderLineCompleted(orderItemUpdate);
      });
    }
  );

  describeSchedulingRegression("API-05", "infusion START → line NOT completed", (scenario) => {
    it("does not complete the order line on infusion START MAR", async () => {
      assertContinuousInfusionSchedulingGateForScenario(scenario);
      const catalog = MAR_REGRESSION_CATALOG_PRESETS.infusionVancomycin;
      const orderItem = makeMarTestOrderItem({
        id: "oi-infusion",
        catalogItemId: catalog.id,
        status: "IN_PROGRESS",
        route: "IV",
        notes: "frequency:CONTINUOUS",
      });
      const medicationAdministrationFindFirst = jest.fn().mockResolvedValue(null);
      const { service, orderItemUpdate } = buildMarAdministrationTestHarness({
        catalog,
        orderItem,
        medicationAdministrationFindFirst,
      });

      await service.createInfusionStartMar("enc-1", "fac-1", "nurse-1", {
        orderItemId: String(orderItem.id),
        infusionSessionKey: "inf-sess-1",
        startedAt: new Date("2026-05-16T12:00:00Z"),
        route: "IV",
      });

      expectOrderLineNotCompleted(orderItemUpdate);
    });
  });

  describeSchedulingRegression("API-06", "infusion STOP → line COMPLETED", (scenario) => {
    it("completes the order line on infusion STOP terminal MAR", async () => {
      assertContinuousInfusionSchedulingGateForScenario(scenario);
      const catalog = MAR_REGRESSION_CATALOG_PRESETS.infusionVancomycin;
      const orderItem = makeMarTestOrderItem({
        id: "oi-infusion-stop",
        catalogItemId: catalog.id,
        status: "IN_PROGRESS",
        route: "IV",
        notes: "frequency:CONTINUOUS",
      });
      const { service, orderItemUpdate } = buildMarAdministrationTestHarness({ catalog, orderItem });

      await service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: String(orderItem.id),
        marAction: "administered",
        administeredAt: new Date("2026-05-16T14:00:00Z"),
        route: "IV",
      }, {
        allowAdministeredForInfusionTerminal: true,
        skipAutoMedicationCatalogBilling: true,
        skipDuplicateAdministeredWindowCheck: true,
        infusionMar: {
          infusionSessionKey: "inf-sess-1",
          infusionPhase: "INFUSION_STOP",
        },
      });

      expectOrderLineCompleted(orderItemUpdate);
    });
  });

  describeSchedulingRegression(
    "API-07",
    "blood infusion lifecycle + double-check witness contract",
    (scenario) => {
      it("A — rejects direct terminal MAR without high-alert verifier (witness required)", async () => {
        assertDirectMarSchedulingGateForScenario(scenario, null);
        const catalog = MAR_REGRESSION_CATALOG_PRESETS.blood;
        const orderItem = makeMarTestOrderItem({
          catalogItemId: catalog.id,
          route: "IV",
          status: "IN_PROGRESS",
        });
        const { service, marCreate, verificationCreate } = buildMarAdministrationTestHarness({
          catalog,
          orderItem,
        });

        await expect(
          submitTerminalMarAdministered(service, String(orderItem.id), { route: "IV" })
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            message: expect.stringContaining("Double vérification requise"),
          }),
        });
        expect(marCreate).not.toHaveBeenCalled();
        expect(verificationCreate).not.toHaveBeenCalled();
      });

      it("rejects direct terminal MAR even when verifier provided (infusion lifecycle required)", async () => {
        assertDirectMarSchedulingGateForScenario(scenario, null);
        const catalog = MAR_REGRESSION_CATALOG_PRESETS.blood;
        const orderItem = makeMarTestOrderItem({
          catalogItemId: catalog.id,
          route: "IV",
          status: "IN_PROGRESS",
        });
        const { service, marCreate, verificationCreate } = buildMarAdministrationTestHarness({
          catalog,
          orderItem,
        });

        await expect(
          submitTerminalMarAdministered(service, String(orderItem.id), {
            route: "IV",
            highAlertVerifierUserId: "rn-2",
          })
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            message: expect.stringContaining("infusion start/stop"),
          }),
        });
        expect(marCreate).not.toHaveBeenCalled();
        expect(verificationCreate).not.toHaveBeenCalled();
      });

      it("B/C — infusion START succeeds and order line stays active", async () => {
        assertDirectMarSchedulingGateForScenario(scenario, null);
        const catalog = MAR_REGRESSION_CATALOG_PRESETS.blood;
        const orderItem = makeMarTestOrderItem({
          id: "oi-blood-infusion",
          catalogItemId: catalog.id,
          status: "IN_PROGRESS",
          route: "IV",
        });
        const medicationAdministrationFindFirst = jest.fn().mockResolvedValue(null);
        const { service, marCreate, orderItemUpdate } = buildMarAdministrationTestHarness({
          catalog,
          orderItem,
          medicationAdministrationFindFirst,
        });

        await service.createInfusionStartMar("enc-1", "fac-1", "nurse-1", {
          orderItemId: String(orderItem.id),
          infusionSessionKey: "blood-sess-1",
          startedAt: new Date("2026-05-16T12:00:00Z"),
          route: "IV",
        });

        expect(marCreate).toHaveBeenCalled();
        expectOrderLineNotCompleted(orderItemUpdate);
      });

      it("D/E — infusion STOP with verifier completes order line only at terminal STOP", async () => {
        assertDirectMarSchedulingGateForScenario(scenario, null);
        const catalog = MAR_REGRESSION_CATALOG_PRESETS.blood;
        const orderItem = makeMarTestOrderItem({
          id: "oi-blood-infusion-stop",
          catalogItemId: catalog.id,
          status: "IN_PROGRESS",
          route: "IV",
        });
        const medicationAdministrationFindFirst = jest.fn().mockResolvedValue(null);
        const { service, marCreate, orderItemUpdate } = buildMarAdministrationTestHarness({
          catalog,
          orderItem,
          medicationAdministrationFindFirst,
        });

        await service.createInfusionStartMar("enc-1", "fac-1", "nurse-1", {
          orderItemId: String(orderItem.id),
          infusionSessionKey: "blood-sess-1",
          startedAt: new Date("2026-05-16T12:00:00Z"),
          route: "IV",
        });
        expectOrderLineNotCompleted(orderItemUpdate);

        await service.create(
          "enc-1",
          "fac-1",
          "nurse-1",
          {
            orderItemId: String(orderItem.id),
            marAction: "administered",
            administeredAt: new Date("2026-05-16T14:00:00Z"),
            route: "IV",
            highAlertVerifierUserId: "rn-2",
          },
          {
            allowAdministeredForInfusionTerminal: true,
            skipAutoMedicationCatalogBilling: true,
            skipDuplicateAdministeredWindowCheck: true,
            infusionMar: {
              infusionSessionKey: "blood-sess-1",
              infusionPhase: "INFUSION_STOP",
            },
          }
        );

        expect(marCreate).toHaveBeenCalledTimes(2);
        expectOrderLineCompleted(orderItemUpdate);
      });
    }
  );

  describeSchedulingRegression("API-08", "insulin SQ → witness required", (scenario) => {
    it("rejects insulin SQ MAR without verifier", async () => {
      assertDirectMarSchedulingGateForScenario(scenario, null);
      const catalog = MAR_REGRESSION_CATALOG_PRESETS.insulin;
      const orderItem = makeMarTestOrderItem({
        catalogItemId: catalog.id,
        route: "SQ",
      });
      const { service, marCreate } = buildMarAdministrationTestHarness({ catalog, orderItem });

      await expect(
        submitTerminalMarAdministered(service, String(orderItem.id), { route: "SQ" })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(marCreate).not.toHaveBeenCalled();
    });
  });

  describeSchedulingRegression("API-09", "heparin SQ → witness exempt", (scenario) => {
    it("allows heparin SQ MAR without high-alert verifier", async () => {
      assertDirectMarSchedulingGateForScenario(scenario, null);
      const catalog = MAR_REGRESSION_CATALOG_PRESETS.heparin;
      const orderItem = makeMarTestOrderItem({
        catalogItemId: catalog.id,
        route: "SQ",
      });
      const { service, marCreate, verificationCreate, orderItemUpdate } = buildMarAdministrationTestHarness({
        catalog,
        orderItem,
        productProfile: MAR_REGRESSION_CATALOG_PRESETS.heparinProductProfile,
      });

      await submitTerminalMarAdministered(service, String(orderItem.id), { route: "SQ" });

      expect(marCreate).toHaveBeenCalled();
      expect(verificationCreate).not.toHaveBeenCalled();
      expectOrderLineCompleted(orderItemUpdate);
    });
  });

  describeSchedulingRegression("API-10", "heparin IVP → witness required", (scenario) => {
    it("rejects heparin IVP MAR without verifier", async () => {
      assertDirectMarSchedulingGateForScenario(scenario, null);
      const catalog = MAR_REGRESSION_CATALOG_PRESETS.heparin;
      const orderItem = makeMarTestOrderItem({
        catalogItemId: catalog.id,
        route: "IV",
      });
      const { service, marCreate } = buildMarAdministrationTestHarness({
        catalog,
        orderItem,
        productProfile: MAR_REGRESSION_CATALOG_PRESETS.heparinProductProfile,
      });

      await expect(
        submitTerminalMarAdministered(service, String(orderItem.id), { route: "IVP" })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(marCreate).not.toHaveBeenCalled();
    });
  });

  describeSchedulingRegression("API-11", "controlled substance → witness/waste preserved", (scenario) => {
    it("rejects controlled MAR without witness", async () => {
      assertDirectMarSchedulingGateForScenario(scenario, null);
      const catalog = MAR_REGRESSION_CATALOG_PRESETS.controlled;
      const orderItem = makeMarTestOrderItem({
        catalogItemId: catalog.id,
        quantity: 2,
      });
      const { service, marCreate } = buildMarAdministrationTestHarness({ catalog, orderItem });

      await expect(submitTerminalMarAdministered(service, String(orderItem.id))).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect(marCreate).not.toHaveBeenCalled();
    });

    it("creates witness verification when witness provided", async () => {
      const catalog = MAR_REGRESSION_CATALOG_PRESETS.controlled;
      const orderItem = makeMarTestOrderItem({
        catalogItemId: catalog.id,
        quantity: 2,
      });
      const { service, verificationCreate } = buildMarAdministrationTestHarness({ catalog, orderItem });

      await submitTerminalMarAdministered(service, String(orderItem.id), {
        administeredQuantity: 2,
        witnessUserId: "witness-2",
      });

      expect(verificationCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verificationType: MedicationVerificationType.WITNESS,
            verificationStatus: MedicationVerificationStatus.COMPLETED,
            witnessedByUserId: "witness-2",
          }),
        })
      );
    });

    it("creates waste documentation for partial controlled dose", async () => {
      const catalog = MAR_REGRESSION_CATALOG_PRESETS.controlled;
      const orderItem = makeMarTestOrderItem({
        catalogItemId: catalog.id,
        quantity: 2,
      });
      const { service, wasteCreate } = buildMarAdministrationTestHarness({ catalog, orderItem });

      await submitTerminalMarAdministered(service, String(orderItem.id), {
        administeredQuantity: 1,
        witnessUserId: "witness-2",
        wasteAmount: 1,
        wasteUnit: "mL",
        wasteReason: "Partial dose discarded",
      });

      expect(wasteCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: MedicationWasteStatus.COMPLETED,
            wastedAmount: 1,
          }),
        })
      );
    });
  });

  describeSchedulingRegression(
    "API-12",
    "Rocephin legacy order → terminal MAR → line COMPLETED",
    (scenario) => {
      it("completes legacy ceftriaxone line via direct MAR", async () => {
        assertDirectMarSchedulingGateForScenario(scenario, null);
        const catalog = MAR_REGRESSION_CATALOG_PRESETS.ceftriaxone;
        const orderItem = makeMarTestOrderItem({
          catalogItemId: catalog.id,
          route: "IVP",
          strength: "1 g",
          notes: null,
        });
        const { service, orderItemUpdate } = buildMarAdministrationTestHarness({ catalog, orderItem });

        await submitTerminalMarAdministered(service, String(orderItem.id), { route: "IVP" });

        expectOrderLineCompleted(orderItemUpdate);
      });
    }
  );

  describeSchedulingRegression(
    "API-13",
    "Vancomycin legacy order → terminal MAR → line COMPLETED",
    (scenario) => {
      it("completes legacy vancomycin IVP line via direct MAR", async () => {
        assertDirectMarSchedulingGateForScenario(scenario, null);
        const catalog = MAR_REGRESSION_CATALOG_PRESETS.vancomycin;
        const orderItem = makeMarTestOrderItem({
          catalogItemId: catalog.id,
          route: "IVP",
          strength: "1 g",
          notes: null,
        });
        const { service, orderItemUpdate } = buildMarAdministrationTestHarness({ catalog, orderItem });

        await submitTerminalMarAdministered(service, String(orderItem.id), { route: "IVP" });

        expectOrderLineCompleted(orderItemUpdate);
      });
    }
  );

  describeSchedulingRegression(
    "API-14",
    "Cefepime legacy order → terminal MAR → line COMPLETED",
    (scenario) => {
      it("completes legacy cefepime IVP line via direct MAR", async () => {
        assertDirectMarSchedulingGateForScenario(scenario, null);
        const catalog = MAR_REGRESSION_CATALOG_PRESETS.cefepime;
        const orderItem = makeMarTestOrderItem({
          catalogItemId: catalog.id,
          route: "IVP",
          strength: "2 g",
          notes: null,
        });
        const { service, orderItemUpdate } = buildMarAdministrationTestHarness({ catalog, orderItem });

        await submitTerminalMarAdministered(service, String(orderItem.id), { route: "IVP" });

        expectOrderLineCompleted(orderItemUpdate);
      });
    }
  );
});
