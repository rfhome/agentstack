import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export type RLSClient = Prisma.TransactionClient;

/**
 * Wraps a callback in a short-lived transaction that sets the RLS user context.
 * All queries inside fn() see only rows belonging to userId.
 * set_config TRUE makes the setting transaction-local — it resets on commit/rollback.
 */
export async function withRLS<T>(
  userId: string,
  fn: (db: RLSClient) => Promise<T>
): Promise<T> {
  if (!userId) throw new Error("withRLS called without userId — refusing to query without user isolation");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, TRUE)`;
    return fn(tx);
  });
}
