"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  setupWalletSelector,
  type WalletSelector,
  type Wallet,
  type AccountState,
} from "@near-wallet-selector/core";
import { setupModal, type WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";

type TxOutcome = unknown;

interface SignAndSendParams {
  receiverId: string;
  actions: Array<{
    type: "FunctionCall";
    params: {
      methodName: string;
      args: Record<string, unknown>;
      gas: string;
      deposit: string;
    };
  }>;
}

interface WalletContextValue {
  selector: WalletSelector | null;
  modal: WalletSelectorModal | null;
  accounts: AccountState[];
  accountId: string | null;
  ready: boolean;
  connect: () => void;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (params: SignAndSendParams) => Promise<TxOutcome>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const CONTRACT_ID = "social.near"; // Neutral placeholder; wallet-selector needs a default but we target DAOs at call-time.

export function Providers({ children }: { children: React.ReactNode }) {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accounts, setAccounts] = useState<AccountState[]>([]);
  const [ready, setReady] = useState(false);
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sel = await setupWalletSelector({
          network: "mainnet",
          modules: [setupMyNearWallet(), setupMeteorWallet()],
        });
        if (cancelled) return;
        const m = setupModal(sel, { contractId: CONTRACT_ID });
        const state = sel.store.getState();
        setSelector(sel);
        setModal(m);
        setAccounts(state.accounts);
        setReady(true);
        const sub = sel.store.observable.subscribe((s) => {
          setAccounts(s.accounts);
        });
        // The observable subscription object from rxjs exposes unsubscribe.
        subRef.current = sub as unknown as { unsubscribe: () => void };
      } catch (e) {
        console.error("wallet-selector init failed", e);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
      subRef.current?.unsubscribe();
    };
  }, []);

  const accountId = useMemo(
    () => accounts.find((a) => a.active)?.accountId ?? null,
    [accounts],
  );

  const connect = useCallback(() => {
    modal?.show();
  }, [modal]);

  const disconnect = useCallback(async () => {
    if (!selector) return;
    const wallet: Wallet = await selector.wallet();
    await wallet.signOut().catch(() => {
      /* ignore */
    });
  }, [selector]);

  const signAndSendTransaction = useCallback<WalletContextValue["signAndSendTransaction"]>(
    async (params) => {
      if (!selector) throw new Error("wallet-selector not ready");
      if (!accountId) throw new Error("not signed in");
      const wallet = await selector.wallet();
      return wallet.signAndSendTransaction({
        signerId: accountId,
        receiverId: params.receiverId,
        actions: params.actions,
      });
    },
    [selector, accountId],
  );

  const value: WalletContextValue = {
    selector,
    modal,
    accounts,
    accountId,
    ready,
    connect,
    disconnect,
    signAndSendTransaction,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <Providers>");
  return ctx;
}
