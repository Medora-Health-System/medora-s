"use client";

import React, { useMemo } from "react";
import { isSignatureEmpty, normalizeSignatureValue, type SignatureValue } from "./signatureVectorModel";

export function SignatureVectorRenderer({
  value,
  signerName,
  signedAt,
  relationship,
}: {
  value: SignatureValue | null | undefined;
  signerName?: string;
  signedAt?: string;
  relationship?: string;
}) {
  const signature = useMemo(() => normalizeSignatureValue(value), [value]);
  if (!signature || isSignatureEmpty(signature)) return null;
  const paths = signature.strokes
    .filter((stroke) => stroke.points.length > 0)
    .map((stroke) => {
      const [first, ...points] = stroke.points;
      return `M ${first.x} ${first.y} ${points.map((point, index) => {
        const previous = stroke.points[index];
        return `Q ${previous.x} ${previous.y} ${(previous.x + point.x) / 2} ${(previous.y + point.y) / 2}`;
      }).join(" ")}`;
    });

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, background: "#fff" }}>
      <svg viewBox={`0 0 ${signature.width} ${signature.height}`} role="img" aria-label={signerName || "Signature"} style={{ display: "block", width: "100%", height: 90 }}>
        {paths.map((d, index) => <path key={index} d={d} fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />)}
      </svg>
      {(signerName || signedAt || relationship) && (
        <div style={{ fontSize: 11, color: "#475569" }}>
          {[signerName, relationship, signedAt].filter(Boolean).join(" · ")}
        </div>
      )}
    </div>
  );
}
