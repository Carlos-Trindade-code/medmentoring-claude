CREATE TABLE `mentor_ai_chat` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`pillarId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mentor_ai_chat_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mentor_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`pillarId` int NOT NULL,
	`texto` text NOT NULL,
	`categoria` varchar(100),
	`concluida` boolean NOT NULL DEFAULT false,
	`concluidaEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mentor_suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `mentor_ai_chat` ADD CONSTRAINT `mentor_ai_chat_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mentor_suggestions` ADD CONSTRAINT `mentor_suggestions_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;