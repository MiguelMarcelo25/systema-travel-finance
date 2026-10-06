CREATE TABLE `booking_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`package_id` text NOT NULL,
	`travel_date` text NOT NULL,
	`passengers` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`requested_at` text NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`decision_notes` text DEFAULT '' NOT NULL,
	`booking_id` text,
	`request_id` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_requests_request_id_unique` ON `booking_requests` (`request_id`);--> statement-breakpoint
CREATE INDEX `requests_customer_idx` ON `booking_requests` (`customer_id`);--> statement-breakpoint
CREATE INDEX `requests_status_idx` ON `booking_requests` (`status`);--> statement-breakpoint
ALTER TABLE `users` ADD `customer_id` text REFERENCES customers(id);--> statement-breakpoint
UPDATE users SET role='Client' WHERE role!='Administrator' OR id!=(SELECT id FROM users WHERE role='Administrator' ORDER BY created,id LIMIT 1);
--> statement-breakpoint
UPDATE users SET customer_id=(SELECT id FROM customers WHERE lower(email)=lower(users.email) LIMIT 1) WHERE role='Client';
--> statement-breakpoint
DELETE FROM sessions;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_single_administrator` ON `users` (`role`) WHERE "users"."role" = 'Administrator';--> statement-breakpoint
CREATE UNIQUE INDEX `users_customer_unique` ON `users` (`customer_id`);