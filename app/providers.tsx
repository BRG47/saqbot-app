"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { arbitrum, arbitrumSepolia } from "viem/chains";
import { IS_TESTNET, PRIVY_APP_ID } from "../lib/config";
import { SaqbotProvider } from "../lib/client/saqbot";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  if (!PRIVY_APP_ID) {
    return <p style={{ padding: 24 }}>Set NEXT_PUBLIC_PRIVY_APP_ID in your environment to run SaqBot.</p>;
  }

  const chain = IS_TESTNET ? arbitrumSepolia : arbitrum;
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["google", "email", "wallet"],
        appearance: { theme: "dark", accentColor: "#39ff14", logo: "/logo.png" },
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        fundingMethodConfig: { moonpay: { useSandbox: IS_TESTNET } },
        defaultChain: chain,
        supportedChains: [chain],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <SaqbotProvider>{children}</SaqbotProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
