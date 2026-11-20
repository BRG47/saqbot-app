/**
 * Regions where live trading is switched off. Hyperliquid's terms restrict the
 * United States, Ontario and sanctioned regions; have your lawyer confirm this list.
 * Codes are ISO 3166 countries ("US") or country-region pairs ("CA-ON").
 * Override with RESTRICTED_REGIONS (comma-separated) in your environment.
 */
export const DEFAULT_RESTRICTED = [
  "US", // United States
  "CA-ON", // Ontario, Canada
  "CU", // Cuba
  "IR", // Iran
  "KP", // North Korea
  "SY", // Syria
  "RU", // Russia
  "UA-43", // Crimea
  "UA-14", // Donetsk
  "UA-09", // Luhansk
];

export const GEO_COOKIE = "saqbot_geo";

export function restrictedList(envValue?: string): string[] {
  const list = envValue?.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  return list && list.length > 0 ? list : DEFAULT_RESTRICTED;
}

export function isRestricted(country: string | null, region: string | null, list: string[]): boolean {
  if (!country) return false;
  const c = country.toUpperCase();
  const r = region ? `${c}-${region.toUpperCase()}` : null;
  return list.includes(c) || (r !== null && list.includes(r));
}
