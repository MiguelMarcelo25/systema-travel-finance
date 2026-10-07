CREATE TABLE `client_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`requirement_id` text NOT NULL,
	`file_name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`storage_path` text NOT NULL,
	`request_id` text NOT NULL,
	`status` text DEFAULT 'Pending review' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_documents_storage_path_unique` ON `client_documents` (`storage_path`);--> statement-breakpoint
CREATE UNIQUE INDEX `client_documents_request_id_unique` ON `client_documents` (`request_id`);--> statement-breakpoint
CREATE INDEX `documents_customer_requirement_idx` ON `client_documents` (`customer_id`,`requirement_id`);