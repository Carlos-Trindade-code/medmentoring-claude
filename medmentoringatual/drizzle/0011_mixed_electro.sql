CREATE TABLE `pillar_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mentee_id` int NOT NULL,
	`pillar_id` int NOT NULL,
	`title` varchar(300),
	`subtitle` varchar(300),
	`executive_summary` text,
	`strengths_json` text,
	`attention_json` text,
	`action_plan_json` text,
	`conclusions_text` text,
	`suggestions_json` text,
	`status` varchar(50) NOT NULL DEFAULT 'draft',
	`html_content` text,
	`pdf_url` varchar(500),
	`generated_at` timestamp,
	`released_at` timestamp,
	`email_sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pillar_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pillar_reports` ADD CONSTRAINT `pillar_reports_mentee_id_mentees_id_fk` FOREIGN KEY (`mentee_id`) REFERENCES `mentees`(`id`) ON DELETE cascade ON UPDATE no action;