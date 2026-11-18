/**
 * Receives Content Security Policy violation reports (both the old report-uri format and the
 * Reporting API format) and logs them, so the policy can be checked before it's enforced.
 * Browser-extension noise is dropped.
 */
type Violation = { blocked?: string; directive?: string; page?: string; source?: string };

const NOISE = /^(chrome|moz|safari|safari-web|ms-browser)-extension:|^about:|^data:|^blob:/;

function normalize(r: Record<string, unknown>): Violation {
  const s = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : undefined);
  return {
    blocked: s("blocked-uri") ?? s("blockedURL"),
    directive: s("effective-directive") ?? s("effectiveDirective") ?? s("violated-directive"),
    page: s("document-uri") ?? s("documentURL"),
    source: s("source-file") ?? s("sourceFile"),
  };
}

export async function POST(req: Request) {
  const text = (await req.text()).slice(0, 20_000);
  let reports: Violation[] = [];
  try {
    const body = JSON.parse(text);
    if (Array.isArray(body)) reports = body.filter((r) => r?.type === "csp-violation").map((r) => normalize(r.body ?? {}));
    else if (body?.["csp-report"]) reports = [normalize(body["csp-report"])];
  } catch {
    return new Response(null, { status: 400 });
  }
  for (const v of reports.slice(0, 20)) {
    if (v.blocked && NOISE.test(v.blocked)) continue;
    if (v.source && NOISE.test(v.source)) continue;
    console.warn("CSP violation", JSON.stringify(v));
  }
  return new Response(null, { status: 204 });
}
