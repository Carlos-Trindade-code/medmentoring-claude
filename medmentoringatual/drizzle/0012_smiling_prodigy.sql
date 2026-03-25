CREATE TABLE `pillar_part_content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mentee_id` int NOT NULL,
	`pillar_id` int NOT NULL,
	`part_id` varchar(10) NOT NULL,
	`part_label` varchar(200) NOT NULL,
	`titulo` varchar(300),
	`conteudo` text,
	`guia_uso` text,
	`destaques` text,
	`proximos_passos` text,
	`status` varchar(50) NOT NULL DEFAULT 'draft',
	`generated_by_ai` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pillar_part_content_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pillar_part_content` ADD CONSTRAINT `pillar_part_content_mentee_id_mentees_id_fk` FOREIGN KEY (`mentee_id`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;