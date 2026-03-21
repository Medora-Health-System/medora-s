"use client";

import React from "react";

const btnStyle: React.CSSProperties = {
  padding: "8px 16px",
  border: "1px solid #ccc",
  borderRadius: 4,
  backgroundColor: "white",
  cursor: "pointer",
  fontSize: 14,
};

export function MedicationPrintButton({
  onPrint,
  label = "Imprimer",
}: {
  onPrint?: () => void;
  label?: string;
}) {
  const handleClick = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };
  return (
    <button type="button" onClick={handleClick} style={btnStyle}>
      {label}
    </button>
  );
}
