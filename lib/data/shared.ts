/** Internal to lib/data — not exported to consumers. */
export function logDataError(context: string, error: unknown) {
  console.error(`[lib/data] ${context}:`, error instanceof Error ? error.message : error);
}
