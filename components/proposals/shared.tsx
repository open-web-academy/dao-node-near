"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/app/providers";
import {
  DAO_ADD_PROPOSAL_GAS,
  DEFAULT_PROPOSAL_BOND,
  type Policy,
  type Role,
} from "@/lib/dao";
import type { ProposalInput } from "@/lib/proposals";
import { parseTxSuccessValue } from "@/lib/near";
import { fmtNear } from "@/lib/format";

export type SubmitStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok"; proposalId: string | null }
  | { kind: "err"; message: string };

export function useSubmitProposal(
  daoId: string,
  policy: Policy | null,
  onCreated: () => void,
): {
  status: SubmitStatus;
  submit: (proposal: ProposalInput) => Promise<void>;
  reset: () => void;
} {
  const { signAndSendTransaction } = useWallet();
  const [status, setStatus] = useState<SubmitStatus>({ kind: "idle" });
  const bond = policy?.proposal_bond ?? DEFAULT_PROPOSAL_BOND;

  const submit = useCallback(
    async (proposal: ProposalInput) => {
      setStatus({ kind: "submitting" });
      try {
        const outcome = await signAndSendTransaction({
          receiverId: daoId,
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "add_proposal",
                args: { proposal },
                gas: DAO_ADD_PROPOSAL_GAS,
                deposit: bond,
              },
            },
          ],
        });
        const raw = parseTxSuccessValue(outcome);
        const id = raw ? raw.replace(/"/g, "") : null;
        setStatus({ kind: "ok", proposalId: id });
        onCreated();
      } catch (e) {
        setStatus({ kind: "err", message: e instanceof Error ? e.message : String(e) });
      }
    },
    [daoId, bond, signAndSendTransaction, onCreated],
  );

  const reset = useCallback(() => setStatus({ kind: "idle" }), []);
  return { status, submit, reset };
}

export function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="font-mono text-[10px] leading-snug bg-paper border border-paper-rule p-2 overflow-x-auto max-h-56">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function StatusLine({ status }: { status: SubmitStatus }) {
  if (status.kind === "idle") return null;
  if (status.kind === "submitting") {
    return <div className="font-mono text-[11px] text-ink-muted">submitting…</div>;
  }
  if (status.kind === "ok") {
    return (
      <div className="font-mono text-[11px] text-ok">
        proposal created{status.proposalId ? ` — id #${status.proposalId}` : ""}.
      </div>
    );
  }
  return (
    <div className="font-mono text-[11px] text-bad whitespace-pre-wrap break-all">
      {status.message}
    </div>
  );
}

export interface ProposalSectionProps {
  sectionLabel: string; // e.g. "§3 unstake"
  title: string;
  subtitle: string;
  bondYocto: string;
  warn?: string | null;
  proposal: ProposalInput | { error: string };
  canCreate: boolean;
  canCreateReason: string | null;
  status: SubmitStatus;
  onCreate: () => void;
  controls?: React.ReactNode;
}

export function ProposalSection({
  sectionLabel,
  title,
  subtitle,
  bondYocto,
  warn,
  proposal,
  canCreate,
  canCreateReason,
  status,
  onCreate,
  controls,
}: ProposalSectionProps) {
  const hasError = "error" in proposal;
  return (
    <section className="border border-paper-rule bg-paper-card">
      <header className="flex items-baseline justify-between px-4 py-2.5 border-b border-paper-rule">
        <h2 className="font-mono text-xs uppercase tracking-widest">{sectionLabel}</h2>
        <span className="font-mono text-[10px] text-ink-muted">
          bond: {fmtNear(bondYocto)} NEAR · gas: 200 Tgas
        </span>
      </header>
      <div className="p-4 flex flex-col gap-3">
        <div>
          <div className="font-mono text-sm">{title}</div>
          <div className="font-mono text-[11px] text-ink-muted mt-0.5">{subtitle}</div>
        </div>
        {warn && (
          <div className="font-mono text-[11px] text-warn border border-warn/40 px-2 py-1">
            {warn}
          </div>
        )}
        {controls}
        {hasError ? (
          <div className="font-mono text-[11px] text-bad">{proposal.error}</div>
        ) : (
          <JsonPreview value={proposal} />
        )}
        <div className="flex items-center justify-between gap-3">
          <StatusLine status={status} />
          <button
            disabled={!canCreate || hasError || status.kind === "submitting"}
            onClick={onCreate}
            title={!canCreate ? canCreateReason ?? undefined : undefined}
            className="font-mono text-[11px] uppercase tracking-widest px-3 py-1.5 border border-ink text-ink hover:bg-ink hover:text-paper disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
          >
            create proposal
          </button>
        </div>
      </div>
    </section>
  );
}

export function baseCreateGuard(params: {
  accountId: string | null;
  role: Role | null;
  daoId: string;
  amountInvalid: boolean;
}): { canCreate: boolean; reason: string | null } {
  const { accountId, role, daoId, amountInvalid } = params;
  if (!accountId) return { canCreate: false, reason: "connect wallet first" };
  if (!role) return { canCreate: false, reason: "only council members can create proposals" };
  if (!daoId) return { canCreate: false, reason: "set DAO in §1" };
  if (amountInvalid) return { canCreate: false, reason: "invalid amount" };
  return { canCreate: true, reason: null };
}
