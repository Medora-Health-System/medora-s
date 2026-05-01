import {
  canonicalHeightCm,
  displayHeightCmStringFromStored,
  heightFeetInchStringsFromStoredCm,
} from "@medora/shared";

/** When switching height mode, convert current value into the new fields. */
export function flipHeightInputMode(
  args: {
    heightCmStr: string;
    heightFeetStr: string;
    heightInchesStr: string;
    from: "cm" | "ftin";
    to: "cm" | "ftin";
  }
): { heightCm: string; heightFeet: string; heightInches: string } {
  if (args.from === args.to) {
    return {
      heightCm: args.heightCmStr,
      heightFeet: args.heightFeetStr,
      heightInches: args.heightInchesStr,
    };
  }
  if (args.from === "cm" && args.to === "ftin") {
    const n = parseFloat(args.heightCmStr.trim());
    if (!Number.isFinite(n)) return { heightCm: "", heightFeet: "", heightInches: "" };
    const fi = heightFeetInchStringsFromStoredCm(n);
    return { heightCm: "", heightFeet: fi.feet, heightInches: fi.inches };
  }
  const cm = canonicalHeightCm({
    heightCmStr: "",
    heightInputMode: "ftin",
    heightFeetStr: args.heightFeetStr,
    heightInchesStr: args.heightInchesStr,
  });
  return {
    heightCm: cm != null ? displayHeightCmStringFromStored(cm) : "",
    heightFeet: "",
    heightInches: "",
  };
}
