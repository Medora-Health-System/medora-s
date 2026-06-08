/**
 * M1.8B.7C.1 — Infusion catalog governance (API MAR guard layer).
 */
import { BadRequestException } from "@nestjs/common";
import {
  buildMarAdministrationTestHarness,
  makeMarTestOrderItem,
  MAR_REGRESSION_CATALOG_PRESETS,
  submitTerminalMarAdministered,
} from "./mar-administration-test-harness";
import { shouldBlockDirectMarAdministeredForInfusionLine } from "../common/medication/medication-infusion-candidate-from-order-item.util";

/** Haiti-like catalog after M1.8B.7C.1 seed hardening. */
const HAITI_INFUSION_CATALOGS = {
  potassiumChloride: {
    id: "cat-kcl-haiti",
    displayNameEn: "Potassium Chloride",
    name: "Potassium Chloride",
    code: "POTASSIUM_CHLORIDE",
    genericName: "Potassium Chloride",
    strength: "20 mEq/10 mL",
    route: "intraveineuse",
    administrationType: "INFUSION",
  },
  magnesiumSulfate: {
    id: "cat-mg-haiti",
    displayNameEn: "Magnesium Sulfate",
    name: "Magnesium Sulfate",
    code: "MAGNESIUM_SULFATE",
    genericName: "Magnesium Sulfate",
    strength: "2 g/50 mL",
    route: "intraveineuse",
    administrationType: "INFUSION",
  },
  vancomycinInfusion: {
    id: "cat-vanc-infusion-haiti",
    displayNameEn: "Vancomycin",
    name: "Vancomycin",
    code: "VANCOMYCIN",
    genericName: "Vancomycin",
    strength: "1 g",
    route: "intraveineuse",
    administrationType: "INFUSION",
  },
} as const;

describe("M1.8B.7C.1 IVPB route governance", () => {
  describe.each([
    {
      label: "KCl infusion blank route",
      catalog: HAITI_INFUSION_CATALOGS.potassiumChloride,
      orderRoute: null as string | null,
    },
    {
      label: "Mg infusion blank route",
      catalog: HAITI_INFUSION_CATALOGS.magnesiumSulfate,
      orderRoute: null,
    },
    {
      label: "Vancomycin INFUSION blank route",
      catalog: HAITI_INFUSION_CATALOGS.vancomycinInfusion,
      orderRoute: null,
    },
    {
      label: "Vancomycin INFUSION + IVP order route",
      catalog: HAITI_INFUSION_CATALOGS.vancomycinInfusion,
      orderRoute: "IVP",
    },
  ])("$label", ({ catalog, orderRoute }) => {
    it("blocks direct administered MAR (requires START/STOP)", async () => {
      const orderItem = makeMarTestOrderItem({
        catalogItemId: catalog.id,
        route: orderRoute ?? undefined,
      });
      const resolvedRoute = orderRoute?.trim() || catalog.route;
      expect(
        shouldBlockDirectMarAdministeredForInfusionLine(
          orderItem as never,
          catalog as never,
          resolvedRoute
        )
      ).toBe(true);

      const { service } = buildMarAdministrationTestHarness({ catalog, orderItem });
      await expect(submitTerminalMarAdministered(service, String(orderItem.id))).rejects.toThrow(
        BadRequestException
      );
      await expect(submitTerminalMarAdministered(service, String(orderItem.id))).rejects.toThrow(
        /infusion start\/stop/i
      );
    });
  });

  it("legacy ceftriaxone IVP + PUSH catalog completes via direct MAR", async () => {
    const catalog = MAR_REGRESSION_CATALOG_PRESETS.ceftriaxone;
    const orderItem = makeMarTestOrderItem({
      catalogItemId: catalog.id,
      route: "IVP",
    });
    expect(
      shouldBlockDirectMarAdministeredForInfusionLine(
        orderItem as never,
        catalog as never,
        "IVP"
      )
    ).toBe(false);

    const { service } = buildMarAdministrationTestHarness({ catalog, orderItem });
    await expect(
      submitTerminalMarAdministered(service, String(orderItem.id), { route: "IVP" })
    ).resolves.toBeDefined();
  });

  it("heparin IVP bolus is not blocked by infusion guard", () => {
    const catalog = MAR_REGRESSION_CATALOG_PRESETS.heparin;
    const orderItem = makeMarTestOrderItem({
      catalogItemId: catalog.id,
      route: "IVP",
    });
    expect(
      shouldBlockDirectMarAdministeredForInfusionLine(
        orderItem as never,
        catalog as never,
        "IVP"
      )
    ).toBe(false);
  });

  it("insulin SQ is not blocked by infusion guard", () => {
    const catalog = MAR_REGRESSION_CATALOG_PRESETS.insulin;
    const orderItem = makeMarTestOrderItem({
      catalogItemId: catalog.id,
      route: "SQ",
    });
    expect(
      shouldBlockDirectMarAdministeredForInfusionLine(
        orderItem as never,
        catalog as never,
        "SQ"
      )
    ).toBe(false);
  });

  it("blood product INFUSION remains infusion lifecycle", () => {
    const catalog = MAR_REGRESSION_CATALOG_PRESETS.blood;
    const orderItem = makeMarTestOrderItem({
      catalogItemId: catalog.id,
      route: "IVPB",
    });
    expect(
      shouldBlockDirectMarAdministeredForInfusionLine(
        orderItem as never,
        catalog as never,
        "IVPB"
      )
    ).toBe(true);
  });
});
