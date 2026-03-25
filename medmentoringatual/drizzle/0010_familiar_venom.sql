CREATE TABLE `part_releases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mentee_id` int NOT NULL,
	`pillar_id` int NOT NULL,
	`part_id` varchar(50) NOT NULL,
	`part_label` varchar(200) NOT NULL,
	`released` boolean DEFAULT false,
	`released_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `part_releases_id` PRIMARY KEY(`id`)
);
