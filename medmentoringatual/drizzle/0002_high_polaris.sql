ALTER TABLE `materials` MODIFY COLUMN `descricao` text;--> statement-breakpoint
ALTER TABLE `mentees` MODIFY COLUMN `notasGerais` text;--> statement-breakpoint
ALTER TABLE `mentor_notes` MODIFY COLUMN `conteudo` text NOT NULL;--> statement-breakpoint
ALTER TABLE `nps_responses` MODIFY COLUMN `comentario` text;--> statement-breakpoint
ALTER TABLE `onboarding_forms` MODIFY COLUMN `principalDor` text;--> statement-breakpoint
ALTER TABLE `onboarding_forms` MODIFY COLUMN `tentouResolver` text;--> statement-breakpoint
ALTER TABLE `session_requests` MODIFY COLUMN `mensagem` text;--> statement-breakpoint
ALTER TABLE `session_requests` MODIFY COLUMN `mentorResposta` text;--> statement-breakpoint
ALTER TABLE `session_requests` MODIFY COLUMN `notasSessao` text;