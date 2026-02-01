import type { StockInfo, PriceDataPoint, MarketType, TimeRange, Interval } from '../../shared/stock-types';
import { getDisplayName } from '../data/stock-names-zh.js';

// 数据API客户端（使用Manus提供的API）
class StockDataService {
  private apiClient: any;

  constructor() {
    // API客户端将在第一次调用时初始化
    this.apiClient = null;
  }

  private async getApiClient() {
    if (this.apiClient) return this.apiClient;

    try {
      // 使用项目内置的dataApi帮助函数
      const { callDataApi } = await import('../_core/dataApi.js');
      this.apiClient = { callDataApi };
    } catch (error) {
      console.error('Failed to initialize API client:', error);
      throw new Error('无法初始化股票数据API客户端');
    }

    return this.apiClient;
  }

  /**
   * 格式化股票代码以适配Yahoo Finance API
   */
  private formatSymbol(symbol: string, market: MarketType): string {
    // 移除空格和特殊字符
    symbol = symbol.trim().toUpperCase();

    // 根据市场类型添加后缀
    if (market === 'HK') {
      // 香港股票：如果是纯数字，添加.HK后缀
      if (/^\d+$/.test(symbol)) {
        return `${symbol}.HK`;
      }
      if (!symbol.endsWith('.HK')) {
        return `${symbol}.HK`;
      }
    } else if (market === 'CN') {
      // 中国大陆股票：上海(600xxx, 601xxx, 603xxx, 688xxx) -> .SS, 深圳(000xxx, 002xxx, 300xxx) -> .SZ
      if (/^\d{6}$/.test(symbol)) {
        if (symbol.startsWith('6') || symbol.startsWith('5')) {
          return `${symbol}.SS`;
        } else {
          return `${symbol}.SZ`;
        }
      }
      // 如果已经有后缀，保持不变
      if (symbol.endsWith('.SS') || symbol.endsWith('.SZ')) {
        return symbol;
      }
    }
    // 美股不需要特殊处理
    return symbol;
  }

  /**
   * 获取股票历史数据
   * 策略：
   * - CN/HK: 优先东方财富(EastMoney) -> 降级腾讯API -> 降级雅虎API
   * - US: 优先雅虎API -> 降级腾讯API
   */
  async getStockData(
    symbol: string,
    market: MarketType,
    range: TimeRange = '1y',
    interval: Interval = '1d'
  ): Promise<{ stockInfo: StockInfo; priceData: PriceDataPoint[] }> {
    if (market === 'CN' || market === 'HK') {
      // 1. Try EastMoney (Most stable for CN/HK)
      try {
        console.log(`[StockData] Using EastMoney API (Primary) for ${symbol}`);
        const { getStockDataFromEastMoney } = await import('./eastmoney-stock-data.service.js');
        return await getStockDataFromEastMoney(symbol, market, range, interval);
      } catch (emError: any) {
        console.warn(`[StockData] EastMoney API failed for ${symbol}, falling back to Tencent:`, emError.message);

        // 2. Try Tencent (Fallback)
        try {
          console.log(`[StockData] Using Tencent API (Fallback) for ${symbol}`);
          const { getStockDataFromTencent } = await import('./tencent-stock-data.service.js');
          return await getStockDataFromTencent(symbol, market, range, interval);
        } catch (tencentError: any) {
          console.warn(`[StockData] Tencent API failed for ${symbol}, falling back to Yahoo:`, tencentError.message);

          // 3. Try Yahoo (Last Resort)
          try {
            console.log(`[StockData] Using Yahoo API (Last Resort) for ${symbol}`);
            return await this.getStockDataFromYahoo(symbol, market, range, interval);
          } catch (yahooError: any) {
            throw new Error(`All APIs failed for ${symbol}. EastMoney: ${emError.message}, Tencent: ${tencentError.message}, Yahoo: ${yahooError.message}`);
          }
        }
      }
    } else {
      // US or others
      // US or others
      try {
        console.log(`[StockData] Using Yahoo API (Primary) for ${symbol}`);
        const result = await this.getStockDataFromYahoo(symbol, market, range, interval);
        // Safety check for empty data which Yahoo sometimes returns without error
        if (!result.priceData || result.priceData.length === 0) throw new Error('Yahoo returned empty data');
        return result;
      } catch (error: any) {
        console.warn(`[StockData] Yahoo Finance failed for ${symbol}, falling back to EastMoney:`, error.message);

        // 2. Try EastMoney (Secondary for US, often better than Tencent)
        try {
          console.log(`[StockData] Using EastMoney API (Fallback) for ${symbol}`);
          const { getStockDataFromEastMoney } = await import('./eastmoney-stock-data.service.js');
          return await getStockDataFromEastMoney(symbol, market, range, interval);
        } catch (emError: any) {
          console.warn(`[StockData] EastMoney API failed for ${symbol}, falling back to Tencent:`, emError.message);

          // 3. Try Tencent (Last Resort for US)
          try {
            console.log(`[StockData] Falling back to Tencent API for ${symbol}`);
            const { getStockDataFromTencent } = await import('./tencent-stock-data.service.js');
            return await getStockDataFromTencent(symbol, market, range, interval);
          } catch (tencentError: any) {
            throw new Error(`Failed to fetch stock data (Yahoo failed, EastMoney failed: ${emError.message}, Tencent failed: ${tencentError.message})`);
          }
        }
      }
    }
  }

