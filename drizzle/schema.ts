import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Watchlist table for storing user's favorite stocks
 */
export const watchlist = mysqlTable("watchlist", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Foreign key to users table
  symbol: varchar("symbol", { length: 20 }).notNull(), // Stock symbol (e.g., AAPL, 1530)
  nameCn: text("nameCn"), // Chinese name of the stock
  market: varchar("market", { length: 10 }).notNull(), // Market: US, HK, CN
  exchange: varchar("exchange", { length: 50 }), // Exchange name
  currency: varchar("currency", { length: 10 }), // Currency: USD, HKD, CNY
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = typeof watchlist.$inferInsert;

/**
 * Price alerts table for storing user's price alert settings
 */
export const priceAlerts = mysqlTable("priceAlerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Foreign key to users table
  watchlistId: int("watchlistId").notNull(), // Foreign key to watchlist table
  symbol: varchar("symbol", { length: 20 }).notNull(), // Stock symbol
  alertType: mysqlEnum("alertType", ["above", "below"]).notNull(), // Alert when price goes above or below
  targetPrice: varchar("targetPrice", { length: 20 }).notNull(), // Target price as string to preserve precision
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = inactive
  isTriggered: int("isTriggered").default(0).notNull(), // 1 = triggered, 0 = not triggered
  triggeredAt: timestamp("triggeredAt"), // When the alert was triggered
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;