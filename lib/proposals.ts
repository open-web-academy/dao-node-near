import { nearToYocto, toBase64 } from "./format";

export const POOL_ACTION_GAS = "150000000000000"; // 150 Tgas

export interface FunctionCallAction {
  method_name: string;
  args: string; // base64
  deposit: string; // yoctoNEAR
  gas: string;
}

export interface FunctionCallProposal {
  description: string;
  kind: {
    FunctionCall: {
      receiver_id: string;
      actions: FunctionCallAction[];
    };
  };
}

export interface TransferProposal {
  description: string;
  kind: {
    Transfer: {
      token_id: string;
      receiver_id: string;
      amount: string;
    };
  };
}

export type ProposalInput = FunctionCallProposal | TransferProposal;

export function buildUnstakeProposal(params: {
  pool: string;
  amountNear: string | null;
  useAll: boolean;
}): FunctionCallProposal {
  const { pool, amountNear, useAll } = params;
  if (useAll) {
    return {
      description: `Unstake all from ${pool}`,
      kind: {
        FunctionCall: {
          receiver_id: pool,
          actions: [
            {
              method_name: "unstake_all",
              args: "",
              deposit: "0",
              gas: POOL_ACTION_GAS,
            },
          ],
        },
      },
    };
  }
  if (!amountNear) throw new Error("amount is required when not using unstake_all");
  const yocto = nearToYocto(amountNear);
  return {
    description: `Unstake ${amountNear} NEAR from ${pool}`,
    kind: {
      FunctionCall: {
        receiver_id: pool,
        actions: [
          {
            method_name: "unstake",
            args: toBase64(JSON.stringify({ amount: yocto })),
            deposit: "0",
            gas: POOL_ACTION_GAS,
          },
        ],
      },
    },
  };
}

export function buildWithdrawProposal(params: {
  pool: string;
  amountNear: string | null;
  useAll: boolean;
}): FunctionCallProposal {
  const { pool, amountNear, useAll } = params;
  if (useAll) {
    return {
      description: `Withdraw all from ${pool}`,
      kind: {
        FunctionCall: {
          receiver_id: pool,
          actions: [
            {
              method_name: "withdraw_all",
              args: "",
              deposit: "0",
              gas: POOL_ACTION_GAS,
            },
          ],
        },
      },
    };
  }
  if (!amountNear) throw new Error("amount is required when not using withdraw_all");
  const yocto = nearToYocto(amountNear);
  return {
    description: `Withdraw ${amountNear} NEAR from ${pool}`,
    kind: {
      FunctionCall: {
        receiver_id: pool,
        actions: [
          {
            method_name: "withdraw",
            args: toBase64(JSON.stringify({ amount: yocto })),
            deposit: "0",
            gas: POOL_ACTION_GAS,
          },
        ],
      },
    },
  };
}

export function buildTransferProposal(params: {
  receiverId: string;
  amountNear: string;
}): TransferProposal {
  const { receiverId, amountNear } = params;
  const yocto = nearToYocto(amountNear);
  return {
    description: `Transfer ${amountNear} NEAR to ${receiverId}`,
    kind: {
      Transfer: {
        token_id: "",
        receiver_id: receiverId,
        amount: yocto,
      },
    },
  };
}

function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a;
}

/**
 * Convert a percentage string ("5", "2.5", "0.25") into the reduced
 * `RewardFeeFraction { numerator, denominator }` the pool expects (both u32).
 */
export function percentToFraction(percent: string): { numerator: number; denominator: number } {
  const s = percent.trim().replace(/\s*%$/, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`invalid fee: ${percent}`);
  const [whole, frac = ""] = s.split(".");
  if (frac.length > 4) throw new Error("too many decimals (max 4)");
  let num = BigInt(`${whole}${frac}`);
  let den = 100n * 10n ** BigInt(frac.length);
  if (num > den) throw new Error("fee cannot exceed 100%");
  const g = num === 0n ? den : gcd(num, den);
  num /= g;
  den /= g;
  return { numerator: Number(num), denominator: Number(den) };
}

function fmtPercent(f: { numerator: number; denominator: number }): string {
  return String(Number(((f.numerator / f.denominator) * 100).toFixed(4)));
}

export function buildFeeProposal(params: {
  pool: string;
  feePercent: string;
}): FunctionCallProposal {
  const { pool, feePercent } = params;
  const reward_fee_fraction = percentToFraction(feePercent);
  return {
    description: `Change reward fee of ${pool} to ${fmtPercent(reward_fee_fraction)}%`,
    kind: {
      FunctionCall: {
        receiver_id: pool,
        actions: [
          {
            method_name: "update_reward_fee_fraction",
            args: toBase64(JSON.stringify({ reward_fee_fraction })),
            deposit: "0",
            gas: POOL_ACTION_GAS,
          },
        ],
      },
    },
  };
}
