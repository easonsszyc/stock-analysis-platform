import type { StockInfo, PriceDataPoint, MarketType } from '../../shared/stock-types';

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
      // 动态导入API客户端（仅在Node.js环境中）
      if (typeof require !== 'undefined') {
        const apiPath = '/opt/.manus/.sandbox-runtime';
        const { ApiClient } = require(apiPath + '/data_api');
        this.apiClient = new ApiClient();
      }
    } catch (error) {
      console.error('Failed to initialize API client:', error);
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
   */
  async getStockData(
    symbol: string,
    market: MarketType,
    period: string = '1y'
  ): Promise<{ stockInfo: StockInfo; priceData: PriceDataPoint[] }> {
    const apiClient = await this.getApiClient();
    if (!apiClient) {
      throw new Error('API client not initialized');
    }

    const formattedSymbol = this.formatSymbol(symbol, market);
    const region = market === 'CN' ? 'CN' : market === 'HK' ? 'HK' : 'US';

    try {
      const response = await apiClient.call_api('YahooFinance/get_stock_chart', {
        query: {
          symbol: formattedSymbol,
          region: region,
          interval: '1d',
          range: period,
          includeAdjustedClose: true,
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

      // 构建股票基本信息
      const stockInfo: StockInfo = {
        symbol: formattedSymbol,
        name: meta.longName || meta.symbol,
        market: market,
        currency: meta.currency,
        exchange: meta.exchangeName,
        currentPrice: meta.regularMarketPrice,
        previousClose: meta.previousClose,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
        volume: meta.regularMarketVolume
      };

      // 构建价格数据
      const priceData: PriceDataPoint[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (quotes.close[i] !== null && quotes.close[i] !== undefined) {
          priceData.push({
            date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
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
      console.error('Error fetching stock data:', error);
      throw new Error(`Failed to fetch stock data: ${error.message}`);
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