  /**
   * 从 Yahoo Finance 获取数据 (Private)
   */
  private async getStockDataFromYahoo(
    symbol: string,
    market: MarketType,
    range: TimeRange = '1y',
    interval: Interval = '1d'
  ): Promise<{ stockInfo: StockInfo; priceData: PriceDataPoint[] }> {
    const apiClient = await this.getApiClient();
    if (!apiClient) {
      throw new Error('API client not initialized');
    }

    const formattedSymbol = this.formatSymbol(symbol, market);
    const region = market === 'CN' ? 'CN' : market === 'HK' ? 'HK' : 'US';

    try {
      const response = await apiClient.callDataApi('YahooFinance/get_stock_chart', {
        query: {
          symbol: formattedSymbol,
          region: region,
          interval: interval,
          range: range,
          events: 'div,split'
        }
      });

      if (!response || !response.chart || !response.chart.result || response.chart.result.length === 0) {
        throw new Error('No data found for this stock');
      }

      const result = response.chart.result[0];
      const meta = result.meta;
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];

      // 构建股票基本信息（优先使用中文名称）
      const displayName = getDisplayName(formattedSymbol, meta.longName, meta.shortName);

      const stockInfo: StockInfo = {
        symbol: formattedSymbol,
        name: displayName,
        market: market,
        currency: meta.currency,
        exchange: meta.exchangeName,
        currentPrice: meta.regularMarketPrice,
        previousClose: meta.previousClose,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
        volume: meta.regularMarketVolume
      };

      // Enrich with market status
      try {
        const { getUSMarketStatus, isCNMarketOpen, isHKMarketOpen } = await import('../utils/market-status.js');
        const now = new Date();

        if (market === 'US') {
          const usStatus = getUSMarketStatus();
          // Map US session to our types: 'OPEN' | 'CLOSED' | 'PRE' | 'POST'
          if (usStatus.session === 'regular') stockInfo.marketStatus = 'OPEN';
          else if (usStatus.session === 'premarket') stockInfo.marketStatus = 'PRE';
          else if (usStatus.session === 'afterhours') stockInfo.marketStatus = 'POST';
          else stockInfo.marketStatus = 'CLOSED';

          stockInfo.marketTime = now.toLocaleString('en-US', { timeZone: 'America/New_York' });

          // Yahoo often provides pre/post prices in meta if applicable
          // Checking meta for these fields
          if (meta.preMarketPrice) stockInfo.preMarketPrice = meta.preMarketPrice;
          if (meta.postMarketPrice) stockInfo.postMarketPrice = meta.postMarketPrice;

        } else if (market === 'HK') {
          stockInfo.marketStatus = isHKMarketOpen() ? 'OPEN' : 'CLOSED';
          stockInfo.marketTime = now.toLocaleString('zh-CN', { timeZone: 'Asia/Hong_Kong' });
        } else if (market === 'CN') {
          stockInfo.marketStatus = isCNMarketOpen() ? 'OPEN' : 'CLOSED';
          stockInfo.marketTime = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        }
      } catch (err) {
        console.warn('Failed to calculate market status', err);
      }

      // 构建价格数据
      const priceData: PriceDataPoint[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (quotes.close[i] !== null && quotes.close[i] !== undefined) {
          // Format date based on interval
          let dateStr: string;
          if (interval === '1d' || interval === '1wk' || interval === '1mo') {
            // Daily/Weekly/Monthly: YYYY-MM-DD
            dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
          } else {
            // Intraday: Include time. Format: YYYY-MM-DD HH:mm
            // Use market timezone
            const tz = market === 'US' ? 'America/New_York' : (market === 'HK' ? 'Asia/Hong_Kong' : 'Asia/Shanghai');
            dateStr = new Date(timestamps[i] * 1000).toLocaleString('sv-SE', { timeZone: tz }).slice(0, 16).replace('T', ' ');
          }

          priceData.push({
            date: dateStr,
            open: quotes.open[i] || quotes.close[i],
            high: quotes.high[i] || quotes.close[i],
            low: quotes.low[i] || quotes.close[i],
            close: quotes.close[i],
            volume: quotes.volume[i] || 0,
            adjClose: result.indicators.adjclose?.[0]?.adjclose?.[i]
          });
        }
      }

      return { stockInfo, priceData };
    } catch (error: any) {
      // Internal error rethrow (fallback handled by wrapper)
      throw error;
    }
  }

  /**
   * 搜索股票（简单实现，后续可以扩展）
   */
  async searchStock(query: string, market?: MarketType): Promise<StockInfo[]> {
    // 这里简化处理，直接尝试获取股票数据
    // 实际应用中可以使用专门的搜索API
    const results: StockInfo[] = [];

    const markets: MarketType[] = market ? [market] : ['US', 'HK', 'CN'];

    for (const mkt of markets) {
      try {
        const { stockInfo } = await this.getStockData(query, mkt, '5d');
        results.push(stockInfo);
        break; // 找到一个就返回
      } catch (error) {
        // 继续尝试下一个市场
        continue;
      }
    }

    return results;
  }
}

export const stockDataService = new StockDataService();
