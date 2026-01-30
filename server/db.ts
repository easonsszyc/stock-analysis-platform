import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, watchlist, InsertWatchlist, priceAlerts, InsertPriceAlert } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========== Watchlist Functions ==========

/**
 * Add a stock to user's watchlist
 */
export async function addToWatchlist(data: InsertWatchlist) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.insert(watchlist).values(data);
    return result;
  } catch (error) {
    console.error("[Database] Failed to add to watchlist:", error);
    throw error;
  }
}

/**
 * Get user's watchlist
 */
export async function getUserWatchlist(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, userId))
      .orderBy(desc(watchlist.addedAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get watchlist:", error);
    throw error;
  }
}

/**
 * Remove a stock from user's watchlist
 */
export async function removeFromWatchlist(userId: number, watchlistId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db
      .delete(watchlist)
      .where(and(eq(watchlist.id, watchlistId), eq(watchlist.userId, userId)));
  } catch (error) {
    console.error("[Database] Failed to remove from watchlist:", error);
    throw error;
  }
}

/**
 * Check if a stock is in user's watchlist
 */
export async function isInWatchlist(userId: number, symbol: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db
      .select()
      .from(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.symbol, symbol)))
      .limit(1);
    return result.length > 0;
  } catch (error) {
    console.error("[Database] Failed to check watchlist:", error);
    throw error;
  }
}

// ========== Price Alerts Functions ==========

/**
 * Create a price alert
 */
export async function createPriceAlert(data: InsertPriceAlert) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.insert(priceAlerts).values(data);
    return result;
  } catch (error) {
    console.error("[Database] Failed to create price alert:", error);
    throw error;
  }
}

/**
 * Get user's price alerts for a specific stock
 */
export async function getPriceAlerts(userId: number, symbol: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db
      .select()
      .from(priceAlerts)
      .where(
        and(
          eq(priceAlerts.userId, userId),
          eq(priceAlerts.symbol, symbol),
          eq(priceAlerts.isActive, 1)
        )
      )
      .orderBy(desc(priceAlerts.createdAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get price alerts:", error);
    throw error;
  }
}

/**
 * Get all active price alerts for a user
 */
export async function getAllActivePriceAlerts(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db
      .select()
      .from(priceAlerts)
      .where(
        and(
          eq(priceAlerts.userId, userId),
          eq(priceAlerts.isActive, 1),
          eq(priceAlerts.isTriggered, 0)
        )
      );
    return result;
  } catch (error) {
    console.error("[Database] Failed to get active price alerts:", error);
    throw error;
  }
}

/**
 * Update price alert status
 */
export async function updatePriceAlert(
  alertId: number,
  userId: number,
  updates: { isActive?: number; isTriggered?: number; triggeredAt?: Date }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db
      .update(priceAlerts)
      .set(updates)
      .where(and(eq(priceAlerts.id, alertId), eq(priceAlerts.userId, userId)));
  } catch (error) {
    console.error("[Database] Failed to update price alert:", error);
    throw error;
  }
}

/**
 * Delete a price alert
 */
export async function deletePriceAlert(alertId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db
      .delete(priceAlerts)
      .where(and(eq(priceAlerts.id, alertId), eq(priceAlerts.userId, userId)));
  } catch (error) {
    console.error("[Database] Failed to delete price alert:", error);
    throw error;
  }
}
