CREATE TABLE `practice` (
	`id` text PRIMARY KEY NOT NULL,
	`textbook` text NOT NULL,
	`unit` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
