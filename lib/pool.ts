import { viewCall } from "./near";

export interface PoolAccount {
  account_id: string;
  unstaked_balance: string;
  staked_balance: string;
  can_withdraw: boolean;
}

export async function getAccountStakedBalance(pool: string, accountId: string): Promise<string> {
  return viewCall<string>(pool, "get_account_staked_balance", { account_id: accountId });
}

export async function getAccountUnstakedBalance(pool: string, accountId: string): Promise<string> {
  return viewCall<string>(pool, "get_account_unstaked_balance", { account_id: accountId });
}

export async function getAccountTotalBalance(pool: string, accountId: string): Promise<string> {
  return viewCall<string>(pool, "get_account_total_balance", { account_id: accountId });
}

export async function isAccountUnstakedBalanceAvailable(
  pool: string,
  accountId: string,
): Promise<boolean> {
  return viewCall<boolean>(pool, "is_account_unstaked_balance_available", {
    account_id: accountId,
  });
}

export async function getPoolAccount(pool: string, accountId: string): Promise<PoolAccount> {
  return viewCall<PoolAccount>(pool, "get_account", { account_id: accountId });
}

export interface RewardFeeFraction {
  numerator: number;
  denominator: number;
}

export async function getRewardFeeFraction(pool: string): Promise<RewardFeeFraction> {
  return viewCall<RewardFeeFraction>(pool, "get_reward_fee_fraction", {});
}

export async function getOwnerId(pool: string): Promise<string> {
  return viewCall<string>(pool, "get_owner_id", {});
}
