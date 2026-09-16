"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { fetchAuthMeSession } from "@/lib/authSessionMe";
import {
  isRecentMfaError,
  platformPrivilegedActionsApi,
  type PrivilegedAction,
} from "@/lib/platform/api";
import { can, mayApprove, mayCancel, mayExecute, mayReject } from "./access";
import { usePlatform } from "./PlatformContext";
import { usePlatformStepUp } from "./PlatformStepUp";
import { Audit, Badge, Page } from "./PlatformUi";
import { MfaRecoveryRequest } from "./MfaRecoveryRequest";

const statuses = ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "EXPIRED", "EXECUTED", "FAILED"];

async function withStepUp(run: () => Promise<void>, step: (retry: () => Promise<void>) => Promise<void>) {
  try {
    await run();
  } catch (error) {
    if (isRecentMfaError(error)) return step(run);
    throw error;
  }
}

export function SecurityConsole() {
  const { context } = usePlatform();
  const step = usePlatformStepUp();
  const { t } = useI18n();
  const [rows, setRows] = useState<PrivilegedAction[]>();
  const [status, setStatus] = useState("");
  const [actorUserId, setActorUserId] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setError("");
    try {
      const me = await fetchAuthMeSession();
      const id = me.ok && typeof me.data?.id === "string" ? me.data.id : "";
      setActorUserId(id);
      await withStepUp(async () => {
        setRows(await platformPrivilegedActionsApi.list(status || undefined));
      }, step);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.requestDenied"));
    }
  };

  useEffect(() => {
    void load();
  }, [status]);

  async function act(kind: "approve" | "execute" | "reject" | "cancel", row: PrivilegedAction) {
    if (!context || !actorUserId || busyId) return;

    const allowed =
      kind === "approve"
        ? mayApprove(row, actorUserId, context)
        : kind === "reject"
          ? mayReject(row, actorUserId, context)
          : kind === "cancel"
            ? mayCancel(row, actorUserId)
            : mayExecute(row, actorUserId, context);

    if (!allowed) {
      setError("This action is not available for the current user or request state.");
      return;
    }

    const promptKey =
      kind === "reject"
        ? "prompt.rejectReason"
        : kind === "cancel"
          ? "prompt.cancelReason"
          : "prompt.approveReason";
    const reason = kind === "reject" || kind === "cancel" ? window.prompt(t(promptKey))?.trim() : undefined;
    if ((kind === "reject" || kind === "cancel") && !reason) return;

    setBusyId(row.id);
    setError("");
    try {
      await withStepUp(async () => {
        if (kind === "reject" || kind === "cancel") {
          await platformPrivilegedActionsApi[kind](row.id, reason!);
        } else {
          await platformPrivilegedActionsApi[kind](row.id);
        }
      }, step);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.requestDenied"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Page area="security" title={t("security.title")} subtitle={t("security.subtitle")}>
      {can(context, "SECURITY_MFA_RECOVERY") && <MfaRecoveryRequest />}
      {context?.platformPrincipal && (
        <section className="platform-panel">
          <h2>{t("security.msppTitle")}</h2>
          <p>{t("security.msppNotice")}</p>
          <Link className="button" href="/app/admin/mspp-access">
            {t("security.openMspp")}
          </Link>
        </section>
      )}

      <section className="platform-panel" id="requests">
        <div className="panel-heading">
          <h2>{t("security.privilegedRequests")}</h2>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t("facilities.allStatuses")}</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <p className="notice">{t("security.immutableNotice")}</p>
        {!actorUserId && (
          <p className="notice">Action buttons remain disabled until the signed-in user identity is verified.</p>
        )}
        {error && <p className="platform-error" role="alert">{error}</p>}

        {!rows ? (
          <div className="skeleton-table" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("security.operationTarget")}</th>
                  <th>{t("security.exactScope")}</th>
                  <th>{t("security.reason")}</th>
                  <th>{t("security.status")}</th>
                  <th>{t("security.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const canApprove = !!context && !!actorUserId && mayApprove(r, actorUserId, context);
                  const canReject = !!context && !!actorUserId && mayReject(r, actorUserId, context);
                  const canCancel = !!actorUserId && mayCancel(r, actorUserId);
                  const canExecute = !!context && !!actorUserId && mayExecute(r, actorUserId, context);
                  const busy = busyId === r.id;
                  return (
                    <tr key={r.id}>
                      <td>
                        <b>{r.operationType.replaceAll("_", " ")}</b>
                        <small>{r.targetUserId || r.targetFacilityId}</small>
                      </td>
                      <td>{String(r.scope.capabilityCode || r.scope.persona || (r.scope.isActive ?? "—"))}</td>
                      <td>
                        {r.reason}
                        <small>{r.ticketReference || t("security.noTicket")}</small>
                      </td>
                      <td><Badge value={r.status} /></td>
                      <td>
                        {canApprove && (
                          <button disabled={busy} onClick={() => void act("approve", r)}>{t("common.approve")}</button>
                        )}
                        {canReject && (
                          <button disabled={busy} onClick={() => void act("reject", r)}>{t("common.reject")}</button>
                        )}
                        {canCancel && (
                          <button disabled={busy} onClick={() => void act("cancel", r)}>{t("common.cancel")}</button>
                        )}
                        {canExecute && (
                          <button disabled={busy} onClick={() => void act("execute", r)}>{t("security.executeOnce")}</button>
                        )}
                        {!canApprove && !canReject && !canCancel && !canExecute && <span>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Audit />
    </Page>
  );
}
