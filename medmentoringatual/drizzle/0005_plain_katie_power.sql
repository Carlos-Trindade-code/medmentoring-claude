CREATE TABLE `pillar_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`pillarId` int NOT NULL,
	`secao` varchar(100) NOT NULL,
	`respostas` json,
	`status` enum('nao_iniciada','em_progresso','concluida') NOT NULL DEFAULT 'nao_iniciada',
	`concluidaEm` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pillar_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pillar_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`pillarId` int NOT NULL,
	`feedback` text,
	`planoAcao` text,
	`pontosFortesJson` json,
	`pontosMelhoriaJson` json,
	`conclusaoLiberada` boolean NOT NULL DEFAULT false,
	`conclusaoLiberadaEm` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pillar_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pillar_answers` ADD CONSTRAINT `pillar_answers_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pillar_feedback` ADD CONSTRAINT `pillar_feedback_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;