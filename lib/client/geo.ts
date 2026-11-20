"use client";

import { useEffect, useState } from "react";
import { GEO_COOKIE } from "../geo";

/** True when the visitor's location doesn't allow live trading. Practice and Lookout stay open. */
export function useGeoRestricted(): boolean {
  const [restricted, setRestricted] = useState(false);
  useEffect(() => {
    const match = document.cookie.split("; ").find((c) => c.startsWith(`${GEO_COOKIE}=`));
    setRestricted(match?.split("=")[1] === "restricted");
  }, []);
  return restricted;
}

export const RESTRICTED_MESSAGE =
  "Live trading isn't available in your region. Practice runs and Lookout alerts still work, and you can always cash out existing jobs and withdraw.";
