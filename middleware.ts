import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, cspHeaderName } from "./lib/csp";
import { GEO_COOKIE, isRestricted, restrictedList } from "./lib/geo";

/**
 * Runs on every page request and does two things:
 * 1. Adds a per-request Content Security Policy with a fresh script nonce.
 *    Next.js reads the nonce from the request header and puts it on its own scripts.
 * 2. Tags the visit with whether live trading is allowed from the visitor's location.
 *    Vercel adds the visitor's country and region as request headers.
 *    Locally there are no headers, so set GEO_OVERRIDE=US (or US-CO, CA-ON) in .env.local to test.
 */
export function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const header = cspHeaderName();
  const csp = buildCsp(nonce, { dev: process.env.NODE_ENV === "development", reportUri: "/api/csp-report" });

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(header, csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set(header, csp);
  res.headers.set("Reporting-Endpoints", `csp="${new URL("/api/csp-report", req.url).toString()}"`);

  const override = process.env.NODE_ENV !== "production" ? process.env.GEO_OVERRIDE : undefined;
  const [oCountry, oRegion] = override ? override.split("-") : [];
  const country = oCountry ?? req.headers.get("x-vercel-ip-country");
  const region = oRegion ?? req.headers.get("x-vercel-ip-country-region");
  const restricted = isRestricted(country, region, restrictedList(process.env.RESTRICTED_REGIONS));
  res.cookies.set(GEO_COOKIE, restricted ? "restricted" : "ok", {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
  });

  return res;
}

export const config = {
  // Pages only: skip API routes, static files, images, the service worker and the manifest.
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|ico|svg|jpg|jpeg|webp|txt|mp4)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
