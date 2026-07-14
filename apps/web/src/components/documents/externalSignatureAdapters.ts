import type { SignatureValue } from "./signatureVectorModel";

export interface ExternalSignatureDeviceAdapter {
  id: string;
  labelKey: string;
  isAvailable(): Promise<boolean>;
  connect(): Promise<void>;
  capture(): Promise<SignatureValue>;
  cancel(): Promise<void>;
  disconnect(): Promise<void>;
}

/** Default in-browser pointer/touch/pen capture (SignatureCapturePad). */
export const BrowserPointerSignatureAdapter: ExternalSignatureDeviceAdapter = {
  id: "browser-pointer",
  labelKey: "esignature.useTouchScreen",
  async isAvailable() {
    return typeof window !== "undefined";
  },
  async connect() {},
  async capture(): Promise<SignatureValue> {
    throw new Error("Browser pointer capture uses SignatureCapturePad");
  },
  async cancel() {},
  async disconnect() {},
};

class HardwareStubAdapter implements ExternalSignatureDeviceAdapter {
  constructor(
    public readonly id: string,
    public readonly labelKey: string,
    private readonly flag: "__MEDORA_TOPAZ__" | "__MEDORA_WACOM__",
  ) {}

  async isAvailable() {
    return (
      typeof window !== "undefined" &&
      Boolean((window as unknown as Record<string, unknown>)[this.flag])
    );
  }
  async connect() {}
  async capture(): Promise<SignatureValue> {
    throw new Error("External signature pad SDK is not configured");
  }
  async cancel() {}
  async disconnect() {}
}

/** Stub until a Topaz SDK is wired; feature-detected via window.__MEDORA_TOPAZ__. */
export const TopazSignatureAdapter = new HardwareStubAdapter(
  "topaz",
  "esignature.useConnectedPad",
  "__MEDORA_TOPAZ__",
);

/** Stub until a Wacom SDK is wired; feature-detected via window.__MEDORA_WACOM__. */
export const WacomSignatureAdapter = new HardwareStubAdapter(
  "wacom",
  "esignature.useConnectedPad",
  "__MEDORA_WACOM__",
);

/** Hardware adapters only — UI shows these when actually available; canvas remains default. */
export async function listAvailableHardwareSignatureAdapters(): Promise<
  ExternalSignatureDeviceAdapter[]
> {
  const candidates = [TopazSignatureAdapter, WacomSignatureAdapter];
  const available: ExternalSignatureDeviceAdapter[] = [];
  for (const adapter of candidates) {
    if (await adapter.isAvailable()) available.push(adapter);
  }
  return available;
}
