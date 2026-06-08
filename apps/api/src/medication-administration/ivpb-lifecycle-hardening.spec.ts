/**
 * M1.8B.7B — IVPB route-authoritative infusion lifecycle (MAR + governance).
 */
import { BadRequestException } from "@nestjs/common";
import {
  buildMarAdministrationTestHarness,
  makeMarTestOrderItem,
  MAR_REGRESSION_CATALOG_PRESETS,
  submitTerminalMarAdministered,
} from "./mar-administration-test-harness";
import { shouldBlockDirectMarAdministeredForInfusionLine } from "../common/medication/medication-infusion-candidate-from-order-item.util";

const IVPB_CASES = [
  { label: "Heparin IVPB", catalog: MAR_REGRESSION_CATALOG_PRESETS.heparin },
  { label: "Vancomycin IVPB", catalog: MAR_REGRESSION_CATALOG_PRESETS.vancomycin },
  { label: "Ceftriaxone IVPB", catalog: MAR_REGRESSION_CATALOG_PRESETS.ceftriaxone },
  { label: "Cefepime IVPB", catalog: MAR_REGRESSION_CATALOG_PRESETS.cefepime },
  {
    label: "Potassium IVPB",
    catalog: {
      id: "cat-kcl",
      displayNameEn: "Potassium Chloride",
      name: "Potassium Chloride",
      code: "POTASSIUM_CHLORIDE",
      genericName: "Potassium Chloride",
      strength: "20 mEq/10 mL",
      route: "IVP",
      administrationType: "PUSH",
    },
  },
  {
    label: "Magnesium IVPB",
    catalog: {
      id: "cat-mgso4",
      displayNameEn: "Magnesium Sulfate",
      name: "Magnesium Sulfate",
      code: "MAGNESIUM_SULFATE",
      genericName: "Magnesium Sulfate",
      strength: "2 g",
      route: "IVP",
      administrationType: "PUSH",
    },
  },
] as const;

describe("M1.8B.7B IVPB lifecycle hardening", () => {
  describe.each(IVPB_CASES)("$label", ({ catalog, label }) => {
    it("blocks direct administered MAR (requires START/STOP)", async () => {
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

      const harnessOpts =
        label === "Heparin IVPB"
          ? {
              catalog,
              orderItem,
              productProfile: MAR_REGRESSION_CATALOG_PRESETS.heparinProductProfile,
            }
          : { catalog, orderItem };
      const { service } = buildMarAdministrationTestHarness(harnessOpts);
      const submitExtra =
        label === "Heparin IVPB" ? { highAlertVerifierUserId: "rn-2" } : {};
      await expect(
        submitTerminalMarAdministered(service, String(orderItem.id), submitExtra)
      ).rejects.toThrow(BadRequestException);
      await expect(
        submitTerminalMarAdministered(service, String(orderItem.id), submitExtra)
      ).rejects.toThrow(/infusion start\/stop/i);
    });
  });

  describe("regression — existing workflows unchanged", () => {
    it("heparin IVP direct MAR is not blocked by infusion lifecycle guard", () => {
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

    it("insulin SQ direct MAR is not blocked by infusion lifecycle guard", () => {
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

    it("blood product direct MAR still blocked (infusion + witness contract unchanged)", async () => {
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

      const { service } = buildMarAdministrationTestHarness({ catalog, orderItem });
      await expect(submitTerminalMarAdministered(service, String(orderItem.id))).rejects.toThrow(
        BadRequestException
      );
    });

    it("NOW PO medication is not infusion lifecycle", () => {
      const catalog = MAR_REGRESSION_CATALOG_PRESETS.controlled;
      const orderItem = makeMarTestOrderItem({
        catalogItemId: catalog.id,
        route: "PO",
        notes: "frequency:NOW",
      });
      expect(
        shouldBlockDirectMarAdministeredForInfusionLine(
          orderItem as never,
          catalog as never,
          "PO"
        )
      ).toBe(false);
    });
  });
});
