CREATE TABLE `counters` (
	`key` text PRIMARY KEY NOT NULL,
	`value` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `funeral_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`director_org_id` text NOT NULL,
	`reference` text NOT NULL,
	`deceased_name` text NOT NULL,
	`funeral_date` integer,
	`location` text,
	`family_contact` text,
	`notes` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`director_org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cases_director_idx` ON `funeral_cases` (`director_org_id`);--> statement-breakpoint
CREATE TABLE `invoice_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`kind` text DEFAULT 'item' NOT NULL,
	`description` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`vat_rate_bps` integer NOT NULL,
	`net_cents` integer NOT NULL,
	`vat_cents` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoice_lines_invoice_idx` ON `invoice_lines` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`order_id` text NOT NULL,
	`director_org_id` text NOT NULL,
	`vendor_org_id` text NOT NULL,
	`status` text DEFAULT 'issued' NOT NULL,
	`currency` text DEFAULT 'eur' NOT NULL,
	`subtotal_cents` integer NOT NULL,
	`vat_cents` integer NOT NULL,
	`platform_fee_cents` integer NOT NULL,
	`platform_fee_vat_cents` integer NOT NULL,
	`total_cents` integer NOT NULL,
	`issued_at` integer NOT NULL,
	`due_at` integer NOT NULL,
	`paid_at` integer,
	`payment_method` text,
	`stripe_checkout_session_id` text,
	`stripe_payment_intent_id` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`director_org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vendor_org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_uq` ON `invoices` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_order_uq` ON `invoices` (`order_id`);--> statement-breakpoint
CREATE INDEX `invoices_director_idx` ON `invoices` (`director_org_id`,`status`);--> statement-breakpoint
CREATE INDEX `invoices_vendor_idx` ON `invoices` (`vendor_org_id`,`status`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`service_id` text,
	`description` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`vat_rate_bps` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`author_user_id` text,
	`kind` text DEFAULT 'user' NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `messages_order_idx` ON `order_messages` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`case_id` text NOT NULL,
	`director_org_id` text NOT NULL,
	`vendor_org_id` text NOT NULL,
	`created_by_user_id` text,
	`status` text DEFAULT 'requested' NOT NULL,
	`required_by` integer,
	`delivery_address` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `funeral_cases`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`director_org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vendor_org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_number_uq` ON `orders` (`number`);--> statement-breakpoint
CREATE INDEX `orders_director_idx` ON `orders` (`director_org_id`,`status`);--> statement-breakpoint
CREATE INDEX `orders_vendor_idx` ON `orders` (`vendor_org_id`,`status`);--> statement-breakpoint
CREATE INDEX `orders_case_idx` ON `orders` (`case_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`address` text,
	`county` text,
	`vat_number` text,
	`description` text,
	`category` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`stripe_account_id` text,
	`stripe_charges_enabled` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `org_type_status_idx` ON `organizations` (`type`,`status`);--> statement-breakpoint
CREATE INDEX `org_stripe_idx` ON `organizations` (`stripe_account_id`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_org_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`unit` text DEFAULT 'each' NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`vat_rate_bps` integer DEFAULT 2300 NOT NULL,
	`image_url` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`vendor_org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `services_vendor_idx` ON `services` (`vendor_org_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`org_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);