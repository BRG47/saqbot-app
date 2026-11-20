import { NextResponse, type NextRequest } from "next/server";
import { GEO_COOKIE, isRestricted, restrictedList } from "./lib/geo";

/**
 * Tags every visit with whether live trading is allowed from the visitor's location.
 * Vercel adds the visitor's country and region as request headers.
 * Locally there are no headers, so set GEO_OVERRIDE=US (or US-CO, CA-ON) in .env.local to test.
 */
export function middleware(req: NextRequest) {
  const override = process.env.NODE_ENV !== "production" ? process.env.GEO_OVERRIDE : undefined;
  const [oCountry, oRegion] = override ? override.split("-") : [];
  const country = oCountry ?? req.headers.get("x-vercel-ip-country");
  const region = oRegion ?? req.headers.get("x-vercel-ip-country-region");
  const restricted = isRestricted(country, region, restrictedList(process.env.RESTRICTED_REGIONS));

  const res = NextResponse.next();
  res.cookies.set(GEO_COOKIE, restricted ? "restricted" : "ok", { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 });
  return res;
}

export const config = {
  // Pages only: skip static files, images and the service worker.
  matcher: ["/((?!_next/|api/|sw.js|manifest.webmanifest|icon-).*)"],
};
