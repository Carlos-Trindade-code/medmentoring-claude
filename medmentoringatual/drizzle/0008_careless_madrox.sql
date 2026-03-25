CREATE TABLE `pillar_conclusions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`pillarId` int NOT NULL,
	`conclusoesJson` json,
	`geradoPorIa` boolean NOT NULL DEFAULT false,
	`iaGeneratedAt` timestamp,
	`liberadoParaMentorado` boolean NOT NULL DEFAULT false,
	`liberadoEm` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pillar_conclusions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pillar_conclusions` ADD CONSTRAINT `pillar_conclusions_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;