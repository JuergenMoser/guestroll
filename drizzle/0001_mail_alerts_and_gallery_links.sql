CREATE TABLE `guest_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`guest_id` text NOT NULL,
	`email` text NOT NULL,
	`locale` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guest_contacts_guest_idx` ON `guest_contacts` (`event_id`,`guest_id`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`to` text NOT NULL,
	`subject` text NOT NULL,
	`html` text NOT NULL,
	`text` text NOT NULL,
	`kind` text NOT NULL,
	`event_id` text,
	`dedupe_key` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_error` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`sent_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_dedupe_key_unique` ON `outbox` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `outbox_status_idx` ON `outbox` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `share_links` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`token` text NOT NULL,
	`password_hash` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`allow_download` integer DEFAULT true NOT NULL,
	`expires_at` integer,
	`revoked_at` integer,
	`views` integer DEFAULT 0 NOT NULL,
	`last_used_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `share_links_token_unique` ON `share_links` (`token`);--> statement-breakpoint
CREATE INDEX `share_links_event_idx` ON `share_links` (`event_id`);--> statement-breakpoint
ALTER TABLE `events` ADD `collect_guest_emails` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `notify_admin_summary` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `email_guests_gallery` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `gallery_link_days` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `gallery_link_download` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `gallery_mail_includes_password` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `ended_at` integer;--> statement-breakpoint
-- Events already over before this version: mark them done, so upgrading never
-- sends end-of-event emails for old events.
UPDATE `events` SET `ended_at` = (unixepoch() * 1000) WHERE `uploads_close_at` IS NOT NULL AND `uploads_close_at` <= (unixepoch() * 1000);
