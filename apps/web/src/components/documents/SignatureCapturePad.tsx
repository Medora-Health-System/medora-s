"use client";

/**
 * Enterprise signature capture pad.
 * Uses Pointer Events so mouse, touch (iPad), Apple Pencil / pen, and HID
 * external signature pads that expose as digitizers all share one path.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

export type SignaturePointerType = "mouse" | "touch" | "pen" | "unknown";

type Point = {
  x: number;
  y: number;
  t: number;
  /** 0–1 when the device reports pressure (pen / some pads). */
  pressure?: number;
  pointerType?: SignaturePointerType;
};

type Stroke = Point[];

export type SignatureResult = {
  strokes: Stroke[];
  width: number;
  height: number;
  /** Last active input modality used while capturing. */
  inputDevice?: SignaturePointerType;
};

function normalizePointerType(type: string | undefined): SignaturePointerType {
  if (type === "mouse" || type === "touch" || type === "pen") return type;
  return "unknown";
}

export function SignatureCapturePad({
  onCapture,
  disabled = false,
  label,
}: {
  onCapture: (data: SignatureResult | null) => void;
  disabled?: boolean;
  label?: string;
}) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeInput, setActiveInput] = useState<SignaturePointerType>("unknown");
  const currentStroke = useRef<Stroke>([]);
  const activePointerId = useRef<number | null>(null);
  const isDrawingRef = useRef(false);

  const PAD_WIDTH = 400;
  const PAD_HEIGHT = 160;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, PAD_WIDTH, PAD_HEIGHT);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
  }, [strokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    if (strokes.length > 0) {
      onCapture({
        strokes,
        width: PAD_WIDTH,
        height: PAD_HEIGHT,
        inputDevice: activeInput !== "unknown" ? activeInput : undefined,
      });
    } else {
      onCapture(null);
    }
  }, [strokes, onCapture, activeInput]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = PAD_WIDTH / rect.width;
    const scaleY = PAD_HEIGHT / rect.height;
    const pointerType = normalizePointerType(e.pointerType);
    const pressure =
      typeof e.pressure === "number" && e.pressure > 0 ? Math.min(1, e.pressure) : undefined;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      t: Date.now(),
      pressure,
      pointerType,
    };
  };

  const paintSegment = (from: Point, to: Point) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const baseWidth = 2;
    const width =
      typeof to.pressure === "number" ? Math.max(1.2, baseWidth * (0.6 + to.pressure)) : baseWidth;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    // One active pointer only (ignore multi-touch palm / second finger).
    if (activePointerId.current !== null && activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* some browsers may throw if already captured */
    }
    activePointerId.current = e.pointerId;
    isDrawingRef.current = true;
    setIsDrawing(true);
    const pos = getPos(e);
    setActiveInput(pos.pointerType || "unknown");
    currentStroke.current = [pos];
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || disabled) return;
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const prev = currentStroke.current[currentStroke.current.length - 1];
    currentStroke.current.push(pos);
    if (prev) paintSegment(prev, pos);
  };

  const endDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    if (!isDrawingRef.current) return;
    e.preventDefault();
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
    isDrawingRef.current = false;
    setIsDrawing(false);
    activePointerId.current = null;
    if (currentStroke.current.length > 1) {
      setStrokes((prev) => [...prev, currentStroke.current]);
    }
    currentStroke.current = [];
  };

  const clear = () => {
    setStrokes([]);
    currentStroke.current = [];
    activePointerId.current = null;
    isDrawingRef.current = false;
    setIsDrawing(false);
    setActiveInput("unknown");
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, PAD_WIDTH, PAD_HEIGHT);
    }
  };

  return (
    <div style={{ opacity: disabled ? 0.5 : 1 }}>
      {label && (
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#334155" }}>
          {label}
        </div>
      )}
      <div
        style={{
          border: disabled ? "2px solid #e2e8f0" : "2px solid #94a3b8",
          borderRadius: 8,
          background: disabled ? "#f8fafc" : "#fff",
          position: "relative",
          touchAction: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          width={PAD_WIDTH}
          height={PAD_HEIGHT}
          style={{
            width: "100%",
            height: PAD_HEIGHT,
            cursor: disabled ? "not-allowed" : "crosshair",
            display: "block",
            touchAction: "none",
          }}
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
        />
        {strokes.length === 0 && !isDrawing && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              color: "#94a3b8",
              fontSize: 13,
              gap: 4,
              padding: 8,
              textAlign: "center",
            }}
          >
            <span>{disabled ? t("esignature.locked") : t("esignature.signHere")}</span>
            {!disabled && (
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                {t("esignature.inputHint")}
              </span>
            )}
          </div>
        )}
      </div>
      {!disabled && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={clear}
            style={{
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
              border: "1px solid #cbd5e1",
              borderRadius: 4,
              background: "#fff",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            {t("esignature.clear")}
          </button>
          {activeInput !== "unknown" && strokes.length > 0 && (
            <span style={{ fontSize: 10, color: "#94a3b8" }}>
              {t("esignature.inputDevice")}:{" "}
              {activeInput === "mouse"
                ? t("esignature.deviceMouse")
                : activeInput === "touch"
                  ? t("esignature.deviceTouch")
                  : activeInput === "pen"
                    ? t("esignature.devicePen")
                    : t("esignature.deviceUnknown")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
