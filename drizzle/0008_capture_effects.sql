ALTER TABLE `events` ADD `capture_filters` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `frame` text DEFAULT 'none' NOT NULL;