/**
 * API缓存服务
 * 使用内存缓存减少API调用次数，避免配额耗尽
 */
import NodeCache from 'node-cache';

// 创建不同TTL的缓存实例
const searchCache = new NodeCache({ stdTTL: 24 * 60 * 60 }); // 24小时
const intradayCache = new NodeCache({ stdTTL: 5 * 60 }); // 5分钟
const klineCache = new NodeCache({ stdTTL: 30 * 60 }); // 30分钟
const indicatorCache = new NodeCache({ stdTTL: 10 * 60 }); // 10分钟

export class CacheService {
  /**
   * 获取股票搜索结果缓存
   */
  static getSearchCache(query: string): any | undefined {
    return searchCache.get(`search:${query}`);
  }

  /**
   * 设置股票搜索结果缓存
   */
  static setSearchCache(query: string, data: any): void {
    searchCache.set(`search:${query}`, data);
    console.log(`[Cache] Cached search result for: ${query}`);
  }

  /**
   * 获取分时数据缓存
   */
  static getIntradayCache(symbol: string, market: string): any | undefined {
    return intradayCache.get(`intraday:${symbol}:${market}`);
  }

  /**
   * 设置分时数据缓存
   */
  static setIntradayCache(symbol: string, market: string, data: any): void {
    intradayCache.set(`intraday:${symbol}:${market}`, data);
    console.log(`[Cache] Cached intraday data for: ${symbol} (${market})`);
  }

  /**
   * 获取K线数据缓存
   */
  static getKlineCache(symbol: string, interval: string, range: string): any | undefined {
    return klineCache.get(`kline:${symbol}:${interval}:${range}`);
  }

  /**
   * 设置K线数据缓存
   */
  static setKlineCache(symbol: string, interval: string, range: string, data: any): void {
    klineCache.set(`kline:${symbol}:${interval}:${range}`, data);
    console.log(`[Cache] Cached kline data for: ${symbol} (${interval}, ${range})`);
  }

  /**
   * 获取技术指标缓存
   */
  static getIndicatorCache(symbol: string, indicator: string): any | undefined {
    return indicatorCache.get(`indicator:${symbol}:${indicator}`);
  }

  /**
   * 设置技术指标缓存
   */
  static setIndicatorCache(symbol: string, indicator: string, data: any): void {
    indicatorCache.set(`indicator:${symbol}:${indicator}`, data);
    console.log(`[Cache] Cached indicator data for: ${symbol} (${indicator})`);
  }

  /**
   * 清除所有缓存
   */
  static clearAll(): void {
    searchCache.flushAll();
    intradayCache.flushAll();
    klineCache.flushAll();
    indicatorCache.flushAll();
    console.log('[Cache] All caches cleared');
  }

  /**
   * 获取缓存统计信息
   */
  static getStats() {
    return {
      search: searchCache.getStats(),
      intraday: intradayCache.getStats(),
      kline: klineCache.getStats(),
      indicator: indicatorCache.getStats(),
    };
  }
}
