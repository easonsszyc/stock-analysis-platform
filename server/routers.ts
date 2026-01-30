import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { getRealtimeQuote } from "./services/realtime-data.service";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Watchlist management
  watchlist: router({
    // Get user's watchlist
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserWatchlist(ctx.user.id);
    }),

    // Add stock to watchlist
    add: protectedProcedure
      .input(
        z.object({
          symbol: z.string(),
          nameCn: z.string().optional(),
          market: z.string(),
          exchange: z.string().optional(),
          currency: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check if already in watchlist
        const exists = await db.isInWatchlist(ctx.user.id, input.symbol);
        if (exists) {
          throw new Error("Stock already in watchlist");
        }

        await db.addToWatchlist({
          userId: ctx.user.id,
          symbol: input.symbol,
          nameCn: input.nameCn,
          market: input.market,
          exchange: input.exchange,
          currency: input.currency,
        });

        return { success: true };
      }),

    // Remove stock from watchlist
    remove: protectedProcedure
      .input(z.object({ watchlistId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.removeFromWatchlist(ctx.user.id, input.watchlistId);
        return { success: true };
      }),

    // Check if stock is in watchlist
    check: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ ctx, input }) => {
        return await db.isInWatchlist(ctx.user.id, input.symbol);
      }),

    // 批量获取自选股实时数据
    getQuotes: protectedProcedure
      .query(async ({ ctx }) => {
        const watchlist = await db.getUserWatchlist(ctx.user.id);
        
        if (watchlist.length === 0) {
          return [];
        }

        // 批量获取股票价格
        const quotes = await Promise.all(
          watchlist.map(async (item: any) => {
            try {
              const quote = await getRealtimeQuote(item.symbol, item.market);
              
              if (quote) {
                return {
                  symbol: item.symbol,
                  name: quote.name,
                  price: quote.currentPrice,
                  change: quote.change,
                  changePercent: quote.changePercent,
                  volume: quote.volume,
                  market: quote.market,
                  // TODO: 添加买卖信号
                  signal: undefined,
                  signalStrength: undefined,
                };
              }
              return null;
            } catch (error) {
              console.error(`Failed to fetch quote for ${item.symbol}:`, error);
              return null;
            }
          })
        );

        return quotes.filter((q: any) => q !== null);
      }),
  }),

  // Price alerts management
  priceAlerts: router({
    // Get price alerts for a stock
    list: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ ctx, input }) => {
        return await db.getPriceAlerts(ctx.user.id, input.symbol);
      }),

    // Get all active price alerts
    listAll: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAllActivePriceAlerts(ctx.user.id);
    }),

    // Create a price alert
    create: protectedProcedure
      .input(
        z.object({
          watchlistId: z.number(),
          symbol: z.string(),
          alertType: z.enum(["above", "below"]),
          targetPrice: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.createPriceAlert({
          userId: ctx.user.id,
          watchlistId: input.watchlistId,
          symbol: input.symbol,
          alertType: input.alertType,
          targetPrice: input.targetPrice,
          isActive: 1,
          isTriggered: 0,
        });

        return { success: true };
      }),

    // Update price alert status
    update: protectedProcedure
      .input(
        z.object({
          alertId: z.number(),
          isActive: z.number().optional(),
          isTriggered: z.number().optional(),
          triggeredAt: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { alertId, ...updates } = input;
        await db.updatePriceAlert(alertId, ctx.user.id, updates);
        return { success: true };
      }),

    // Delete a price alert
    delete: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePriceAlert(input.alertId, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
