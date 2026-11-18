import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __saqbotSql: ReturnType<typeof postgres> | undefined;
}

/** One shared connection pool, reused across hot reloads in development. */
export const sql =
  globalThis.__saqbotSql ??
  (globalThis.__saqbotSql = postgres(process.env.DATABASE_URL ?? "", { max: 5, idle_timeout: 20 }));
