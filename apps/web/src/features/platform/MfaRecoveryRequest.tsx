"use client";
import { useEffect, useState } from "react";
import { platformPrivilegedActionsApi, platformStaffApi, isRecentMfaError, type EligibleUser } from "@/lib/platform/api";
import { usePlatformStepUp } from "./PlatformStepUp";
import { useI18n } from "@/i18n/I18nProvider";

export function MfaRecoveryRequest() {
  const { t } = useI18n();
  const [users, setUsers] = useState<EligibleUser[]>([]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const step = usePlatformStepUp();
  async function load() {
    try {
      setUsers(await platformStaffApi.securityUsers());
    } catch (e) {
      if (isRecentMfaError(e)) await step(load);
      else setMessage(e instanceof Error ? e.message : t("mfa.unableUsers"));
    }
  }
  useEffect(() => {
    if (open) void load();
  }, [open]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const run = async () => {
      await platformPrivilegedActionsApi.create({
        operationType: "MFA_RESET",
        targetUserId: String(f.get("targetUserId")),
        reason: String(f.get("reason")),
        ...(f.get("ticketReference") ? { ticketReference: String(f.get("ticketReference")) } : {}),
      });
      setMessage(t("mfa.success"));
      setOpen(false);
    };
    try {
      await run();
    } catch (err) {
      if (isRecentMfaError(err)) await step(run);
      else setMessage(err instanceof Error ? err.message : t("common.requestDenied"));
    }
  }
  return (
    <section className="platform-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{t("mfa.eyebrow")}</span>
          <h2>{t("mfa.title")}</h2>
        </div>
        <button className="button high-risk" onClick={() => setOpen(!open)}>
          {t("mfa.request")}
        </button>
      </div>
      <p>{t("mfa.body")}</p>
      {message && <p className="notice">{message}</p>}
      {open && (
        <form className="platform-form" onSubmit={submit}>
          <label>
            {t("mfa.activeUser")}
            <select name="targetUserId" required>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.email}) — MFA {u.mfaEnabled ? t("mfa.enabled") : t("mfa.disabled")}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("staff.reason")}
            <textarea name="reason" required minLength={3} />
          </label>
          <label>
            {t("staff.ticket")}
            <input name="ticketReference" />
          </label>
          <button className="button high-risk">{t("mfa.create")}</button>
        </form>
      )}
    </section>
  );
}
