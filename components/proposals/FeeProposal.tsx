"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfig } from "@/lib/config";
import { useWallet } from "@/app/providers";
import { buildFeeProposal, type ProposalInput } from "@/lib/proposals";
import { getOwnerId, getRewardFeeFraction, type RewardFeeFraction } from "@/lib/pool";
import { DEFAULT_PROPOSAL_BOND, type Policy, type Role } from "@/lib/dao";
import { ProposalSection, baseCreateGuard, useSubmitProposal } from "./shared";

function fmtFraction(f: RewardFeeFraction): string {
  if (!f.denominator) return "—";
  const pct = (f.numerator / f.denominator) * 100;
  return `${Number(pct.toFixed(4))}% (${f.numerator}/${f.denominator})`;
}

export function FeeProposal({
  sectionLabel = "§6 reward fee",
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
  const [feePercent, setFeePercent] = useState("");
  const [currentFee, setCurrentFee] = useState<RewardFeeFraction | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const { status, submit } = useSubmitProposal(config.daoId, policy, onProposalCreated);

  useEffect(() => {
    setCurrentFee(null);
    setOwnerId(null);
    if (!config.poolId) return;
    let cancelled = false;
    getRewardFeeFraction(config.poolId)
      .then((f) => !cancelled && setCurrentFee(f))
      .catch(() => {});
    getOwnerId(config.poolId)
      .then((o) => !cancelled && setOwnerId(o))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [config.poolId]);

  const proposal = useMemo((): ProposalInput | { error: string } => {
    try {
      if (!config.poolId) return { error: "set pool in §1" };
      if (!feePercent) return { error: "enter the new fee (%)" };
      return buildFeeProposal({ pool: config.poolId, feePercent });
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [config.poolId, feePercent]);

  const guard = baseCreateGuard({
    accountId,
    role,
    daoId: config.daoId,
    amountInvalid: false,
  });

  const warn =
    ownerId && config.daoId && ownerId !== config.daoId
      ? `precondition: pool owner is ${ownerId}, not ${config.daoId} — update_reward_fee_fraction is owner-only, so the proposal will fail on execution.`
      : null;

  return (
    <ProposalSection
      sectionLabel={sectionLabel}
      title="update_reward_fee_fraction"
      subtitle={`FunctionCall → ${config.poolId || "<pool>"}`}
      bondYocto={policy?.proposal_bond ?? DEFAULT_PROPOSAL_BOND}
      warn={warn}
      proposal={proposal}
      canCreate={guard.canCreate && !("error" in proposal)}
      canCreateReason={guard.reason}
      status={status}
      onCreate={() => !("error" in proposal) && submit(proposal)}
      controls={
        <div className="flex flex-col gap-2 font-mono text-[11px] text-ink-muted">
          <div>
            current fee: {currentFee ? fmtFraction(currentFee) : "—"}
            {ownerId && <> · owner: {ownerId}</>}
          </div>
          <label className="flex items-center gap-2">
            new fee
            <input
              type="text"
              inputMode="decimal"
              value={feePercent}
              onChange={(e) => setFeePercent(e.target.value)}
              placeholder="e.g. 5"
              className="w-24 bg-paper-card border border-paper-rule px-2 py-1 text-sm text-ink outline-none focus:border-ink"
            />
            %
          </label>
        </div>
      }
    />
  );
}
