CREATE TABLE `vocab_hooks` (
	`id` text PRIMARY KEY NOT NULL,
	`word` text NOT NULL,
	`content` text NOT NULL,
	`userId` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
