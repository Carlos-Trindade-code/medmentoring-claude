CREATE TABLE `chat_conclusions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mentee_id` int NOT NULL,
	`pillar_id` int NOT NULL,
	`chat_message_id` int,
	`content` text NOT NULL,
	`titulo` varchar(300),
	`categoria` varchar(100),
	`included_in_report` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_conclusions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chat_conclusions` ADD CONSTRAINT `chat_conclusions_mentee_id_mentees_id_fk` FOREIGN KEY (`mentee_id`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `part_releases` ADD CONSTRAINT `part_releases_mentee_id_mentees_id_fk` FOREIGN KEY (`mentee_id`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;