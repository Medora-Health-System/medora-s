export type SignaturePoint = {
  x: number;
  y: number;
  pressure?: number;
  timestamp: number;
  pointerType?: "mouse" | "touch" | "pen";
};

export type SignatureStroke = { id: string; points: SignaturePoint[] };

export type SignatureValue = {
  strokes: SignatureStroke[];
  width: number;
  height: number;
  capturedAt?: string;
  deviceType?: string;
  inputDevice?: string;
};

type LegacyPoint = {
  x?: unknown;
  y?: unknown;
  pressure?: unknown;
  timestamp?: unknown;
  t?: unknown;
  pointerType?: unknown;
};

export function emptySignatureValue(width: number, height: number): SignatureValue {
  return { strokes: [], width, height };
}

export function isSignatureEmpty(value: SignatureValue | null | undefined): boolean {
  return !value?.strokes.some((stroke) => stroke.points.length > 0);
}

function pointFromUnknown(value: unknown): SignaturePoint | null {
  if (!value || typeof value !== "object") return null;
  const point = value as LegacyPoint;
  if (typeof point.x !== "number" || !Number.isFinite(point.x)) return null;
  if (typeof point.y !== "number" || !Number.isFinite(point.y)) return null;
  const pressure =
    typeof point.pressure === "number" && Number.isFinite(point.pressure)
      ? Math.max(0, Math.min(1, point.pressure))
      : undefined;
  const pointerType =
    point.pointerType === "mouse" || point.pointerType === "touch" || point.pointerType === "pen"
      ? point.pointerType
      : undefined;
  return {
    x: point.x,
    y: point.y,
    pressure,
    timestamp:
      typeof point.timestamp === "number" && Number.isFinite(point.timestamp)
        ? point.timestamp
        : typeof point.t === "number" && Number.isFinite(point.t)
          ? point.t
          : Date.now(),
    pointerType,
  };
}

/** Accepts the current model and the legacy `strokes: Point[][]` model. */
export function normalizeSignatureValue(value: unknown): SignatureValue | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const width = typeof raw.width === "number" && Number.isFinite(raw.width) ? raw.width : 400;
  const height = typeof raw.height === "number" && Number.isFinite(raw.height) ? raw.height : 200;
  if (!Array.isArray(raw.strokes)) return null;

  const strokes: SignatureStroke[] = raw.strokes.map((stroke, index) => {
    const candidate = Array.isArray(stroke)
      ? { id: `legacy-${index}`, points: stroke }
      : stroke && typeof stroke === "object"
        ? (stroke as { id?: unknown; points?: unknown })
        : {};
    const points = Array.isArray(candidate.points)
      ? candidate.points.map(pointFromUnknown).filter((point): point is SignaturePoint => point !== null)
      : [];
    return {
      id: typeof candidate.id === "string" && candidate.id ? candidate.id : `stroke-${index}`,
      points,
    };
  });

  return {
    strokes,
    width,
    height,
    capturedAt: typeof raw.capturedAt === "string" ? raw.capturedAt : undefined,
    deviceType: typeof raw.deviceType === "string" ? raw.deviceType : undefined,
    inputDevice: typeof raw.inputDevice === "string" ? raw.inputDevice : undefined,
  };
}

export function cloneSignatureValue(value: SignatureValue): SignatureValue {
  return {
    ...value,
    strokes: value.strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({ ...point })),
    })),
  };
}
