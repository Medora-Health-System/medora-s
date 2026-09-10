"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { platformContextApi, type PlatformContext } from "@/lib/platform/api";
import { canEnter, type PlatformArea } from "./access";
import { useI18n } from "@/i18n/I18nProvider";

const Context = createContext<{ context?: PlatformContext; refresh: () => Promise<void> }>({
  refresh: async () => {},
});

export function PlatformContextProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<PlatformContext>();
  const [error, setError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  async function refresh() {
    try {
      setError(false);
      setContext(await platformContextApi.get());
    } catch (e: any) {
      if (e?.status === 401) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      else if (e?.status === 403) router.replace("/app");
      else setError(true);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  if (error)
    return (
      <main className="platform-state">
        <h1>{t("context.unavailable")}</h1>
        <p>{t("context.unverified")}</p>
        <button onClick={() => void refresh()}>{t("common.retry")}</button>
      </main>
    );
  if (!context)
    return (
      <main className="platform-state" aria-busy="true">
        <div className="platform-spinner" />
        <h1>{t("context.verifying")}</h1>
        <p>{t("context.hidden")}</p>
      </main>
    );
  return <Context.Provider value={{ context, refresh }}>{children}</Context.Provider>;
}
export function usePlatform() {
  return useContext(Context);
}
export function AreaGate({ area, children }: { area: PlatformArea; children: React.ReactNode }) {
  const { context } = usePlatform();
  const router = useRouter();
  useEffect(() => {
    if (context && !canEnter(context, area)) router.replace("/platform");
  }, [context, area, router]);
  return context && canEnter(context, area) ? children : <main className="platform-state" aria-busy="true" />;
}
