/**
 * M1.8B.7E.1 / M1.8B.7E.2B — High-alert IVPB infusion START witness enforcement.
 */
import { BadRequestException } from "@nestjs/common";
import {
  buildMarAdministrationTestHarness,
  makeMarTestOrderItem,
  MAR_REGRESSION_CATALOG_PRESETS,
  submitTerminalMarAdministered,
} from "./mar-administration-test-harness";

const insulinIvpbCatalog = {
  id: "cat-insulin-drip",
  displayNameEn: "Regular insulin drip",
  name: "Regular insulin drip",
  code: "REGULAR_INSULIN_100_UI_ML_DRIP_KIT_PERFUSION_INTRAVEINEUSE",
  genericName: "Regular insulin",
  strength: "100 UI/mL",
  route: "intraveineuse",
  administrationType: "INFUSION",
  dosageForm: "perfusion",
  therapeuticClass: "Insuline perfusion",
  isControlled: false,
  controlledSchedule: null,
  requiresWitness: false,
  requiresDoubleSign: true,
};

const insulinIvpbProductProfile = {
  legacyCatalogMedicationId: "cat-insulin-drip",
  concept: {
    safetyProfile: {
      isHighAlert: true,
      highAlertCategories: {
        highAlertClass: "HIGH_ALERT_INSULIN",
        safetyRequirements: ["REQUIRES_INDEPENDENT_DOUBLE_CHECK"],
      },
      lasaGroupId: null,
      isControlled: false,
      controlledSchedule: null,
      requiresWitness: false,
      requiresDoubleSign: true,
    },
  },
  administrationProfile: { allowsWasteDocumentation: false },
};

