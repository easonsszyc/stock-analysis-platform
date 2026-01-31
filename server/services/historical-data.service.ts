/**
 * 历史数据服务
 * 获取股票的历史K线数据用于回测
 * 
 * 数据源：
 * - A股/港股：腾讯财经API
 * - 美股：Yahoo Finance API
 */

import { callDataApi } from '../_core/dataApi';

export interface HistoricalBar {
  date: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * 获取历史K线数据
 * @param symbol 股票代码
 * @param market 市场类型（CN/HK/US）
 * @param startDate 开始日期（YYYY-MM-DD）
 * @param endDate 结束日期（YYYY-MM-DD）
 * @param interval 时间间隔（1m/5m/15m/30m/60m/1d）
 * @returns 历史K线数据数组
 */
export async function getHistoricalData(
  symbol: string,
  market: string,
  startDate: string,
  endDate: string,
  interval: string = '1d'
): Promise<HistoricalBar[]> {
  try {
    if (market === 'US') {
      // 美股：使用Yahoo Finance API
      return await getYahooFinanceHistoricalData(symbol, startDate, endDate, interval);
    } else {
      // A股/港股：使用腾讯财经API
      return await getTencentHistoricalData(symbol, market, startDate, endDate, interval);
    }
  } catch (error) {
    console.error('Error fetching historical data:', error);
    throw new Error(`Failed to fetch historical data for ${symbol}`);
  }
}

/**
 * 使用Yahoo Finance API获取美股历史数据
 */
async function getYahooFinanceHistoricalData(
  symbol: string,
  startDate: string,
  endDate: string,
  interval: string
): Promise<HistoricalBar[]> {
  try {
    // 将日期转换为Unix时间戳
    const period1 = Math.floor(new Date(startDate).getTime() / 1000);
    const period2 = Math.floor(new Date(endDate).getTime() / 1000);
    
    // 映射interval格式（1d -> 1d, 1m -> 1m）
    const yahooInterval = interval;
    
    // 调用Yahoo Finance API
    const response = await callDataApi('YahooFinance/get_stock_chart', {
      query: {
        symbol: symbol,
        region: 'US',
        interval: yahooInterval,
        period1: period1.toString(),
        period2: period2.toString(),
        events: 'div,split',
      },
    }) as any;
    
    if (!response || !response.chart || !response.chart.result || response.chart.result.length === 0) {
      throw new Error('No data returned from Yahoo Finance API');
    }
    
    const result = response.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    
    const bars: HistoricalBar[] = [];
    
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const date = new Date(timestamp * 1000);
      
      // 跳过无效数据
      if (!quotes.open?.[i] || !quotes.high?.[i] || !quotes.low?.[i] || !quotes.close?.[i]) {
        continue;
      }
      
      bars.push({
        date: date.toISOString().split('T')[0],
        time: date.toTimeString().split(' ')[0],
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume?.[i] || 0,
      });
    }
    
    return bars;
  } catch (error) {
    console.error('Error fetching Yahoo Finance historical data:', error);
    throw error;
  }
}

/**
 * 使用腾讯财经API获取A股/港股历史数据
 */
async function getTencentHistoricalData(
  symbol: string,
  market: string,
  startDate: string,
  endDate: string,
  interval: string
): Promise<HistoricalBar[]> {
  try {
    // 转换股票代码格式
    let tencentSymbol = symbol;
    if (market === 'CN') {
      // A股：600519 -> sh600519 或 000001 -> sz000001
      if (symbol.startsWith('6')) {
        tencentSymbol = 'sh' + symbol;
      } else {
        tencentSymbol = 'sz' + symbol;
      }
    } else if (market === 'HK') {
      // 港股：9988 -> hk09988
      tencentSymbol = 'hk' + symbol.padStart(5, '0');
    }
    
    // 腾讯API的interval映射
    // 1m -> m1, 5m -> m5, 15m -> m15, 30m -> m30, 60m -> m60, 1d -> day
    let tencentInterval = 'day';
    if (interval === '1m') tencentInterval = 'm1';
    else if (interval === '5m') tencentInterval = 'm5';
    else if (interval === '15m') tencentInterval = 'm15';
    else if (interval === '30m') tencentInterval = 'm30';
    else if (interval === '60m') tencentInterval = 'm60';
    else if (interval === '1d') tencentInterval = 'day';
    
    // 调用腾讯财经API
    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tencentSymbol},${tencentInterval},${startDate},${endDate},500,qfq`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://gu.qq.com/',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Tencent API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.data || !data.data[tencentSymbol]) {
      throw new Error('No data returned from Tencent API');
    }
    
    const klineData = data.data[tencentSymbol];
    const klines = klineData[tencentInterval] || klineData.day || [];
    
    const bars: HistoricalBar[] = [];
    
    for (const kline of klines) {
      // 腾讯API返回格式：[日期, 开盘, 收盘, 最高, 最低, 成交量]
      const [dateStr, open, close, high, low, volume] = kline;
      
      // 解析日期时间
      let date: string;
      let time: string;
      
      if (tencentInterval === 'day') {
        // 日线：2026-01-15
        date = dateStr;
        time = '15:00:00';
      } else {
        // 分钟线：202601151030
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = dateStr.substring(8, 10);
        const minute = dateStr.substring(10, 12);
        
        date = `${year}-${month}-${day}`;
        time = `${hour}:${minute}:00`;
      }
      
      bars.push({
        date,
        time,
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseInt(volume),
      });
    }
    
    return bars;
  } catch (error) {
    console.error('Error fetching Tencent historical data:', error);
    throw error;
  }
}

/**
 * 判断市场类型
 */
export function detectMarket(symbol: string): string {
  // 美股：字母开头
  if (/^[A-Z]+$/.test(symbol)) {
    return 'US';
  }
  
  // 港股：1-5位数字
  if (/^\d{1,5}$/.test(symbol) && parseInt(symbol) < 10000) {
    return 'HK';
  }
  
  // A股：6位数字
  if (/^\d{6}$/.test(symbol)) {
    return 'CN';
  }
  
  return 'US'; // 默认美股
}
