"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketEvent } from "../events";

export function useUpcomingEvents() {
  return useQuery({
    queryKey: ["events"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/events");
      return (res.ok ? await res.json() : []) as MarketEvent[];
    },
  });
}

export function eventWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
