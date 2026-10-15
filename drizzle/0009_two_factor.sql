ALTER TABLE `accounts` ADD `totp_secret` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `totp_pending` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `totp_last_step` integer;--> statement-breakpoint
ALTER TABLE `accounts` ADD `recovery_codes` text;