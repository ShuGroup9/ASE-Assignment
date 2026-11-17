/**
 * Runs once when the server boots. Validates env so a misconfigured deploy
 * refuses to START (the process exits and the deploy fails visibly).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadEnv } = await import("./lib/env");
    try {
      loadEnv();
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  }
}
