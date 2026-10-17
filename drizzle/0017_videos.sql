ALTER TABLE `events` ADD `allow_videos` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `photos` ADD `media_type` text;--> statement-breakpoint
ALTER TABLE `photos` ADD `duration_ms` integer;