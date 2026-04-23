"use client";

import { useMemo } from "react";
import { useConfig } from "@/lib/config";
import { useWallet } from "@/app/providers";
import { useBalances } from "@/lib/balances";
import { buildTransferProposal, type ProposalInput } from "@/lib/proposals";
import { DEFAULT_PROPOSAL_BOND, type Policy, type Role } from "@/lib/dao";
import {
  STORAGE_BUFFER_YOCTO,
  fmtNear,
  isValidAccountId,
  nearToYocto,
} from "@/lib/format";
import { ProposalSection, baseCreateGuard, useSubmitProposal } from "./shared";

export function TransferProposal({
  sectionLabel = "§5 transfer",
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
  const { status, submit } = useSubmitProposal(config.daoId, policy, onProposalCreated);

  const amountInvalid =
    config.amountNear !== "" && !/^\d+(\.\d+)?$/.test(config.amountNear);

  const proposal = useMemo((): ProposalInput | { error: string } => {
    try {
      if (!config.destinationId) return { error: "set destination in §1" };
      if (!isValidAccountId(config.destinationId)) {
        return { error: "destination is not a valid account id" };
      }
      if (!config.amountNear) return { error: "enter amount in §1" };
      return buildTransferProposal({
        receiverId: config.destinationId,
        amountNear: config.amountNear,
      });
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [config.destinationId, config.amountNear]);

  const warn = (() => {
    if (!config.amountNear || amountInvalid) return null;
    if (!balances.nativeYocto) return null;
    let amountY: bigint;
    try {
      amountY = BigInt(nearToYocto(config.amountNear));
    } catch {
      return null;
    }
    const native = BigInt(balances.nativeYocto);
    const safe = native > STORAGE_BUFFER_YOCTO ? native - STORAGE_BUFFER_YOCTO : 0n;
    if (amountY > native) {
      return `blocking: transfer amount exceeds DAO native balance (${fmtNear(balances.nativeYocto)} NEAR).`;
    }
    if (amountY > safe) {
      return `blocking: transfer would leave DAO below 0.5 NEAR storage buffer. Safe max: ${fmtNear(safe.toString())} NEAR.`;
    }
    return null;
  })();

  const blocking = Boolean(warn && warn.startsWith("blocking"));

  const guard = baseCreateGuard({
    accountId,
    role,
    daoId: config.daoId,
    amountInvalid,
  });

  const canCreate = guard.canCreate && !("error" in proposal) && !blocking;
  const reason = blocking ? "transfer is blocked — see warning" : guard.reason;

  return (
    <ProposalSection
      sectionLabel={sectionLabel}
      title="transfer"
      subtitle={`Transfer → ${config.destinationId || "<destination>"}`}
      bondYocto={policy?.proposal_bond ?? DEFAULT_PROPOSAL_BOND}
      warn={warn}
      proposal={proposal}
      canCreate={canCreate}
      canCreateReason={reason}
      status={status}
      onCreate={() => !("error" in proposal) && !blocking && submit(proposal)}
    />
  );
}
