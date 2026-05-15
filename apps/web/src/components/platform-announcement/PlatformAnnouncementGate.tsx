"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  acknowledgePlatformAnnouncement,
  fetchActivePlatformAnnouncements,
  type PlatformAnnouncementDto,
} from "@/lib/platformAnnouncementsApi";
import { PlatformAnnouncementModal } from "./PlatformAnnouncementModal";

export function PlatformAnnouncementGate({
  sessionReady,
  userId,
  facilityId,
  children,
}: {
  sessionReady: boolean;
  userId?: string;
  facilityId?: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const [items, setItems] = useState<PlatformAnnouncementDto[]>([]);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [sessionSkipped, setSessionSkipped] = useState<Set<string>>(() => new Set());
  const [acknowledging, setAcknowledging] = useState(false);
  const [acknowledgeError, setAcknowledgeError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!sessionReady || !userId || fetchedRef.current) return;
    fetchedRef.current = true;
    let cancelled = false;
    setLoadState("loading");
    void (async () => {
      try {
        const list = await fetchActivePlatformAnnouncements(facilityId);
        if (cancelled) return;
        setItems(list);
        setLoadState("ok");
      } catch {
        if (cancelled) return;
        setItems([]);
        setLoadState("err");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionReady, userId, facilityId]);

  const visible = useMemo(() => {
    return items.find((a) => !sessionSkipped.has(a.id)) ?? null;
  }, [items, sessionSkipped]);

  const onSkip = useCallback(() => {
    if (!visible) return;
    setSessionSkipped((prev) => {
      const next = new Set(prev);
      next.add(visible.id);
      return next;
    });
  }, [visible]);

  const onAcknowledge = useCallback(async () => {
    if (!visible) return;
    setAcknowledging(true);
    setAcknowledgeError(null);
    try {
      await acknowledgePlatformAnnouncement(visible.id, facilityId);
      setItems((prev) => prev.filter((x) => x.id !== visible.id));
    } catch {
      setAcknowledgeError(t("platformAnnouncement.acknowledgeError"));
    } finally {
      setAcknowledging(false);
    }
  }, [visible, facilityId, t]);

  return (
    <>
      {children}
      {loadState === "ok" && visible ? (
        <PlatformAnnouncementModal
          announcement={visible}
          acknowledging={acknowledging}
          acknowledgeError={acknowledgeError}
          onAcknowledge={onAcknowledge}
          onSkip={onSkip}
        />
      ) : null}
    </>
  );
}
