import { importSPKI, jwtVerify } from "jose";

let keyPromise: ReturnType<typeof importSPKI> | null = null;

/**
 * Verifies the Privy access token sent as "Authorization: Bearer <token>" and
 * returns the Privy user id. The verification key comes from the Privy dashboard.
 */
export async function requireUser(req: Request): Promise<string> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Sign in first.");
  const pem = process.env.PRIVY_VERIFICATION_KEY;
  if (!pem) throw new HttpError(500, "Server is missing PRIVY_VERIFICATION_KEY.");
  keyPromise ??= importSPKI(pem.replace(/\\n/g, "\n"), "ES256");
  try {
    const { payload } = await jwtVerify(token, await keyPromise, {
      issuer: "privy.io",
      audience: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    });
    if (!payload.sub) throw new Error("no subject");
    return payload.sub;
  } catch {
    throw new HttpError(401, "Your session expired. Sign in again.");
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: "Something went wrong on our side." }, { status: 500 });
}
