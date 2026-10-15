export async function register() {
  // Runs once at server start: opens the database (applying migrations),
  // prints the generated admin password on first boot, starts the scheduler.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapAdmin } = await import("@/lib/auth/admin");
    bootstrapAdmin();
    const { recordStartup } = await import("@/lib/updates");
    const update = recordStartup();
    if (update) console.log(`[updates] ${update.from} → ${update.to}, migrations applied: ${update.migrations.join(", ") || "none"}`);
    const { storage } = await import("@/lib/storage");
    const { checkBucket } = await import("@/lib/storage/s3");
    const driver = storage();
    if (driver.name === "s3") {
      // A wrong key or bucket would otherwise only show up on the first guest's upload.
      await checkBucket(driver).then(
        () => console.log("[storage] S3 bucket reachable"),
        (error: Error) => console.error(`[storage] S3 bucket NOT usable: ${error.message}. Uploads will fail until this is fixed.`),
      );
    }
    const { startBackupSchedule } = await import("@/lib/backupSchedule");
    startBackupSchedule();
    const { startScheduler } = await import("@/lib/scheduler");
    startScheduler();
  }
}
