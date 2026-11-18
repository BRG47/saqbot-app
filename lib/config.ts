/** Public configuration. Everything here ships to the browser, so no secrets. */
/**
 * Next.js only inlines NEXT_PUBLIC_* vars into browser code when referenced literally
 * (process.env.NEXT_PUBLIC_X), so each one is listed here instead of read by key.
 */
const PUBLIC_ENV: Record<string, string | undefined> = {
  NEXT_PUBLIC_HL_TESTNET: process.env.NEXT_PUBLIC_HL_TESTNET,
  NEXT_PUBLIC_BUILDER_ADDRESS: process.env.NEXT_PUBLIC_BUILDER_ADDRESS,
  NEXT_PUBLIC_BUILDER_FEE_TENTHS_BP: process.env.NEXT_PUBLIC_BUILDER_FEE_TENTHS_BP,
  NEXT_PUBLIC_BAWSAQ_TOKEN: process.env.NEXT_PUBLIC_BAWSAQ_TOKEN,
  NEXT_PUBLIC_BAWSAQ_MIN_HOLD: process.env.NEXT_PUBLIC_BAWSAQ_MIN_HOLD,
  NEXT_PUBLIC_ROBINHOOD_RPC: process.env.NEXT_PUBLIC_ROBINHOOD_RPC,
  NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
};
const env = (k: keyof typeof PUBLIC_ENV, d = "") => (PUBLIC_ENV[k] || d).trim();
const isAddr = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a);

export const IS_TESTNET = env("NEXT_PUBLIC_HL_TESTNET", "true") !== "false";

export const BUILDER_ADDRESS = isAddr(env("NEXT_PUBLIC_BUILDER_ADDRESS"))
  ? (env("NEXT_PUBLIC_BUILDER_ADDRESS").toLowerCase() as `0x${string}`)
  : null;

/** Standard builder fee in tenths of a basis point. 50 = 0.05%. Hyperliquid caps perps at 100. */
export const BUILDER_FEE = Math.min(100, Math.max(0, Number(env("NEXT_PUBLIC_BUILDER_FEE_TENTHS_BP", "50"))));
export const BUILDER_FEE_PERCENT = `${(BUILDER_FEE / 1000).toFixed(3)}%`;

/** BAWSAQ holder discount: holders of at least this many tokens pay no SaqBot fee. */
export const BAWSAQ_TOKEN = env("NEXT_PUBLIC_BAWSAQ_TOKEN", "0x756A626544D90585fF9E5E6edEF5406a69b45C9c") as `0x${string}`;
export const BAWSAQ_MIN_HOLD = Number(env("NEXT_PUBLIC_BAWSAQ_MIN_HOLD", "1000000"));
export const ROBINHOOD_RPC = env("NEXT_PUBLIC_ROBINHOOD_RPC", "https://rpc.mainnet.chain.robinhood.com");
export const ROBINHOOD_CHAIN_ID = 4663;

export const PRIVY_APP_ID = env("NEXT_PUBLIC_PRIVY_APP_ID");
export const TELEGRAM_BOT_USERNAME = env("NEXT_PUBLIC_TELEGRAM_BOT_USERNAME", "TradeSaqBot");
export const VAPID_PUBLIC_KEY = env("NEXT_PUBLIC_VAPID_PUBLIC_KEY");

/** Hyperliquid rejects orders below this notional value. */
export const MIN_ORDER_USD = 10;
/** Hyperliquid's legacy bridge loses deposits under 5 USDC. We require a little more. */
export const MIN_DEPOSIT_USDC = 6;
export const ENTRY_SLIPPAGE = 0.01;
export const TRIGGER_SLIPPAGE = 0.1;

/** Native USDC and Hyperliquid's bridge on Arbitrum (mainnet) and Arbitrum Sepolia (testnet). */
export const ARB_USDC = (IS_TESTNET
  ? "0x1baAbB04529D43a73232B713C0FE471f7c7334d5"
  : "0xaf88d065e77c8cC2239327C5EDb3A432268e5831") as `0x${string}`;
export const HL_BRIDGE = (IS_TESTNET
  ? "0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89"
  : "0x2df1c51e09aecf9cacb7bc98cb1742757f163df7") as `0x${string}`;

/** Starting balance for practice runs. */
export const PRACTICE_START_USD = 1000;
/** Approximate base taker fee used to simulate practice costs. */
export const PRACTICE_FEE_RATE = 0.00045;
