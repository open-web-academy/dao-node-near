# DAO Staking Console

A single-page dashboard for managing a NEAR Sputnik DAO's delegated staking
pool rewards. The DAO delegates to a classic `*.poolv1.near` pool; rewards
auto-compound into the staked balance. "Withdrawing rewards" is a four-step
lifecycle, and every step is a DAO proposal the council must vote on:

1. **Unstake** a chosen amount from the pool (FunctionCall proposal).
2. Wait ~4 epochs (~52–65 h).
3. **Withdraw** that amount from the pool back to the DAO (FunctionCall proposal).
4. **Transfer** from the DAO to a final address (Transfer proposal).

This app lets a council member:

- View the DAO's pool position (staked / unstaking / ready / native).
- Build the three proposal payloads with a live JSON preview.
- Create proposals directly from a connected wallet.
- Vote (Approve / Reject / Remove) on in-flight proposals.

Everything is direct-from-RPC — no backend, no indexer, no database.

## Stack

- Next.js 14 (App Router) + TypeScript (strict) + Tailwind.
- `near-api-js` for view calls.
- `@near-wallet-selector` with MyNearWallet + Meteor.

## Run locally

```
pnpm install
pnpm dev
```

Open http://localhost:3000. No environment variables are required.

## Configure

Configuration lives entirely in the browser (`localStorage`, key
`dao-console:v1`). Fill in §1 of the page:

- **DAO account** — your Sputnik DAO, e.g. `example.sputnik-dao.near`.
- **Staking pool** — the `*.poolv1.near` pool the DAO has delegated to.
- **Destination** — account to receive the final transfer.
- **Amount (NEAR)** — used for unstake / withdraw (unless `*_all` is toggled)
  and for the transfer.

Connect a wallet in the top-right. The page checks `get_policy` and flags you
as a council member if your account appears in a role `Group` with proposal
permissions. Non-council visitors see everything read-only.

## Deploy to Vercel

```
vercel --prod
```

No env vars. Build command is the default `next build`.

## Non-goals

- Liquid staking / Meta Pool.
- NEP-141 tokens in Transfer (native NEAR only).
- Multi-DAO switcher (one active DAO at a time).
- Gas relayer, server-side calls, indexer.

## Notes

- Amount math uses `bigint` end-to-end; `Number` is never used for yoctoNEAR.
- `unstake_all` / `withdraw_all` send `args: ""` (empty string), not `"{}"`.
- The Transfer step is blocked in the UI if it would leave the DAO below a
  ~0.5 NEAR storage buffer.
- The Withdraw step shows a warning (but is not blocked) when the pool
  reports `is_account_unstaked_balance_available: false`.
- `get_proposals` returns oldest-first; this app reverses for display.
- Role `kind` can be the string `"Everyone"` or an object `{ Group: [...] }`
  / `{ Member: "..." }` — all three are handled.
