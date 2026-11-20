"use client";

import { ExchangeClient } from "@nktkas/hyperliquid";
import { useFundWallet } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { createPublicClient, erc20Abi, formatUnits, http } from "viem";
import { Band, useRequireSignIn, usd } from "../../components/ui";
import { useSaqbot } from "../../lib/client/saqbot";
import { ARB_USDC, BAWSAQ_MIN_HOLD, BUILDER_FEE_LABEL, IS_TESTNET, MIN_DEPOSIT_USDC } from "../../lib/config";
import { depositChain, depositToHyperliquid } from "../../lib/deposit";
import { transport } from "../../lib/hyperliquid";
import { RESTRICTED_MESSAGE } from "../../lib/client/geo";

const arb = createPublicClient({ chain: depositChain, transport: http() });

export default function Fund() {
  const signedIn = useRequireSignIn();
  const { address, account, refetchAccount, getWalletClient, agent, startSession, fee, linkWallet, geoRestricted, prefs, updatePrefs } = useSaqbot();
  const { fundWallet } = useFundWallet();
  const [amount, setAmount] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const walletUsdc = useQuery({
    queryKey: ["walletUsdc", address],
    enabled: Boolean(address),
    refetchInterval: 15_000,
    queryFn: async () =>
      Number(formatUnits(await arb.readContract({ address: ARB_USDC, abi: erc20Abi, functionName: "balanceOf", args: [address!] }), 6)),
  });

  async function run(label: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(label);
    setMsg(null);
    try {
      await fn();
      setMsg({ kind: "ok", text: ok });
      refetchAccount();
      walletUsdc.refetch();
    } catch (e) {
      const text = e instanceof Error ? e.message.split("\n")[0] : String(e);
      setMsg({ kind: "error", text: /rejected|denied/i.test(text) ? "You cancelled the request. Nothing was sent." : text });
    } finally {
      setBusy(null);
    }
  }

  if (!signedIn || !address) return null;
  const stash = account?.accountValue ?? 0;
  const inWallet = walletUsdc.data ?? 0;
  const moveAmt = Number(amount || Math.floor(inWallet * 100) / 100);

  return (
    <>
      <Band title="Stock your stash" back="/home" />
      <main className="screen">
        <div className="panel">
          <div className="row">
            <span className="stack" style={{ gap: 0 }}>
              <span className="small">Trading stash on Hyperliquid</span>
              <span className="display num" style={{ fontSize: 44 }}>{usd(stash)}</span>
            </span>
          </div>
          <p className="tiny">USDC waiting in your wallet: {usd(inWallet)}</p>
        </div>

        {geoRestricted && <p className="notice notice-warn">{RESTRICTED_MESSAGE}</p>}

        {!geoRestricted && (
        <>
        <section className="stack">
          <h2 className="display h2">1. Get USDC</h2>
          <button
            className="btn"
            disabled={busy !== null || IS_TESTNET}
            onClick={() =>
              run(
                "card",
                async () => {
                  const res = await fundWallet({
                    address,
                    options: { chain: depositChain, asset: "USDC", amount: "50", defaultFundingMethod: "card", card: { preferredProvider: "coinbase" } },
                  });
                  if (res.status === "cancelled") throw new Error("You cancelled the request. Nothing was sent.");
                },
                "Payment done. Your USDC shows up here in a few minutes.",
              )
            }
          >
            {busy === "card" ? "Opening checkout…" : "Buy USDC with Apple Pay or card"}
          </button>
          <p className="tiny" style={{ marginTop: -4 }}>
            {IS_TESTNET
              ? "Card and Apple Pay purchases switch on with real-money trading. On testnet, use test USDC from Hyperliquid's faucet."
              : "Apple Pay shows up in Safari on iPhone and Mac. Card checkout is run by Coinbase or MoonPay; they may ask for ID the first time."}
          </p>
          <div className="panel" style={{ gap: 8 }}>
            <strong>Or send from an exchange</strong>
            <p className="small">Withdraw <b>USDC</b> on the <b>Arbitrum One</b> network to this address. Other tokens or networks can be lost.</p>
            <code style={{ wordBreak: "break-all", fontSize: 14 }}>{address}</code>
            <button
              className="btn btn-quiet btn-sm"
              onClick={() => navigator.clipboard.writeText(address).then(() => setCopied(true))}
            >
              {copied ? "Copied" : "Copy address"}
            </button>
          </div>
        </section>

        <section className="stack">
          <h2 className="display h2">2. Move it into your stash</h2>
          <label className="field">
            Amount in USDC (at least ${MIN_DEPOSIT_USDC})
            <input inputMode="decimal" value={amount} placeholder={inWallet ? inWallet.toFixed(2) : "0.00"} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <p className="tiny">
            This sends USDC to Hyperliquid's bridge on Arbitrum. It needs a little ETH on Arbitrum for gas. Hyperliquid loses deposits under $5, so SaqBot won't send less than ${MIN_DEPOSIT_USDC}.
          </p>
          <button
            className="btn"
            disabled={busy !== null || moveAmt < MIN_DEPOSIT_USDC || moveAmt > inWallet}
            onClick={() => run("deposit", async () => depositToHyperliquid(await getWalletClient(), moveAmt), "Sent. It usually lands in your stash within a minute.")}
          >
            {busy === "deposit" ? "Sending…" : `Move ${usd(moveAmt || 0)} to my stash`}
          </button>
        </section>

        <section className="stack">
          <h2 className="display h2">3. Start a trading session</h2>
          <p className="small">
            {fee?.holder
              ? "You hold enough BAWSAQ to trade with 0% SaqBot fees."
              : `SaqBot charges ${BUILDER_FEE_LABEL} of each trade's value. Hold ${BAWSAQ_MIN_HOLD.toLocaleString("en-US")} BAWSAQ for 0%.`}{" "}
            The session creates a trade-only key on this phone. It can place and close trades but can never withdraw.
          </p>
          {!fee?.holder && (
            <button className="btn btn-quiet btn-sm" onClick={linkWallet}>Link the wallet that holds my BAWSAQ</button>
          )}
          {!agent && (
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15 }}>
              <input
                type="checkbox"
                checked={Boolean(prefs.eligibleConfirmedAt)}
                onChange={(e) => updatePrefs({ eligibleConfirmedAt: e.target.checked ? new Date().toISOString() : null })}
                style={{ width: 22, height: 22, marginTop: 1, accentColor: "var(--ink)" }}
              />
              <span>
                I'm not a resident or citizen of the United States or another region where Hyperliquid isn't available, and I'm not
                using a VPN or proxy to hide my location.
              </span>
            </label>
          )}
          {agent ? (
            <p className="notice notice-ok">Trading session active on this device.</p>
          ) : (
            <button
              className="btn"
              disabled={busy !== null || stash <= 0 || !prefs.eligibleConfirmedAt}
              onClick={() => run("session", startSession, "You're set. Time to plan a job.")}
            >
              {stash <= 0 ? "Fund your stash first" : busy === "session" ? "Check the approval…" : "Start trading session"}
            </button>
          )}
        </section>
        </>
        )}

        {msg && <p className={`notice notice-${msg.kind}`} role="status">{msg.text}</p>}

        <details className="panel">
          <summary style={{ fontWeight: 600, cursor: "pointer" }}>Withdraw to my wallet</summary>
          <p className="small">Funds arrive in your Arbitrum wallet in a few minutes. Hyperliquid charges a $1 withdrawal fee.</p>
          <label className="field">
            Amount in USDC (up to {usd(account?.withdrawable ?? 0)})
            <input inputMode="decimal" value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} />
          </label>
          <button
            className="btn btn-quiet"
            disabled={busy !== null || !(Number(withdrawAmt) > 1) || Number(withdrawAmt) > (account?.withdrawable ?? 0)}
            onClick={() =>
              run(
                "withdraw",
                async () => new ExchangeClient({ transport, wallet: await getWalletClient() }).withdraw3({ destination: address, amount: withdrawAmt }),
                "Withdrawal sent. It reaches your wallet in a few minutes.",
              )
            }
          >
            {busy === "withdraw" ? "Withdrawing…" : "Withdraw"}
          </button>
        </details>

        {IS_TESTNET && <p className="notice notice-warn">Testnet mode: use test USDC from Hyperliquid's testnet, not real money.</p>}
        <Link className="btn btn-quiet" href="/home">Go to home</Link>
      </main>
    </>
  );
}
