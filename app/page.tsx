"use client";

import { useCallback, useRef } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { ConfigForm } from "@/components/ConfigForm";
import { BalancePanel } from "@/components/BalancePanel";
import { UnstakeProposal } from "@/components/proposals/UnstakeProposal";
import { WithdrawProposal } from "@/components/proposals/WithdrawProposal";
import { TransferProposal } from "@/components/proposals/TransferProposal";
import { ProposalList, type ProposalListHandle } from "@/components/ProposalList";
import { CouncilBadge } from "@/components/CouncilBadge";
import { useConfig } from "@/lib/config";
import { useWallet } from "./providers";
import { usePolicy } from "@/lib/usePolicy";

export default function Page() {
  const [config] = useConfig();
  const { accountId } = useWallet();
  const { policy, role, loading } = usePolicy(config.daoId, accountId);
  const listRef = useRef<ProposalListHandle>(null);

  const onProposalCreated = useCallback(() => {
    listRef.current?.refresh();
  }, []);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <header className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-mono text-base tracking-tight">
            DAO Staking Console <span className="text-ink-muted">/ v1</span>
          </h1>
          <p className="font-mono text-[11px] text-ink-muted mt-1">
            unstake → wait ~4 epochs → withdraw → transfer. each step is a separate DAO proposal.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <CouncilBadge
            role={role}
            accountId={accountId}
            loading={loading && Boolean(config.daoId)}
          />
          <ConnectButton />
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <ConfigForm />
        <BalancePanel />
        <UnstakeProposal policy={policy} role={role} onProposalCreated={onProposalCreated} />
        <WithdrawProposal policy={policy} role={role} onProposalCreated={onProposalCreated} />
        <TransferProposal policy={policy} role={role} onProposalCreated={onProposalCreated} />
        <ProposalList ref={listRef} role={role} sectionLabel="§6 proposals (last 20)" />
      </div>

      <footer className="mt-12 font-mono text-[10px] text-ink-muted flex justify-between">
        <span>
          network: mainnet · rpc: free.rpc.fastnear.com (fallback: /api/rpc proxy)
        </span>
        <span>no backend · no indexer · all reads direct from RPC</span>
      </footer>
    </main>
  );
}
