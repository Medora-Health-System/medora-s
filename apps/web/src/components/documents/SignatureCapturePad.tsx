"use client";

/**
 * Enterprise signature capture pad.
 * Uses Pointer Events so mouse, touch (iPad), Apple Pencil / pen, and HID
 * external signature pads that expose as digitizers all share one path.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  cloneSignatureValue,
  emptySignatureValue,
  isSignatureEmpty,
  normalizeSignatureValue,
  type SignaturePoint,
  type SignatureValue,
} from "./signatureVectorModel";

/** @deprecated Use SignatureValue. */
export type SignatureResult = SignatureValue;

export function SignatureCapturePad({
  value,
  onChange,
  onCapture,
  disabled = false,
  label,
}: {
  value?: SignatureValue | null;
  onChange?: (data: SignatureValue | null) => void;
  /** @deprecated Use onChange. */
  onCapture?: (data: SignatureValue | null) => void;
  disabled?: boolean;
  label?: string;
}) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const valueRef = useRef<SignatureValue>(normalizeSignatureValue(value) || emptySignatureValue(400, 200));
  const currentStroke = useRef<SignaturePoint[]>([]);
  const activePointerId = useRef<number | null>(null);
  const activePointerType = useRef<string | null>(null);
  const isDrawingRef = useRef(false);
  const lastEmitAt = useRef(0);
  const emit = useCallback((next: SignatureValue | null) => {
    onChange?.(next);
    onCapture?.(next);
  }, [onCapture, onChange]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const scaleX = rect.width / valueRef.current.width;
    const scaleY = rect.height / valueRef.current.height;
    for (const stroke of valueRef.current.strokes) {
      if (stroke.points.length < 2) continue;
      const points = stroke.points;
      ctx.beginPath();
      ctx.moveTo(points[0].x * scaleX, points[0].y * scaleY);
      for (let i = 1; i < points.length; i++) {
        const previous = points[i - 1];
        const point = points[i];
        const midpointX = ((previous.x + point.x) / 2) * scaleX;
        const midpointY = ((previous.y + point.y) / 2) * scaleY;
        ctx.lineWidth = 1.2 + (point.pressure ?? 0.5) * 2.4;
        ctx.quadraticCurveTo(previous.x * scaleX, previous.y * scaleY, midpointX, midpointY);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const next = normalizeSignatureValue(value);
    valueRef.current = next || emptySignatureValue(valueRef.current.width, valueRef.current.height);
    redraw();
  }, [value, redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => redraw());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>): SignaturePoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = valueRef.current.width / rect.width;
    const scaleY = valueRef.current.height / rect.height;
    const pointerType = e.pointerType === "mouse" || e.pointerType === "touch" || e.pointerType === "pen"
      ? e.pointerType
      : undefined;
    const pressure =
      typeof e.pressure === "number" && e.pressure > 0 ? Math.min(1, e.pressure) : undefined;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      timestamp: Date.now(),
      pressure,
      pointerType,
    };
  };

  const emitCurrent = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastEmitAt.current < 32) return;
    lastEmitAt.current = now;
    emit(isSignatureEmpty(valueRef.current) ? null : cloneSignatureValue(valueRef.current));
  }, [emit]);

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    if (activePointerId.current !== null && activePointerId.current !== e.pointerId) return;
    // Once a pen is active, reject touch events from a resting palm.
    if (activePointerType.current === "pen" && e.pointerType === "touch") return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* some browsers may throw if already captured */
    }
    activePointerId.current = e.pointerId;
    activePointerType.current = e.pointerType;
    isDrawingRef.current = true;
    setIsDrawing(true);
    const pos = getPos(e);
    currentStroke.current = [pos];
    valueRef.current = {
      ...valueRef.current,
      strokes: [...valueRef.current.strokes, { id: crypto.randomUUID?.() ?? `stroke-${Date.now()}`, points: currentStroke.current }],
    };
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || disabled) return;
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    e.preventDefault();
    const pos = getPos(e);
    currentStroke.current.push(pos);
    const strokes = valueRef.current.strokes;
    strokes[strokes.length - 1] = { ...strokes[strokes.length - 1], points: currentStroke.current };
    redraw();
    emitCurrent();
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
    activePointerType.current = null;
    if (currentStroke.current.length > 1) {
      valueRef.current = {
        ...valueRef.current,
        capturedAt: new Date().toISOString(),
        inputDevice: currentStroke.current[0].pointerType,
        strokes: valueRef.current.strokes.map((stroke) => ({
          ...stroke,
          points: stroke.points.map((point) => ({ ...point })),
        })),
      };
      redraw();
      emitCurrent(true);
    } else if (valueRef.current.strokes.length > 0) {
      // Drop incomplete single-point stroke; keep prior completed strokes.
      valueRef.current = {
        ...valueRef.current,
        strokes: valueRef.current.strokes.slice(0, -1),
      };
      redraw();
      emitCurrent(true);
    }
    currentStroke.current = [];
  };

  const clear = () => {
    valueRef.current = emptySignatureValue(valueRef.current.width, valueRef.current.height);
    currentStroke.current = [];
    activePointerId.current = null;
    activePointerType.current = null;
    isDrawingRef.current = false;
    setIsDrawing(false);
    activePointerType.current = null;
    redraw();
    emit(null);
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
          overscrollBehavior: "contain",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          tabIndex={disabled ? -1 : 0}
          style={{
            width: "100%",
            height: 200,
            cursor: disabled ? "not-allowed" : "crosshair",
            display: "block",
            touchAction: "none",
          }}
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
          onLostPointerCapture={endDraw}
        />
        {isSignatureEmpty(valueRef.current) && !isDrawing && (
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
          {!isSignatureEmpty(valueRef.current) && <span style={{ fontSize: 11, color: "#15803d" }}>{t("esignature.captured")}</span>}
          {!isSignatureEmpty(valueRef.current) && (
            <button
              type="button"
              onClick={() => {
                clear();
                canvasRef.current?.focus();
              }}
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
              {t("esignature.resign")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
