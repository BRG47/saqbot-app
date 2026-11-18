/**
 * Content Security Policy, based on Privy's recommended policy
 * (docs.privy.io/security/implementation-guide/content-security-policy) plus the hosts SaqBot itself calls.
 * Re-check this list after every Privy SDK upgrade.
 */
import { ROBINHOOD_RPC } from "./config";

const origin = (url: string | undefined) => {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
};

/** Privy's iframes: login/embedded wallet, plus WalletConnect's verify iframe. */
const PRIVY_FRAMES = ["https://auth.privy.io", "https://verify.walletconnect.com", "https://verify.walletconnect.org"];

export function buildCsp(nonce: string, opts: { dev: boolean; reportUri: string }): string {
  // Optional: Privy custom auth domain (e.g. https://privy.saqbot.xyz) once HttpOnly cookies are set up.
  const privyDomain = origin(process.env.PRIVY_AUTH_DOMAIN);
  const frames = [...PRIVY_FRAMES, ...(privyDomain ? [privyDomain] : [])];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // strict-dynamic lets Next.js and Privy load their own chunks from nonce'd scripts.
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", "https://challenges.cloudflare.com", ...(opts.dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://explorer-api.walletconnect.com"],
    "font-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "child-src": frames,
    "frame-src": [
      ...frames,
      "https://challenges.cloudflare.com",
      // Card / Apple Pay checkout (Privy funding)
      "https://buy.moonpay.com",
      "https://buy-sandbox.moonpay.com",
      "https://pay.coinbase.com",
    ],
    "connect-src": [
      "'self'",
      // Privy
      "https://auth.privy.io",
      ...(privyDomain ? [privyDomain] : []),
      "https://*.rpc.privy.systems",
      "wss://relay.walletconnect.com",
      "wss://relay.walletconnect.org",
      "wss://www.walletlink.org",
      "https://explorer-api.walletconnect.com",
      // Privy funding
      "https://api.relay.link",
      "https://api.testnets.relay.link",
      "https://api.moonpay.com",
      // Hyperliquid (prices, charts, account, orders)
      "https://api.hyperliquid.xyz",
      "https://api.hyperliquid-testnet.xyz",
      // Arbitrum RPC (USDC balance, deposits) and Robinhood Chain RPC (BAWSAQ balance)
      "https://arb1.arbitrum.io",
      "https://sepolia-rollup.arbitrum.io",
      ...[origin(ROBINHOOD_RPC)].filter((o): o is string => Boolean(o)),
      ...(opts.dev ? ["ws:"] : []),
    ],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "report-uri": [opts.reportUri],
    "report-to": ["csp"],
  };

  const parts = Object.entries(directives).map(([k, v]) => `${k} ${Array.from(new Set(v)).join(" ")}`);
  if (!opts.dev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

/** "enforce" blocks violations; anything else only reports them (Privy's recommended first step). */
export const cspHeaderName = () =>
  process.env.CSP_MODE === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
