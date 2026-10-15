ALTER TABLE `photos` ADD `sharpness` integer;--> statement-breakpoint
ALTER TABLE `photos` ADD `hash` text;--> statement-breakpoint
ALTER TABLE `photos` ADD `duplicate_of` text REFERENCES photos(id) ON DELETE set null;