"use client";

import { useWallet } from "@/app/providers";
import { shortAccount } from "@/lib/format";

export function ConnectButton() {
  const { accountId, connect, disconnect, ready } = useWallet();

  if (!ready) {
    return (
      <button
        disabled
        className="font-mono text-xs px-3 py-1.5 border border-paper-rule text-ink-muted"
      >
        loading…
      </button>
    );
  }

  if (!accountId) {
    return (
      <button
        onClick={connect}
        className="font-mono text-xs px-3 py-1.5 border border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
      >
        connect wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-ink-muted">mainnet</span>
      <span className="font-mono text-xs text-ink" title={accountId}>
        {shortAccount(accountId)}
      </span>
      <button
        onClick={disconnect}
        className="font-mono text-xs px-2 py-1 border border-paper-rule text-ink-muted hover:border-bad hover:text-bad"
      >
        disconnect
      </button>
    </div>
  );
}
