"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getAccountStakedBalance,
  getAccountUnstakedBalance,
  isAccountUnstakedBalanceAvailable,
} from "./pool";
import { viewAccount } from "./near";

export interface BalanceSnapshot {
  stakedYocto: string | null;
  unstakedYocto: string | null;
  withdrawReady: boolean | null;
  nativeYocto: string | null;
  fetchedAt: number | null;
  error: string | null;
  loading: boolean;
}

const EMPTY: BalanceSnapshot = {
  stakedYocto: null,
  unstakedYocto: null,
  withdrawReady: null,
  nativeYocto: null,
  fetchedAt: null,
  error: null,
  loading: false,
};

export function useBalances(dao: string, pool: string): BalanceSnapshot & { refresh: () => void } {
  const [state, setState] = useState<BalanceSnapshot>(EMPTY);

  const refresh = useCallback(() => {
    if (!dao || !pool) {
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const [staked, unstaked, ready, account] = await Promise.all([
          getAccountStakedBalance(pool, dao),
          getAccountUnstakedBalance(pool, dao),
          isAccountUnstakedBalanceAvailable(pool, dao),
          viewAccount(dao),
        ]);
        if (cancelled) return;
        setState({
          stakedYocto: staked,
          unstakedYocto: unstaked,
          withdrawReady: ready,
          nativeYocto: account.amount,
          fetchedAt: Date.now(),
          error: null,
          loading: false,
        });
      } catch (e) {
        if (cancelled) return;
        setState({
          ...EMPTY,
          error: e instanceof Error ? e.message : String(e),
          loading: false,
          fetchedAt: Date.now(),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dao, pool]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
