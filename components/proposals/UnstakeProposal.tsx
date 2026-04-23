"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/lib/config";
import { useWallet } from "@/app/providers";
import { buildUnstakeProposal, type ProposalInput } from "@/lib/proposals";
import { DEFAULT_PROPOSAL_BOND, type Policy, type Role } from "@/lib/dao";
import { ProposalSection, baseCreateGuard, useSubmitProposal } from "./shared";

export function UnstakeProposal({
  sectionLabel = "§3 unstake",
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
  const [useAll, setUseAll] = useState(false);
  const { status, submit } = useSubmitProposal(config.daoId, policy, onProposalCreated);

  const amountInvalid =
    config.amountNear !== "" && !/^\d+(\.\d+)?$/.test(config.amountNear);

  const proposal = useMemo((): ProposalInput | { error: string } => {
    try {
      if (!config.poolId) return { error: "set pool in §1" };
      if (!useAll && !config.amountNear) {
        return { error: "enter amount in §1 or toggle unstake_all" };
      }
      return buildUnstakeProposal({
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

  return (
    <ProposalSection
      sectionLabel={sectionLabel}
      title={useAll ? "unstake_all" : "unstake"}
      subtitle={`FunctionCall → ${config.poolId || "<pool>"}`}
      bondYocto={policy?.proposal_bond ?? DEFAULT_PROPOSAL_BOND}
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
          use unstake_all (ignore amount, unstake the entire staked balance)
        </label>
      }
    />
  );
}
