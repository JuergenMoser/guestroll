ALTER TABLE `events` ADD `challenges` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `photos` ADD `challenge_id` text;