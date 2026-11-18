import { createPublicClient, defineChain, erc20Abi, http } from "viem";
import { BAWSAQ_MIN_HOLD, BAWSAQ_TOKEN, BUILDER_FEE, ROBINHOOD_CHAIN_ID, ROBINHOOD_RPC } from "./config";

const robinhood = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [ROBINHOOD_RPC] } },
});

const client = createPublicClient({ chain: robinhood, transport: http() });

/** Total BAWSAQ held across the given wallets, in whole tokens. */
export async function bawsaqBalance(wallets: `0x${string}`[]): Promise<number> {
  if (wallets.length === 0) return 0;
  const decimals = await client.readContract({ address: BAWSAQ_TOKEN, abi: erc20Abi, functionName: "decimals" });
  const balances = await Promise.all(
    wallets.map((w) => client.readContract({ address: BAWSAQ_TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [w] })),
  );
  const total = balances.reduce((s, b) => s + b, 0n);
  return Number(total / 10n ** BigInt(decimals));
}

/** Builder fee for this user: 0 for holders of the minimum, otherwise the standard fee. */
export async function feeFor(wallets: `0x${string}`[]): Promise<{ fee: number; holder: boolean; balance: number }> {
  try {
    const balance = await bawsaqBalance(wallets);
    const holder = balance >= BAWSAQ_MIN_HOLD;
    return { fee: holder ? 0 : BUILDER_FEE, holder, balance };
  } catch {
    // If Robinhood Chain can't be reached, charge the standard fee rather than block trading.
    return { fee: BUILDER_FEE, holder: false, balance: 0 };
  }
}
