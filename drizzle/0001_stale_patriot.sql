CREATE TABLE `priceAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`watchlistId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`alertType` enum('above','below') NOT NULL,
	`targetPrice` varchar(20) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`isTriggered` int NOT NULL DEFAULT 0,
	`triggeredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `priceAlerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`nameCn` text,
	`market` varchar(10) NOT NULL,
	`exchange` varchar(50),
	`currency` varchar(10),
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `watchlist_id` PRIMARY KEY(`id`)
);
