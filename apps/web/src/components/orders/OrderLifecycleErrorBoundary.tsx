"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
};

type State = {
  hasError: boolean;
};

/**
 * MEDUI.ORDERS.CLIENT_STATE_ENGINE_PRODUCTION_AUDIT_AND_CERTIFICATION.1
 * Isolates order lifecycle render failures so one line cannot white-screen a worklist.
 */
export class OrderLifecycleErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error);
    if (process.env.NODE_ENV !== "production") {
      console.error("[OrderLifecycleErrorBoundary]", error);
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            role="alert"
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            Impossible d&apos;afficher cette ligne de commande. Actualisez la page ou réessayez.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
