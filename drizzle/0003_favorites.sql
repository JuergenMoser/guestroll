ALTER TABLE `events` ADD `gallery_link_favorites` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `photos` ADD `favorite` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `share_links` ADD `favorites_only` integer DEFAULT false NOT NULL;