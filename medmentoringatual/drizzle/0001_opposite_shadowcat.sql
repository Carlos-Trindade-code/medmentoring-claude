CREATE TABLE `checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`pillarId` int NOT NULL,
	`itemIndex` int NOT NULL,
	`status` enum('pending','requested','completed') NOT NULL DEFAULT 'pending',
	`completedAt` timestamp,
	`requestedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`despesasJson` json,
	`mapaSalaJson` json,
	`precificacaoJson` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_data_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_data_menteeId_unique` UNIQUE(`menteeId`)
);
--> statement-breakpoint
CREATE TABLE `ivmp_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`categoriesJson` json NOT NULL,
	`ivmpFinal` decimal(5,4) DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ivmp_data_id` PRIMARY KEY(`id`),
	CONSTRAINT `ivmp_data_menteeId_unique` UNIQUE(`menteeId`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`pillarId` int NOT NULL,
	`titulo` varchar(500) NOT NULL,
	`tipo` enum('link','pdf','video','planilha','apresentacao','exercicio') NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(500) DEFAULT '',
	`descricao` text DEFAULT (''),
	`tamanhoBytes` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mentees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessCode` varchar(64) NOT NULL,
	`accessCodeHash` varchar(255) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`especialidade` varchar(255) DEFAULT '',
	`cidade` varchar(255) DEFAULT '',
	`estado` varchar(2) DEFAULT '',
	`telefone` varchar(20) DEFAULT '',
	`email` varchar(320) DEFAULT '',
	`tipoClinica` varchar(100) DEFAULT '',
	`tempoFormacao` int DEFAULT 0,
	`faturamentoMedio` decimal(12,2) DEFAULT '0',
	`dataInicio` timestamp,
	`dataCadastro` timestamp NOT NULL DEFAULT (now()),
	`horasRealizadas` decimal(6,1) DEFAULT '0',
	`sessoesRealizadas` int DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`notasGerais` text DEFAULT (''),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mentees_id` PRIMARY KEY(`id`),
	CONSTRAINT `mentees_accessCode_unique` UNIQUE(`accessCode`)
);
--> statement-breakpoint
CREATE TABLE `mentor_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`pillarId` int NOT NULL,
	`conteudo` text NOT NULL DEFAULT (''),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mentor_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nps_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`pillarId` int NOT NULL,
	`score` int NOT NULL,
	`comentario` text DEFAULT (''),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nps_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_forms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`telefone` varchar(20) DEFAULT '',
	`especialidade` varchar(255) DEFAULT '',
	`tempoFormacao` varchar(50) DEFAULT '',
	`estruturaAtual` varchar(100) DEFAULT '',
	`faturamentoFaixa` varchar(50) DEFAULT '',
	`principalDor` text DEFAULT (''),
	`tentouResolver` text DEFAULT (''),
	`disponibilidade` varchar(255) DEFAULT '',
	`pilaresIdentificados` json,
	`status` enum('new','contacted','converted','lost') NOT NULL DEFAULT 'new',
	`menteeId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_forms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pillar_releases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`pillarId` int NOT NULL,
	`checklistReleased` boolean NOT NULL DEFAULT false,
	`resumoReleased` boolean NOT NULL DEFAULT false,
	`financeiroReleased` boolean NOT NULL DEFAULT false,
	`materiaisReleased` boolean NOT NULL DEFAULT false,
	`sessoesReleased` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pillar_releases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeId` int NOT NULL,
	`pillarId` int,
	`assunto` varchar(500) NOT NULL,
	`mensagem` text DEFAULT (''),
	`dataPreferida` varchar(50) DEFAULT '',
	`status` enum('pending','confirmed','refused','completed') NOT NULL DEFAULT 'pending',
	`mentorResposta` text DEFAULT (''),
	`dataConfirmada` varchar(50) DEFAULT '',
	`horaConfirmada` varchar(10) DEFAULT '',
	`linkSessao` varchar(500) DEFAULT '',
	`duracaoMinutos` int DEFAULT 0,
	`notasSessao` text DEFAULT (''),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `session_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `checklist_items` ADD CONSTRAINT `checklist_items_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financial_data` ADD CONSTRAINT `financial_data_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ivmp_data` ADD CONSTRAINT `ivmp_data_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `materials` ADD CONSTRAINT `materials_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mentor_notes` ADD CONSTRAINT `mentor_notes_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nps_responses` ADD CONSTRAINT `nps_responses_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_forms` ADD CONSTRAINT `onboarding_forms_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pillar_releases` ADD CONSTRAINT `pillar_releases_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_requests` ADD CONSTRAINT `session_requests_menteeId_mentees_id_fk` FOREIGN KEY (`menteeId`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;