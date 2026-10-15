CREATE TABLE `webhook_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`webhook_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`dedupe_key` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_error` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`sent_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_deliveries_dedupe_key_unique` ON `webhook_deliveries` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_status_idx` ON `webhook_deliveries` (`status`,`next_attempt_at`);