"use client";

import { useCallback, useEffect, useState } from "react";
import { getPolicy, type Policy, type Role, findCouncilRole } from "./dao";

export interface PolicyState {
  policy: Policy | null;
  role: Role | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePolicy(daoId: string, accountId: string | null): PolicyState {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!daoId) {
      setPolicy(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const p = await getPolicy(daoId);
        if (cancelled) return;
        setPolicy(p);
      } catch (e) {
        if (cancelled) return;
        setPolicy(null);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [daoId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const role = policy && accountId ? findCouncilRole(policy, accountId) : null;
  return { policy, role, loading, error, refresh };
}