describe("M1.8B.7E.1 IVPB high-alert infusion START witness", () => {
  it("rejects heparin IVPB START without verifier", async () => {
    const catalog = MAR_REGRESSION_CATALOG_PRESETS.heparin;
    const orderItem = makeMarTestOrderItem({
      catalogItemId: catalog.id,
      route: "IVPB",
    });
    const { service } = buildMarAdministrationTestHarness({
      catalog,
      orderItem,
      productProfile: MAR_REGRESSION_CATALOG_PRESETS.heparinProductProfile,
    });

    await expect(
      service.createInfusionStartMar("enc-1", "fac-1", "nurse-1", {
        orderItemId: String(orderItem.id),
        infusionSessionKey: "hep-sess-1",
        startedAt: new Date("2026-05-16T12:00:00Z"),
        route: "IVPB",
      })
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: "HIGH_ALERT_IVPB_WITNESS_REQUIRED",
      }),
    });
  });

  it("creates heparin IVPB START MAR with verifier", async () => {
    const catalog = MAR_REGRESSION_CATALOG_PRESETS.heparin;
    const orderItem = makeMarTestOrderItem({
      catalogItemId: catalog.id,
      route: "IVPB",
    });
    const { service, marCreate, verificationCreate } = buildMarAdministrationTestHarness({
      catalog,
      orderItem,
      productProfile: MAR_REGRESSION_CATALOG_PRESETS.heparinProductProfile,
    });

    await service.createInfusionStartMar("enc-1", "fac-1", "nurse-1", {
      orderItemId: String(orderItem.id),
      infusionSessionKey: "hep-sess-2",
      startedAt: new Date("2026-05-16T12:00:00Z"),
      route: "IVPB",
      highAlertVerifierUserId: "rn-2",
    });

    expect(marCreate).toHaveBeenCalled();
    expect(verificationCreate).toHaveBeenCalled();
  });

  it("rejects insulin IVPB START without verifier", async () => {
    const orderItem = makeMarTestOrderItem({
      catalogItemId: insulinIvpbCatalog.id,
      route: "IVPB",
    });
    const { service } = buildMarAdministrationTestHarness({
      catalog: insulinIvpbCatalog,
      orderItem,
      productProfile: insulinIvpbProductProfile,
    });

    await expect(
      service.createInfusionStartMar("enc-1", "fac-1", "nurse-1", {
        orderItemId: String(orderItem.id),
        infusionSessionKey: "ins-sess-1",
        startedAt: new Date("2026-05-16T12:00:00Z"),
        route: "IVPB",
      })
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: "HIGH_ALERT_IVPB_WITNESS_REQUIRED",
      }),
    });
  });

  it("creates insulin IVPB START MAR with verifier", async () => {
    const orderItem = makeMarTestOrderItem({
      catalogItemId: insulinIvpbCatalog.id,
      route: "IVPB",
    });
    const { service, marCreate, verificationCreate } = buildMarAdministrationTestHarness({
      catalog: insulinIvpbCatalog,
      orderItem,
      productProfile: insulinIvpbProductProfile,
    });

    await service.createInfusionStartMar("enc-1", "fac-1", "nurse-1", {
      orderItemId: String(orderItem.id),
      infusionSessionKey: "ins-sess-2",
      startedAt: new Date("2026-05-16T12:00:00Z"),
      route: "IVPB",
      highAlertVerifierUserId: "rn-2",
    });

    expect(marCreate).toHaveBeenCalled();
    expect(verificationCreate).toHaveBeenCalled();
  });

  it("allows vancomycin IVPB START without verifier", async () => {
    const catalog = MAR_REGRESSION_CATALOG_PRESETS.infusionVancomycin;
    const orderItem = makeMarTestOrderItem({
      catalogItemId: catalog.id,
      route: "IVPB",
    });
    const { service, marCreate } = buildMarAdministrationTestHarness({ catalog, orderItem });

    await service.createInfusionStartMar("enc-1", "fac-1", "nurse-1", {
      orderItemId: String(orderItem.id),
      infusionSessionKey: "vanc-sess-1",
      startedAt: new Date("2026-05-16T12:00:00Z"),
      route: "IVPB",
    });

    expect(marCreate).toHaveBeenCalled();
  });

  const potassiumIvpbCatalog = {
    id: "cat-kcl-ivpb",
    displayNameEn: "Potassium chloride",
    name: "Potassium chloride",
    code: "POTASSIUM_CHLORIDE_10_MEQ_100_ML_PERFUSION_INTRAVEINEUSE",
    genericName: "Potassium chloride",
    strength: "10 mEq/100 mL",
    route: "intraveineuse",
    administrationType: "INFUSION",
    dosageForm: "perfusion",
    therapeuticClass: "Électrolyte IV",
    isControlled: false,
    controlledSchedule: null,
    requiresWitness: false,
    requiresDoubleSign: true,
  };

  const potassiumIvpbProductProfile = {
    legacyCatalogMedicationId: "cat-kcl-ivpb",
    concept: {
      safetyProfile: {
        isHighAlert: true,
        highAlertCategories: {
          highAlertClass: "HIGH_ALERT_ELECTROLYTE",
          safetyRequirements: ["REQUIRES_INDEPENDENT_DOUBLE_CHECK"],
        },
        lasaGroupId: null,
        isControlled: false,
        controlledSchedule: null,
        requiresWitness: false,
        requiresDoubleSign: true,
      },
    },
    administrationProfile: { allowsWasteDocumentation: false },
  };

  const magnesiumIvpbCatalog = {
    id: "cat-mg-ivpb",
    displayNameEn: "Magnesium sulfate",
    name: "Magnesium sulfate",
    code: "MAGNESIUM_SULFATE_4_G_100_ML_PERFUSION_INTRAVEINEUSE",
    genericName: "Magnesium sulfate",
    strength: "4 g/100 mL",
    route: "intraveineuse",
    administrationType: "INFUSION",
    dosageForm: "perfusion",
    therapeuticClass: "Électrolyte ACLS",
    isControlled: false,
    controlledSchedule: null,
    requiresWitness: false,
    requiresDoubleSign: true,
  };

  const magnesiumIvpbProductProfile = {
    legacyCatalogMedicationId: "cat-mg-ivpb",
    concept: {
      safetyProfile: {
        isHighAlert: true,
        highAlertCategories: {
          highAlertClass: "HIGH_ALERT_ELECTROLYTE",
          safetyRequirements: ["REQUIRES_INDEPENDENT_DOUBLE_CHECK"],
        },
        lasaGroupId: null,
        isControlled: false,
        controlledSchedule: null,
        requiresWitness: false,
        requiresDoubleSign: true,
      },
    },
    administrationProfile: { allowsWasteDocumentation: false },
  };

  it("rejects KCl IVPB START without verifier (M1.8B.7E.2B)", async () => {
    const orderItem = makeMarTestOrderItem({
      catalogItemId: potassiumIvpbCatalog.id,
      route: "IVPB",
    });
    const { service } = buildMarAdministrationTestHarness({
      catalog: potassiumIvpbCatalog,
      orderItem,
      productProfile: potassiumIvpbProductProfile,
    });

    await expect(
      service.createInfusionStartMar("enc-1", "fac-1", "nurse-1", {
        orderItemId: String(orderItem.id),
        infusionSessionKey: "kcl-sess-1",
        startedAt: new Date("2026-05-16T12:00:00Z"),
        route: "IVPB",
      })
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: "HIGH_ALERT_IVPB_WITNESS_REQUIRED",
      }),
    });
  });

  it("creates KCl IVPB START MAR with verifier (M1.8B.7E.2B)", async () => {
    const orderItem = makeMarTestOrderItem({
      catalogItemId: potassiumIvpbCatalog.id,
      route: "IVPB",
    });
    const { service, marCreate, verificationCreate } = buildMarAdministrationTestHarness({
      catalog: potassiumIvpbCatalog,
      orderItem,
      productProfile: potassiumIvpbProductProfile,
    });

    await service.createInfusionStartMar("enc-1", "fac-1", "nurse-1", {
      orderItemId: String(orderItem.id),
      infusionSessionKey: "kcl-sess-2",
      startedAt: new Date("2026-05-16T12:00:00Z"),
      route: "IVPB",
      highAlertVerifierUserId: "rn-2",
    });

    expect(marCreate).toHaveBeenCalled();
    expect(verificationCreate).toHaveBeenCalled();
  });

  it("rejects Mg IVPB START without verifier (M1.8B.7E.2B)", async () => {
    const orderItem = makeMarTestOrderItem({
      catalogItemId: magnesiumIvpbCatalog.id,
      route: "IVPB",
    });
    const { service } = buildMarAdministrationTestHarness({
      catalog: magnesiumIvpbCatalog,
      orderItem,
      productProfile: magnesiumIvpbProductProfile,
    });

    await expect(
      service.createInfusionStartMar("enc-1", "fac-1", "nurse-1", {
        orderItemId: String(orderItem.id),
        infusionSessionKey: "mg-sess-1",
        startedAt: new Date("2026-05-16T12:00:00Z"),
        route: "IVPB",
      })
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: "HIGH_ALERT_IVPB_WITNESS_REQUIRED",
      }),
    });
  });

  it("creates Mg IVPB START MAR with verifier (M1.8B.7E.2B)", async () => {
    const orderItem = makeMarTestOrderItem({
      catalogItemId: magnesiumIvpbCatalog.id,
      route: "IVPB",
    });
    const { service, marCreate, verificationCreate } = buildMarAdministrationTestHarness({
      catalog: magnesiumIvpbCatalog,
      orderItem,
      productProfile: magnesiumIvpbProductProfile,
    });

    await service.createInfusionStartMar("enc-1", "fac-1", "nurse-1", {
      orderItemId: String(orderItem.id),
      infusionSessionKey: "mg-sess-2",
      startedAt: new Date("2026-05-16T12:00:00Z"),
      route: "IVPB",
      highAlertVerifierUserId: "rn-2",
    });

    expect(marCreate).toHaveBeenCalled();
    expect(verificationCreate).toHaveBeenCalled();
  });

  it("still blocks direct administered IVPB for heparin", async () => {
    const catalog = MAR_REGRESSION_CATALOG_PRESETS.heparin;
    const orderItem = makeMarTestOrderItem({
      catalogItemId: catalog.id,
      route: "IVPB",
    });
    const { service } = buildMarAdministrationTestHarness({
      catalog,
      orderItem,
      productProfile: MAR_REGRESSION_CATALOG_PRESETS.heparinProductProfile,
    });

    await expect(
      submitTerminalMarAdministered(service, String(orderItem.id), {
        highAlertVerifierUserId: "rn-2",
      })
    ).rejects.toThrow(BadRequestException);
    await expect(
      submitTerminalMarAdministered(service, String(orderItem.id), {
        highAlertVerifierUserId: "rn-2",
      })
    ).rejects.toThrow(/infusion start\/stop/i);
  });
});
