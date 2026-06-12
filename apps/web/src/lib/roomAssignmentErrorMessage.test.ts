import { describe, expect, it } from "vitest";
import { extractRoomAssignmentSaveErrorMessage } from "./roomAssignmentErrorMessage";

describe("extractRoomAssignmentSaveErrorMessage (K.10B.10A)", () => {
  it("returns Nest JSON message instead of generic fallback", () => {
    const err = Object.assign(new Error("Something went wrong."), {
      status: 400,
      body: { message: "Invalid payload", statusCode: 400 },
    });
    const msg = extractRoomAssignmentSaveErrorMessage(err, "en", "Unable to save room.");
    expect(msg).not.toBe("Unable to save room.");
    expect(msg).not.toBe("Something went wrong.");
  });

  it("returns French backend message when present", () => {
    const err = Object.assign(new Error("Une erreur est survenue."), {
      status: 400,
      body: {
        message: "Le parcours de cette consultation est terminé.",
        statusCode: 400,
      },
    });
    expect(extractRoomAssignmentSaveErrorMessage(err, "fr", "Échec.")).toBe(
      "Le parcours de cette consultation est terminé."
    );
  });
});
