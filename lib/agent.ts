import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

/**
 * The agent key can place and cancel orders but can never withdraw. It is kept
 * on this device only (never sent to a SaqBot server) so phone users don't
 * have to re-approve every visit. Ending the session from settings deletes it.
 */
const key = (user: string) => `saqbot.agent.${user.toLowerCase()}`;

export function createAgentKey(): `0x${string}` {
  return generatePrivateKey();
}

export function saveAgentKey(user: string, pk: `0x${string}`): void {
  try {
    localStorage.setItem(key(user), pk);
  } catch {
    // Storage blocked. The agent still works until the page reloads.
  }
}

export function loadAgent(user: string): PrivateKeyAccount | null {
  try {
    const pk = localStorage.getItem(key(user));
    return pk && /^0x[0-9a-fA-F]{64}$/.test(pk) ? privateKeyToAccount(pk as `0x${string}`) : null;
  } catch {
    return null;
  }
}

export function clearAgent(user: string): void {
  try {
    localStorage.removeItem(key(user));
  } catch {
    // nothing stored
  }
}
