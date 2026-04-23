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
