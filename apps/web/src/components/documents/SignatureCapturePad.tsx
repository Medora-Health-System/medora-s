"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

type Point = { x: number; y: number; t: number };
type Stroke = Point[];

export type SignatureResult = {
  strokes: Stroke[];
  width: number;
  height: number;
};

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
  const currentStroke = useRef<Stroke>([]);

  const PAD_WIDTH = 400;
  const PAD_HEIGHT = 160;

  useEffect(() => {
    redraw();
  }, [strokes]);

  useEffect(() => {
    if (strokes.length > 0) {
      onCapture({ strokes, width: PAD_WIDTH, height: PAD_HEIGHT });
    } else {
      onCapture(null);
    }
  }, [strokes, onCapture]);

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

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = PAD_WIDTH / rect.width;
    const scaleY = PAD_HEIGHT / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    currentStroke.current = [{ ...pos, t: Date.now() }];
  };

  const moveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    currentStroke.current.push({ ...pos, t: Date.now() });
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = currentStroke.current;
    if (s.length >= 2) {
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s[s.length - 2].x, s[s.length - 2].y);
      ctx.lineTo(s[s.length - 1].x, s[s.length - 1].y);
      ctx.stroke();
    }
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.current.length > 1) {
      setStrokes((prev) => [...prev, currentStroke.current]);
    }
    currentStroke.current = [];
  };

  const clear = () => {
    setStrokes([]);
    currentStroke.current = [];
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
          }}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
        />
        {strokes.length === 0 && !isDrawing && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            {disabled ? t("esignature.locked") : t("esignature.signHere")}
          </div>
        )}
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={clear}
          style={{
            marginTop: 4,
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
      )}
    </div>
  );
}
