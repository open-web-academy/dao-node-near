"use client";

import { useConfig } from "@/lib/config";
import { useBalances } from "@/lib/balances";
import { fmtNear, STORAGE_BUFFER_YOCTO } from "@/lib/format";

function Card({
  title,
  yocto,
  note,
  tone,
}: {
  title: string;
  yocto: string | null;
  note?: string;
  tone?: "default" | "ok" | "warn" | "muted";
}) {
  const toneBorder =
    tone === "ok"
      ? "border-ok/40"
      : tone === "warn"
        ? "border-warn/40"
        : "border-paper-rule";
  const toneLabel =
    tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-ink-muted";
  return (
    <div className={`border ${toneBorder} bg-paper-card p-4`}>
      <div className={`text-[10px] uppercase tracking-widest ${toneLabel}`}>{title}</div>
      <div className="font-mono text-xl mt-1" title={yocto ?? ""}>
        {fmtNear(yocto)} <span className="text-ink-muted text-xs">NEAR</span>
      </div>
      {note && <div className="font-mono text-[10px] text-ink-muted mt-1">{note}</div>}
    </div>
  );
}

export function BalancePanel() {
  const [config] = useConfig();
  const balances = useBalances(config.daoId, config.poolId);

  const configured = Boolean(config.daoId && config.poolId);

  const unstakingLocked =
    balances.withdrawReady === false ? balances.unstakedYocto : "0";
  const readyToWithdraw =
    balances.withdrawReady === true ? balances.unstakedYocto : "0";

  let safeToTransfer: string | null = null;
  if (balances.nativeYocto) {
    const raw = BigInt(balances.nativeYocto);
    const safe = raw > STORAGE_BUFFER_YOCTO ? raw - STORAGE_BUFFER_YOCTO : 0n;
    safeToTransfer = safe.toString();
  }

  return (
    <section className="border border-paper-rule bg-paper-card">
      <header className="flex items-baseline justify-between px-4 py-2.5 border-b border-paper-rule">
        <h2 className="font-mono text-xs uppercase tracking-widest">§2 balances</h2>
        <div className="flex items-center gap-3">
          {balances.fetchedAt && (
            <span className="font-mono text-[10px] text-ink-muted">
              updated {new Date(balances.fetchedAt).toISOString().slice(11, 19)}Z
            </span>
          )}
          <button
            disabled={!configured || balances.loading}
            onClick={balances.refresh}
            className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border border-paper-rule hover:border-ink disabled:opacity-40"
          >
            {balances.loading ? "refreshing…" : "refresh"}
          </button>
        </div>
      </header>

      {!configured ? (
        <div className="p-4 font-mono text-xs text-ink-muted">
          set DAO and pool in §1 to view balances.
        </div>
      ) : balances.error ? (
        <div className="p-4 font-mono text-xs text-bad whitespace-pre-wrap break-all">
          {balances.error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-paper-rule">
            <Card
              title="staked (earning)"
              yocto={balances.stakedYocto}
              note="on pool, delegated"
            />
            <Card
              title="unstaking (locked)"
              yocto={unstakingLocked}
              tone="warn"
              note="unlocks in ~4 epochs (~52-65h)"
            />
            <Card
              title="ready to withdraw"
              yocto={readyToWithdraw}
              tone={balances.withdrawReady ? "ok" : "muted"}
              note={balances.withdrawReady ? "can_withdraw: true" : "can_withdraw: false"}
            />
            <Card
              title="DAO native"
              yocto={balances.nativeYocto}
              note={`safe to transfer: ${fmtNear(safeToTransfer)} NEAR`}
            />
          </div>
        </>
      )}
    </section>
  );
}
