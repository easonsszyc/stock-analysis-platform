import type { 
  MarketType, 
  StockInfo, 
  PriceDataPoint, 
  StockComparison
} from '../../shared/stock-types';

type PerformanceMetrics = {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
};
import { stockDataService } from './stock-data.service';

class StockComparisonService {
  /**
   * 对比多只股票
   */
  async compareStocks(
    symbols: string[],
    market: MarketType,
    period: string = '1y'
  ): Promise<StockComparison> {
    // 获取所有股票的数据
    const stocksData = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const data = await stockDataService.getStockData(symbol, market, period);
          return { symbol, ...data };
        } catch (error) {
          console.error(`Failed to fetch data for ${symbol}:`, error);
          return null;
        }
      })
    );

    // 过滤掉获取失败的股票
    const validStocks = stocksData.filter((s): s is NonNullable<typeof s> => s !== null);

    if (validStocks.length < 2) {
      throw new Error('至少需要2只股票的有效数据');
    }

    // 提取股票信息和价格数据
    const stocks: StockInfo[] = validStocks.map(s => s.stockInfo);
    const priceData: Record<string, PriceDataPoint[]> = {};
    validStocks.forEach(s => {
      priceData[s.symbol] = s.priceData;
    });

    // 计算相对强度（以第一只股票为基准）
    const relativeStrength = this.calculateRelativeStrength(priceData);

    // 计算涨跌幅
    const performance = this.calculatePerformance(priceData);

    // 计算相关性
    const correlation = this.calculateCorrelation(priceData);

    return {
      stocks,
      priceData,
      relativeStrength,
      performance,
      correlation
    };
  }

  /**
   * 计算相对强度（归一化到100）
   */
  private calculateRelativeStrength(priceData: Record<string, PriceDataPoint[]>): Record<string, number> {
    const symbols = Object.keys(priceData);
    const result: Record<string, number> = {};

    if (symbols.length === 0) return result;

    // 计算每只股票的涨跌幅
    symbols.forEach(symbol => {
      const data = priceData[symbol];
      if (data.length < 2) {
        result[symbol] = 100;
        return;
      }

      const firstPrice = data[0].close;
      const lastPrice = data[data.length - 1].close;
      const change = ((lastPrice - firstPrice) / firstPrice) * 100;
      
      result[symbol] = 100 + change;
    });

    return result;
  }

  /**
   * 计算涨跌幅（日、周、月、年）
   */
  private calculatePerformance(priceData: Record<string, PriceDataPoint[]>): Record<string, PerformanceMetrics> {
    const symbols = Object.keys(priceData);
    const result: Record<string, PerformanceMetrics> = {};

    symbols.forEach(symbol => {
      const data = priceData[symbol];
      if (data.length === 0) {
        result[symbol] = { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
        return;
      }

      const currentPrice = data[data.length - 1].close;
      
      // 日涨跌
      const dailyPrice = data.length >= 2 ? data[data.length - 2].close : currentPrice;
      const daily = ((currentPrice - dailyPrice) / dailyPrice) * 100;

      // 周涨跌（5个交易日）
      const weeklyIndex = Math.max(0, data.length - 6);
      const weeklyPrice = data[weeklyIndex].close;
      const weekly = ((currentPrice - weeklyPrice) / weeklyPrice) * 100;

      // 月涨跌（20个交易日）
      const monthlyIndex = Math.max(0, data.length - 21);
      const monthlyPrice = data[monthlyIndex].close;
      const monthly = ((currentPrice - monthlyPrice) / monthlyPrice) * 100;

      // 年涨跌
      const yearlyPrice = data[0].close;
      const yearly = ((currentPrice - yearlyPrice) / yearlyPrice) * 100;

      result[symbol] = { daily, weekly, monthly, yearly };
    });

    return result;
  }

  /**
   * 计算股票之间的相关系数
   */
  private calculateCorrelation(priceData: Record<string, PriceDataPoint[]>): Record<string, Record<string, number>> {
    const symbols = Object.keys(priceData);
    const result: Record<string, Record<string, number>> = {};

    // 初始化结果矩阵
    symbols.forEach(symbol1 => {
      result[symbol1] = {};
      symbols.forEach(symbol2 => {
        if (symbol1 === symbol2) {
          result[symbol1][symbol2] = 1.0;
        }
      });
    });

    // 计算每对股票之间的相关系数
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const symbol1 = symbols[i];
        const symbol2 = symbols[j];
        
        const corr = this.calculatePearsonCorrelation(
          priceData[symbol1],
          priceData[symbol2]
        );

        result[symbol1][symbol2] = corr;
        result[symbol2][symbol1] = corr;
      }
    }

    return result;
  }

  /**
   * 计算皮尔逊相关系数
   */
  private calculatePearsonCorrelation(data1: PriceDataPoint[], data2: PriceDataPoint[]): number {
    // 找到共同的日期范围
    const minLength = Math.min(data1.length, data2.length);
    if (minLength < 2) return 0;

    // 使用最近的数据点
    const prices1 = data1.slice(-minLength).map(d => d.close);
    const prices2 = data2.slice(-minLength).map(d => d.close);

    // 计算收益率
    const returns1 = this.calculateReturns(prices1);
    const returns2 = this.calculateReturns(prices2);

    if (returns1.length === 0) return 0;

    // 计算均值
    const mean1 = returns1.reduce((a, b) => a + b, 0) / returns1.length;
    const mean2 = returns2.reduce((a, b) => a + b, 0) / returns2.length;

    // 计算协方差和标准差
    let covariance = 0;
    let variance1 = 0;
    let variance2 = 0;

    for (let i = 0; i < returns1.length; i++) {
      const diff1 = returns1[i] - mean1;
      const diff2 = returns2[i] - mean2;
      covariance += diff1 * diff2;
      variance1 += diff1 * diff1;
      variance2 += diff2 * diff2;
    }

    const stdDev1 = Math.sqrt(variance1);
    const stdDev2 = Math.sqrt(variance2);

    if (stdDev1 === 0 || stdDev2 === 0) return 0;

    return covariance / (stdDev1 * stdDev2);
  }

  /**
   * 计算收益率序列
   */
  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] !== 0) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
    }
    return returns;
  }
}

export const stockComparisonService = new StockComparisonService();
