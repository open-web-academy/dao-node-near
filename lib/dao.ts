import { viewCall } from "./near";

export type RoleKind =
  | "Everyone"
  | { Group: string[] }
  | { Member: string };

export interface Role {
  name: string;
  kind: RoleKind;
  permissions: string[];
  vote_policy: Record<string, unknown>;
}

export interface Policy {
  roles: Role[];
  default_vote_policy: unknown;
  proposal_bond: string;
  proposal_period: string;
  bounty_bond: string;
  bounty_forgiveness_period: string;
}

export type ProposalStatus =
  | "InProgress"
  | "Approved"
  | "Rejected"
  | "Removed"
  | "Expired"
  | "Moved"
  | "Failed";

export type ProposalAction =
  | "VoteApprove"
  | "VoteReject"
  | "VoteRemove"
  | "Finalize";

export interface Proposal {
  id: number;
  proposer: string;
  description: string;
  kind: Record<string, unknown> | string;
  status: ProposalStatus;
  vote_counts: Record<string, [number, number, number]>;
  votes: Record<string, "Approve" | "Reject" | "Remove">;
  submission_time: string;
}

export async function getPolicy(dao: string): Promise<Policy> {
  return viewCall<Policy>(dao, "get_policy", {});
}

export async function getLastProposalId(dao: string): Promise<number> {
  return viewCall<number>(dao, "get_last_proposal_id", {});
}

export async function getProposals(
  dao: string,
  from_index: number,
  limit: number,
): Promise<Proposal[]> {
  return viewCall<Proposal[]>(dao, "get_proposals", { from_index, limit });
}

export async function getProposal(dao: string, id: number): Promise<Proposal> {
  return viewCall<Proposal>(dao, "get_proposal", { id });
}

/**
 * Determine whether an account is a council (or equivalent) member of the DAO.
 * Returns the role if so, else null.
 *
 * Sputnik DAO permissions are "<kind>:<action>" where kind is a snake_case
 * proposal kind (call, transfer, config, policy, add_bounty, ...) or "*",
 * and action is AddProposal, VoteApprove, VoteReject, VoteRemove, Finalize,
 * RemoveProposal, or "*". We treat a role as council-like if the account is
 * in its Group and it has any AddProposal/Vote* permission on any kind.
 */
export function findCouncilRole(policy: Policy, accountId: string): Role | null {
  if (!accountId) return null;
  const ACTIONS = new Set(["AddProposal", "VoteApprove", "VoteReject", "VoteRemove"]);
  for (const role of policy.roles) {
    if (role.kind === "Everyone") continue;
    const kind = role.kind as { Group?: string[]; Member?: string };
    const isMember =
      (Array.isArray(kind.Group) && kind.Group.includes(accountId)) ||
      (typeof kind.Member === "string" && kind.Member === accountId);
    if (!isMember) continue;
    const perms = role.permissions ?? [];
    const canDoSomething = perms.some((p) => {
      if (p === "*:*") return true;
      const idx = p.indexOf(":");
      if (idx < 0) return false;
      const action = p.slice(idx + 1);
      return action === "*" || ACTIONS.has(action);
    });
    if (canDoSomething) return role;
  }
  return null;
}

// The DAO change-method JSON shapes. These are consumed by the wallet
// selector's signAndSendTransaction call.
export const DAO_ADD_PROPOSAL_GAS = "200000000000000"; // 200 Tgas
export const DAO_ACT_PROPOSAL_GAS = "150000000000000"; // 150 Tgas
export const DEFAULT_PROPOSAL_BOND = "100000000000000000000000"; // 0.1 NEAR
