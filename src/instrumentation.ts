export async function register() {
  // Runs once at server start: opens the database (applying migrations) and
  // prints the generated admin password on first boot, before anyone visits.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapAdmin } = await import("@/lib/auth/admin");
    bootstrapAdmin();
  }
}
