"use client";

import { ExchangeClient } from "@nktkas/hyperliquid";
import { usePrivy, useWallets, type ConnectedWallet } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createWalletClient, custom, type Account, type Chain, type Transport, type WalletClient } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { clearAgent, createAgentKey, loadAgent, saveAgentKey } from "../agent";
import { BUILDER_ADDRESS, BUILDER_FEE_PERCENT } from "../config";
import { depositChain } from "../deposit";
import { feeFor } from "../holder";
import { getAccountState, getMarkets, info, transport, type AccountState, type Market } from "../hyperliquid";
import { DEFAULT_PREFS, loadPrefs, savePrefs, type Prefs } from "../prefs";

type Saqbot = {
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => Promise<void>;
  linkWallet: () => void;
  address: `0x${string}` | null;
  wallet: ConnectedWallet | null;
  getWalletClient: () => Promise<WalletClient<Transport, Chain, Account>>;
  agent: PrivateKeyAccount | null;
  startSession: () => Promise<void>;
  endSession: () => void;
  prefs: Prefs;
  updatePrefs: (p: Partial<Prefs>) => void;
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  markets: Market[];
  marketsError: boolean;
  account: AccountState | null;
  refetchAccount: () => void;
  fee: { fee: number; holder: boolean; balance: number } | null;
};

const Ctx = createContext<Saqbot | null>(null);

export function useSaqbot(): Saqbot {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSaqbot must be used inside SaqbotProvider");
  return v;
}

export function SaqbotProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout, user, getAccessToken, linkWallet } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0] ?? null;
  const address = (wallet?.address?.toLowerCase() as `0x${string}` | undefined) ?? null;

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [agent, setAgent] = useState<PrivateKeyAccount | null>(null);

  useEffect(() => setPrefs(loadPrefs()), []);
  useEffect(() => setAgent(address ? loadAgent(address) : null), [address]);

  const api = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const token = await getAccessToken();
      const res = await fetch(path, {
        ...init,
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...init?.headers },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error ?? "Request failed.");
      return body as T;
    },
    [getAccessToken],
  );

  const updatePrefs = useCallback(
    (patch: Partial<Prefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch, alerts: { ...prev.alerts, ...(patch.alerts ?? {}) } };
        savePrefs(next);
        if (authenticated) {
          api("/api/me", { method: "PUT", body: JSON.stringify({ rep: next.rep, alerts: next.alerts, wallet: address ?? undefined }) }).catch(() => {});
        }
        return next;
      });
    },
    [api, authenticated, address],
  );

  const getWalletClient = useCallback(async () => {
    if (!wallet || !address) throw new Error("Sign in first.");
    await wallet.switchChain(depositChain.id);
    const provider = await wallet.getEthereumProvider();
    return createWalletClient({ account: address, chain: depositChain, transport: custom(provider) });
  }, [wallet, address]);

  const marketsQ = useQuery({ queryKey: ["markets"], queryFn: getMarkets, refetchInterval: 15_000 });
  const accountQ = useQuery({
    queryKey: ["account", address],
    enabled: Boolean(address),
    queryFn: () => getAccountState(address!),
    refetchInterval: 15_000,
  });

  const holderWallets = useMemo(() => {
    const linked = (user?.linkedAccounts ?? [])
      .filter((a): a is typeof a & { address: string } => a.type === "wallet" && "address" in a)
      .map((a) => a.address.toLowerCase() as `0x${string}`);
    return Array.from(new Set([...(address ? [address] : []), ...linked]));
  }, [user, address]);

  const feeQ = useQuery({
    queryKey: ["fee", holderWallets.join(",")],
    enabled: holderWallets.length > 0,
    queryFn: () => feeFor(holderWallets),
    staleTime: 5 * 60_000,
  });

  /** One-time setup before live trading: approve the SaqBot fee (non-holders) and create the trade-only key. */
  const startSession = useCallback(async () => {
    if (!address) throw new Error("Sign in first.");
    const exchange = new ExchangeClient({ transport, wallet: await getWalletClient() });
    const needsFee = BUILDER_ADDRESS && (feeQ.data?.fee ?? 1) > 0;
    if (needsFee) {
      const approved = await info.maxBuilderFee({ user: address, builder: BUILDER_ADDRESS! });
      if (approved < (feeQ.data?.fee ?? 0)) {
        await exchange.approveBuilderFee({ builder: BUILDER_ADDRESS!, maxFeeRate: BUILDER_FEE_PERCENT });
      }
    }
    const pk = createAgentKey();
    const next = privateKeyToAccount(pk);
    await exchange.approveAgent({ agentAddress: next.address, agentName: "saqbot" });
    saveAgentKey(address, pk);
    setAgent(next);
  }, [address, getWalletClient, feeQ.data]);

  const endSession = useCallback(() => {
    if (address) clearAgent(address);
    setAgent(null);
  }, [address]);

  const value: Saqbot = {
    ready,
    authenticated,
    login: () => login(),
    logout: async () => {
      endSession();
      await logout();
    },
    linkWallet: () => linkWallet(),
    address,
    wallet,
    getWalletClient,
    agent,
    startSession,
    endSession,
    prefs,
    updatePrefs,
    api,
    markets: marketsQ.data ?? [],
    marketsError: marketsQ.isError,
    account: accountQ.data ?? null,
    refetchAccount: () => void accountQ.refetch(),
    fee: feeQ.data ?? null,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
