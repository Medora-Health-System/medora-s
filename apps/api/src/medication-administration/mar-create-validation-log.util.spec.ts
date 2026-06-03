import { BadRequestException } from "@nestjs/common";
import {
  badRequestExceptionCode,
  marValidationBadRequest,
} from "./mar-create-validation-log.util";

describe("mar-create-validation-log (M1.7B.2)", () => {
  it("marValidationBadRequest returns structured code and message", () => {
    const err = marValidationBadRequest(
      "LASA_ACKNOWLEDGEMENT_REQUIRED",
      "Accusé de réception LASA requis."
    );
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse()).toMatchObject({
      statusCode: 400,
      code: "LASA_ACKNOWLEDGEMENT_REQUIRED",
      message: "Accusé de réception LASA requis.",
    });
    expect(badRequestExceptionCode(err)).toBe("LASA_ACKNOWLEDGEMENT_REQUIRED");
  });
});
