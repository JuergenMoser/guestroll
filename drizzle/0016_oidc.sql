ALTER TABLE `accounts` ADD `oidc_subject` text;--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_oidc_subject_unique` ON `accounts` (`oidc_subject`);