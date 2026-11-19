import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, cspHeaderName } from "./lib/csp";

/**
 * Adds a per-request Content Security Policy with a fresh script nonce.
 * Next.js reads the nonce from the request header and puts it on its own scripts.
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
