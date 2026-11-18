# SaqBot

The 5-Star Cheat Code, every single trade. A phone-first web app (installable PWA) for planning
Hyperliquid perps trades like a heist, plus a Telegram bot and alert worker.

## What's in here

| Part | Where | Runs on |
| --- | --- | --- |
| Web app (all screens, API routes) | `app/`, `components/`, `lib/` | Vercel |
| Alert worker + Telegram bot | `worker/index.ts` | Railway or Fly.io (always on) |
| Database schema | `db/schema.sql` | Postgres (Railway, Neon, Supabase) |

Screens: Welcome, Pick your rep, The Briefing, Stock your stash, Home (or the Lookout radar),
Plan the job (with full send), Active jobs, Practice run, Alerts and intel.

## How the money side works

- **Sign-in and wallets:** Privy creates a wallet for each user (Google or email). Existing wallets can connect too.
- **Funding:** Privy's on-ramp buys USDC on Arbitrum, or users send USDC from an exchange. "Move to my stash" sends it to Hyperliquid's bridge. Deposits under 5 USDC are lost by the bridge, so the app refuses anything under 6.
- **Trading:** "Start trading session" approves the SaqBot builder fee (skipped for BAWSAQ holders) and a trade-only agent key that is stored on the phone. It can trade but never withdraw. SaqBot's servers never hold keys or funds.
- **Fees:** non-holders pay `NEXT_PUBLIC_BUILDER_FEE_TENTHS_BP` (default 0.05%). Wallets holding 1M+ BAWSAQ on Robinhood Chain, including wallets linked in Privy, pay 0%.
- **Practice runs:** fake $1,000 on live prices, stored on the device. Works without signing in.

## Setup

1. **Install:** Node 20+, then `npm install`.
2. **Privy:** create an app at privy.io. Enable Google, email and wallet login, enable Ethereum embedded wallets, and turn on the card on-ramp under Funding. Add `saqbot.xyz` and `localhost:3000` as allowed origins. Copy the App ID and verification key.
3. **Database:** create a Postgres database and run `npm run db:setup`.
4. **Push keys:** `npm run vapid`, then copy both keys into your env.
5. **Telegram:** reuse the @Trade_SaqBot token from BotFather.
6. **Env:** `cp .env.example .env.local` and fill it in. Leave `NEXT_PUBLIC_HL_TESTNET=true`.
7. **Run:** `npm run dev` for the app and `npm run worker` in a second terminal.

Use Hyperliquid testnet USDC while testing. The builder wallet needs 100+ USDC in its perps account (on testnet too) before fees can be approved; leave `NEXT_PUBLIC_BUILDER_ADDRESS` blank to test without fees.

## Adding 5-star events

Events come from your own calendar. Add each one (Fed decisions, CPI, jobs reports, big earnings, token unlocks, ETF decisions):

```bash
curl -X POST https://saqbot.xyz/api/admin/events \
  -H "authorization: Bearer $ADMIN_TOKEN" -H "content-type: application/json" \
  -d '{"type":"cpi","title":"US inflation report (CPI)","startsAt":"2026-12-10T13:30:00Z"}'
```

Types: `fed`, `cpi`, `pce`, `jobs`, `earnings`, `etf`, `unlock`, `expiry`, `other`. Keep past events in the
table: every 6 hours the worker measures how far BTC moved in the hours around past events of each type
and turns that into the star rating (once a type has 3+ past events). Until then each type uses a fallback
rating from `lib/events.ts`. Later, a paid economic/earnings/unlock calendar feed can fill this table automatically.

## Deploy

- **Web app:** import the repo in Vercel, add the env vars, add `saqbot.xyz` under Domains.
- **Worker:** new Railway service from the same repo, start command `npm run worker`, same env vars.
- Only one process may poll Telegram. Stop the old starter bot before running the worker.

## Before mainnet

- [ ] Weeks of testnet trading: longs, shorts, presets, exact prices, full send, take-profits, move stop, cash out.
- [ ] Re-check Hyperliquid's deposit docs. Their legacy Arbitrum bridge is marked deprecated in favor of CCTP; switch `lib/deposit.ts` if it's retired.
- [ ] Confirm the BAWSAQ contract address on robinhoodchain.blockscout.com and use a provider RPC.
- [ ] Security review of the agent-key flow, API auth and the worker.
- [ ] Terms, risk disclosures and geoblocking reviewed by a lawyer (perps access is restricted in some countries, including the US).
- [ ] Set `NEXT_PUBLIC_HL_TESTNET=false`.
