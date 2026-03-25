CREATE TABLE `mentee_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`tipo` enum('resumo_questionario','resumo_fase','prompt_marketing','persona','diagnostico_pilar') NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`conteudo` text NOT NULL,
	`metadados` json,
	`lidoPeloMentor` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mentee_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mentee_questionnaire` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`faseId` int NOT NULL,
	`respostasJson` json,
	`status` enum('nao_iniciada','em_progresso','concluida') NOT NULL DEFAULT 'nao_iniciada',
	`resumoIa` text,
	`concluidaEm` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mentee_questionnaire_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `mentee_documents` ADD CONSTRAINT `mentee_documents_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mentee_questionnaire` ADD CONSTRAINT `mentee_questionnaire_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;