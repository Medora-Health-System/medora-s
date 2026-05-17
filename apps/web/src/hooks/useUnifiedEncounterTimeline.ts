"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { parseUnifiedTimelineResponse } from "@/lib/parseUnifiedTimelineResponse";
import type { UnifiedTimelineApiItem } from "@/lib/unifiedEncounterTimelineUi";

const DEFAULT_LIMIT = 80;

export function useUnifiedEncounterTimeline(
  encounterId: string,
  facilityId: string,
  options?: { limit?: number; refreshToken?: number }
) {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const [state, setState] = useState<{
    loading: boolean;
    error: boolean;
    items: UnifiedTimelineApiItem[];
    capped: boolean;
    limit: number;
  }>({ loading: true, error: false, items: [], capped: false, limit });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    (async () => {
      try {
        const data = await apiFetch(`/encounters/${encounterId}/unified-timeline?limit=${limit}`, {
          facilityId,
        });
        if (cancelled) return;
        const parsed = parseUnifiedTimelineResponse(data);
        setState({
          loading: false,
          error: false,
          items: parsed.items,
          capped: parsed.capped,
          limit: parsed.limit,
        });
      } catch {
        if (!cancelled) {
          setState({ loading: false, error: true, items: [], capped: false, limit });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, limit, options?.refreshToken]);

  return state;
}
