CREATE TABLE `activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text,
	`type` text NOT NULL,
	`guest_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_event_idx` ON `activity` (`event_id`,`type`,`created_at`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`event_date` text,
	`accent_color` text DEFAULT '#f59e0b' NOT NULL,
	`access_code_hash` text,
	`uploads_open` integer DEFAULT true NOT NULL,
	`uploads_close_at` integer,
	`gallery_visibility` text DEFAULT 'private' NOT NULL,
	`guest_download` integer DEFAULT false NOT NULL,
	`moderation` text DEFAULT 'post' NOT NULL,
	`capture_mode` text DEFAULT 'camera' NOT NULL,
	`ask_guest_name` integer DEFAULT true NOT NULL,
	`max_photos_per_guest` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`guest_id` text NOT NULL,
	`guest_name` text,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`bytes` integer NOT NULL,
	`status` text NOT NULL,
	`downloads` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `photos_event_idx` ON `photos` (`event_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `photos_guest_idx` ON `photos` (`event_id`,`guest_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
