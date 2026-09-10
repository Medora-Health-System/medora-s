"use client";
import { createContext, useContext, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
type Pending = { retry: () => Promise<void>; reject: (e: Error) => void };
const Context = createContext<(retry: () => Promise<void>) => Promise<void>>(async () => {});
export function PlatformStepUpProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [pending, setPending] = useState<Pending | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = (retry: () => Promise<void>) =>
    new Promise<void>((resolve, reject) => setPending({ retry: async () => { await retry(); resolve(); }, reject }));
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/mfa/step-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!r.ok) throw new Error(t("stepUp.rejected"));
      const action = pending;
      setCode("");
      setPending(null);
      await action?.retry();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("stepUp.failed"));
    } finally {
      setBusy(false);
    }
  }
  function close() {
    pending?.reject(new Error(t("stepUp.cancelled")));
    setPending(null);
    setCode("");
    setError("");
  }
  return (
    <Context.Provider value={request}>
      {children}
      {pending && (
        <div className="platform-modal-backdrop">
          <section className="platform-modal" role="dialog" aria-modal="true" aria-labelledby="step-up-title">
            <h2 id="step-up-title">{t("stepUp.title")}</h2>
            <p>{t("stepUp.body")}</p>
            <form onSubmit={verify}>
              <label>
                {t("stepUp.code")}
                <input
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </label>
              {error && (
                <p className="platform-error" role="alert">
                  {error}
                </p>
              )}
              <div className="page-actions">
                <button type="button" onClick={close}>
                  {t("common.cancel")}
                </button>
                <button className="button high-risk" disabled={busy || code.length !== 6}>
                  {busy ? t("stepUp.verifying") : t("stepUp.continue")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </Context.Provider>
  );
}
export function usePlatformStepUp() {
  return useContext(Context);
}
