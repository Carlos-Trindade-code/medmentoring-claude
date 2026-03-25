CREATE TABLE `diagnosis_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int,
	`nomeProspecto` varchar(255) DEFAULT '',
	`respostasRoteiro` json,
	`pilaresUrgentes` json,
	`ivmpEstimado` decimal(5,4),
	`notasSessao` text,
	`status` enum('draft','completed','converted') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diagnosis_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pillar_diagnostics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`pillarId` int NOT NULL,
	`respostasJson` json,
	`angustiasJson` json,
	`tecnicasJson` json,
	`analiseEstrategica` text,
	`pilaresUrgentes` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pillar_diagnostics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `diagnosis_sessions` ADD CONSTRAINT `diagnosis_sessions_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pillar_diagnostics` ADD CONSTRAINT `pillar_diagnostics_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;