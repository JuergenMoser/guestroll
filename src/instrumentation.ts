export async function register() {
  // Runs once at server start: opens the database (applying migrations),
  // prints the generated admin password on first boot, starts the scheduler.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapAdmin } = await import("@/lib/auth/admin");
    bootstrapAdmin();
    const { startScheduler } = await import("@/lib/scheduler");
    startScheduler();
  }
}
