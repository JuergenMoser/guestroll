CREATE TABLE `spots` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`label` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `spots_event_idx` ON `spots` (`event_id`);--> statement-breakpoint
ALTER TABLE `photos` ADD `spot_id` text REFERENCES spots(id) ON DELETE set null;--> statement-breakpoint
CREATE INDEX `photos_spot_idx` ON `photos` (`spot_id`);