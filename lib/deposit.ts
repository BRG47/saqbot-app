import { erc20Abi, parseUnits, type WalletClient } from "viem";
import { arbitrum, arbitrumSepolia } from "viem/chains";
import { ARB_USDC, HL_BRIDGE, IS_TESTNET, MIN_DEPOSIT_USDC } from "./config";

export const depositChain = IS_TESTNET ? arbitrumSepolia : arbitrum;

/**
 * Moves USDC from the user's Arbitrum wallet into their Hyperliquid account by
 * sending it to Hyperliquid's bridge. Deposits under 5 USDC are lost, so we
 * refuse anything under MIN_DEPOSIT_USDC. Needs a little ETH on Arbitrum for gas.
 *
 * Hyperliquid marks this bridge as legacy in favor of CCTP. Re-check their
 * docs before mainnet launch and switch if the bridge is retired.
 */
export async function depositToHyperliquid(wallet: WalletClient, amountUsdc: number) {
  if (!(amountUsdc >= MIN_DEPOSIT_USDC)) throw new Error(`Move at least $${MIN_DEPOSIT_USDC}. Smaller deposits are lost by the bridge.`);
  const account = wallet.account;
  if (!account) throw new Error("No wallet connected.");
  return wallet.writeContract({
    account,
    chain: depositChain,
    address: ARB_USDC,
    abi: erc20Abi,
    functionName: "transfer",
    args: [HL_BRIDGE, parseUnits(amountUsdc.toFixed(6), 6)],
  });
}
