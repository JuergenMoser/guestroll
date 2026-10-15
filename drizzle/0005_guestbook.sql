CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`guest_id` text NOT NULL,
	`guest_name` text,
	`text` text DEFAULT '' NOT NULL,
	`audio_ext` text,
	`audio_bytes` integer,
	`audio_seconds` integer,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_event_idx` ON `messages` (`event_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_guest_idx` ON `messages` (`event_id`,`guest_id`);--> statement-breakpoint
ALTER TABLE `events` ADD `guestbook_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `guestbook_voice` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `guestbook_in_gallery` integer DEFAULT false NOT NULL;