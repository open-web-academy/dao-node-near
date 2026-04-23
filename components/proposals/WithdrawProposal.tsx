"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/lib/config";
import { useWallet } from "@/app/providers";
import { useBalances } from "@/lib/balances";
import { buildWithdrawProposal, type ProposalInput } from "@/lib/proposals";
import { DEFAULT_PROPOSAL_BOND, type Policy, type Role } from "@/lib/dao";
import { ProposalSection, baseCreateGuard, useSubmitProposal } from "./shared";

export function WithdrawProposal({
  sectionLabel = "§4 withdraw",
  policy,
  role,
  onProposalCreated,
}: {
  sectionLabel?: string;
  policy: Policy | null;
  role: Role | null;
  onProposalCreated: () => void;
}) {
  const [config] = useConfig();
  const { accountId } = useWallet();
  const balances = useBalances(config.daoId, config.poolId);
  const [useAll, setUseAll] = useState(false);
  const { status, submit } = useSubmitProposal(config.daoId, policy, onProposalCreated);

  const amountInvalid =
    config.amountNear !== "" && !/^\d+(\.\d+)?$/.test(config.amountNear);

  const proposal = useMemo((): ProposalInput | { error: string } => {
    try {
      if (!config.poolId) return { error: "set pool in §1" };
      if (!useAll && !config.amountNear) {
        return { error: "enter amount in §1 or toggle withdraw_all" };
      }
      return buildWithdrawProposal({
        pool: config.poolId,
        amountNear: useAll ? null : config.amountNear,
        useAll,
      });
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [config.poolId, config.amountNear, useAll]);

  const guard = baseCreateGuard({
    accountId,
    role,
    daoId: config.daoId,
    amountInvalid: useAll ? false : amountInvalid,
  });

  const warn =
    balances.withdrawReady === false
      ? "precondition: is_account_unstaked_balance_available is false — the withdraw proposal will fail until the unstaking period ends (~4 epochs)."
      : null;

  return (
    <ProposalSection
      sectionLabel={sectionLabel}
      title={useAll ? "withdraw_all" : "withdraw"}
      subtitle={`FunctionCall → ${config.poolId || "<pool>"}`}
      bondYocto={policy?.proposal_bond ?? DEFAULT_PROPOSAL_BOND}
      warn={warn}
      proposal={proposal}
      canCreate={guard.canCreate && !("error" in proposal)}
      canCreateReason={guard.reason}
      status={status}
      onCreate={() => !("error" in proposal) && submit(proposal)}
      controls={
        <label className="flex items-center gap-2 font-mono text-[11px] text-ink-muted">
          <input
            type="checkbox"
            checked={useAll}
            onChange={(e) => setUseAll(e.target.checked)}
          />
          use withdraw_all (ignore amount, withdraw everything that's ready)
        </label>
      }
    />
  );
}
