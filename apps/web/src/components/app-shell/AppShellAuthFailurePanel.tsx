"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";

export type AppShellAuthFailurePanelProps = {
  message?: string | null;
  onRetry: () => void;
  onLogin: () => void;
  onReload: () => void;
};

export function AppShellAuthFailurePanel({
  message,
  onRetry,
  onLogin,
  onReload,
}: AppShellAuthFailurePanelProps) {
  const { t } = useI18n();

  return (
    <div
      data-testid="app-shell-auth-failure-panel"
      className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-white p-5 shadow-sm md:p-6"
      role="alert"
    >
      <h2 className="m-0 text-base font-semibold text-slate-900">
        {t("appShell.authRecovery.title")}
      </h2>
      <p className="mt-2 mb-0 text-sm leading-relaxed text-slate-700">
        {message?.trim() || t("appShell.authRecovery.body")}
      </p>
      {!message?.trim() ? (
        <p className="mt-1 mb-0 text-xs leading-relaxed text-slate-500">
          {t("appShell.authRecovery.autoRetryHint")}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="app-shell-auth-retry-button"
          onClick={onRetry}
          className="min-h-[40px] rounded-lg border border-teal-600 bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          {t("appShell.authRecovery.retry")}
        </button>
        <button
          type="button"
          data-testid="app-shell-auth-login-button"
          onClick={onLogin}
          className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          {t("appShell.authRecovery.goToLogin")}
        </button>
        <button
          type="button"
          data-testid="app-shell-auth-reload-button"
          onClick={onReload}
          className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          {t("appShell.authRecovery.reloadApp")}
        </button>
      </div>
    </div>
  );
}
