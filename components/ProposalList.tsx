"use client";

import { useCallback, useEffect, useImperativeHandle, useState, forwardRef } from "react";
import { useConfig } from "@/lib/config";
import { useWallet } from "@/app/providers";
import {
  getLastProposalId,
  getProposals,
  DAO_ACT_PROPOSAL_GAS,
  type Proposal,
  type ProposalAction,
  type Role,
} from "@/lib/dao";
import { shortAccount } from "@/lib/format";

export interface ProposalListHandle {
  refresh: () => void;
}

type Filter = "all" | "inProgress" | "mine";

function kindLabel(kind: Proposal["kind"]): string {
  if (typeof kind === "string") return kind;
  const keys = Object.keys(kind);
  const top = keys[0] ?? "?";
  if (top === "FunctionCall") {
    const fc = (kind as { FunctionCall?: { actions?: Array<{ method_name: string }>; receiver_id?: string } }).FunctionCall;
    const method = fc?.actions?.[0]?.method_name;
    const receiver = fc?.receiver_id;
    return `FunctionCall · ${method ?? "?"} → ${receiver ? shortAccount(receiver) : "?"}`;
  }
  if (top === "Transfer") {
    const tr = (kind as { Transfer?: { receiver_id?: string; amount?: string } }).Transfer;
    return `Transfer → ${tr?.receiver_id ? shortAccount(tr.receiver_id) : "?"}`;
  }
  return top;
}

function voteCounts(p: Proposal): { approve: number; reject: number; remove: number } {
  const tally = { approve: 0, reject: 0, remove: 0 };
  for (const v of Object.values(p.votes || {})) {
    if (v === "Approve") tally.approve++;
    else if (v === "Reject") tally.reject++;
    else if (v === "Remove") tally.remove++;
  }
  return tally;
}

function submissionTime(ns: string): string {
  if (!/^\d+$/.test(ns)) return "";
  const ms = Number(BigInt(ns) / 1_000_000n);
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19) + "Z";
}

function statusTone(s: Proposal["status"]): string {
  switch (s) {
    case "InProgress":
      return "text-ink";
    case "Approved":
      return "text-ok";
    case "Rejected":
    case "Removed":
    case "Expired":
    case "Failed":
      return "text-bad";
    default:
      return "text-ink-muted";
  }
}

export const ProposalList = forwardRef<
  ProposalListHandle,
  { role: Role | null; sectionLabel?: string }
>(function ProposalList({ role, sectionLabel = "§4 proposals (last 20)" }, ref) {
  const [config] = useConfig();
  const { accountId, signAndSendTransaction } = useWallet();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("inProgress");
  const [voting, setVoting] = useState<{ id: number; action: ProposalAction } | null>(null);
  const [voteErrors, setVoteErrors] = useState<Record<number, string>>({});

  const daoId = config.daoId;
  const isCouncil = Boolean(role);

  const refresh = useCallback(() => {
    if (!daoId) {
      setProposals([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const last = await getLastProposalId(daoId);
        const from = Math.max(0, last - 20);
        const limit = last - from;
        const list = limit > 0 ? await getProposals(daoId, from, limit) : [];
        if (cancelled) return;
        setProposals(list.slice().reverse());
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [daoId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  async function vote(id: number, action: ProposalAction) {
    setVoting({ id, action });
    setVoteErrors((e) => {
      const { [id]: _, ...rest } = e;
      return rest;
    });
    try {
      await signAndSendTransaction({
        receiverId: daoId,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "act_proposal",
              args: { id, action },
              gas: DAO_ACT_PROPOSAL_GAS,
              deposit: "0",
            },
          },
        ],
      });
      refresh();
    } catch (e) {
      setVoteErrors((prev) => ({
        ...prev,
        [id]: e instanceof Error ? e.message : String(e),
      }));
    } finally {
      setVoting(null);
    }
  }

  const filtered = proposals.filter((p) => {
    if (filter === "inProgress") return p.status === "InProgress";
    if (filter === "mine") return accountId !== null && p.proposer === accountId;
    return true;
  });

  const tabClass = (f: Filter) =>
    [
      "font-mono text-[10px] uppercase tracking-widest px-2 py-1 border",
      filter === f
        ? "border-ink text-ink"
        : "border-paper-rule text-ink-muted hover:border-ink hover:text-ink",
    ].join(" ");

  return (
    <section className="border border-paper-rule bg-paper-card">
      <header className="flex items-baseline justify-between px-4 py-2.5 border-b border-paper-rule gap-3">
        <h2 className="font-mono text-xs uppercase tracking-widest">{sectionLabel}</h2>
        <div className="flex items-center gap-2">
          <button className={tabClass("inProgress")} onClick={() => setFilter("inProgress")}>
            in progress
          </button>
          <button className={tabClass("mine")} onClick={() => setFilter("mine")}>
            mine
          </button>
          <button className={tabClass("all")} onClick={() => setFilter("all")}>
            all
          </button>
          <button
            onClick={refresh}
            disabled={!daoId || loading}
            className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border border-paper-rule hover:border-ink disabled:opacity-40"
          >
            {loading ? "…" : "refresh"}
          </button>
        </div>
      </header>

      {!daoId ? (
        <div className="p-4 font-mono text-xs text-ink-muted">set DAO in §1 to view proposals.</div>
      ) : error ? (
        <div className="p-4 font-mono text-xs text-bad whitespace-pre-wrap break-all">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="p-4 font-mono text-xs text-ink-muted">no proposals match this filter.</div>
      ) : (
        <div className="divide-y divide-paper-rule">
          {filtered.map((p) => {
            const tally = voteCounts(p);
            const canVote = isCouncil && p.status === "InProgress";
            const voteErr = voteErrors[p.id];
            return (
              <div key={p.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="font-mono text-sm">
                    <span className="text-ink-muted">#{p.id}</span>{" "}
                    <span className={statusTone(p.status)}>[{p.status}]</span>{" "}
                    <span>{kindLabel(p.kind)}</span>
                  </div>
                  <div className="font-mono text-[10px] text-ink-muted">
                    by {shortAccount(p.proposer)} · {submissionTime(p.submission_time)}
                  </div>
                </div>
                {p.description && (
                  <div className="font-mono text-[11px] text-ink whitespace-pre-wrap break-words">
                    {p.description}
                  </div>
                )}
                <div className="font-mono text-[11px] text-ink-muted">
                  votes: approve {tally.approve} · reject {tally.reject} · remove {tally.remove}
                </div>
                {canVote && (
                  <div className="flex items-center gap-2">
                    {(["VoteApprove", "VoteReject", "VoteRemove"] as const).map((a) => (
                      <button
                        key={a}
                        disabled={voting !== null}
                        onClick={() => vote(p.id, a)}
                        className={[
                          "font-mono text-[10px] uppercase tracking-widest px-2 py-1 border disabled:opacity-40",
                          a === "VoteApprove"
                            ? "border-ok/60 text-ok hover:bg-ok hover:text-paper"
                            : a === "VoteReject"
                              ? "border-bad/60 text-bad hover:bg-bad hover:text-paper"
                              : "border-paper-rule text-ink-muted hover:border-ink hover:text-ink",
                        ].join(" ")}
                      >
                        {voting?.id === p.id && voting.action === a
                          ? "submitting…"
                          : a.replace("Vote", "").toLowerCase()}
                      </button>
                    ))}
                  </div>
                )}
                {voteErr && (
                  <div className="font-mono text-[10px] text-bad whitespace-pre-wrap break-all">
                    {voteErr}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
});
