/**
 * Yahoo Finance分时数据服务
 * 专门用于获取美股的实时分时数据
 */
import { callDataApi } from '../_core/dataApi';
import { IntradayData, IntradayDataPoint } from './intraday-data.service';

/**
 * 使用Yahoo Finance API获取美股分时数据
 */
export async function getUSIntradayDataFromYahoo(
  symbol: string
): Promise<IntradayData | null> {
  try {
    console.log(`[YahooFinance] Fetching intraday data for: ${symbol}`);
    
    // 调用Yahoo Finance API获取1分钟级别的数据
    const response = await callDataApi('YahooFinance/get_stock_chart', {
      query: {
        symbol,
        region: 'US',
        interval: '1m',  // 1分钟级别
        range: '1d',     // 当天数据
      },
    });
    
    const data = response as any;
    if (!data || !data.chart || !data.chart.result || data.chart.result.length === 0) {
      console.error('[YahooFinance] No data returned');
      return null;
    }
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0];
    
    if (!quotes || !timestamps || timestamps.length === 0) {
      console.error('[YahooFinance] Invalid data structure');
      return null;
    }
    
    // 转换为IntradayDataPoint格式
    const dataPoints: IntradayDataPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const price = quotes.close?.[i];
      const volume = quotes.volume?.[i];
      
      if (price != null && volume != null) {
        // 转换时间戳为HH:mm格式（美东时间）
        const date = new Date(timestamps[i] * 1000);
        // 使用toLocaleString自动处理美东时区（包括夏令时/冬令时）
        const etTimeStr = date.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const time = etTimeStr.replace(/^(\d{2}):(\d{2})$/, '$1:$2');
        
        dataPoints.push({
          time,
          price,
          volume,
          amount: price * volume, // 估算成交额
        });
      }
    }
    
    console.log(`[YahooFinance] Retrieved ${dataPoints.length} data points for ${symbol}`);
    
    // 获取数据的实际日期（从第一个时间戳提取）
    const dataDate = timestamps.length > 0 
      ? new Date(timestamps[0] * 1000).toLocaleDateString('zh-CN', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : new Date().toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
    
    return {
      symbol,
      date: dataDate,
      data: dataPoints,
    };
  } catch (error) {
    console.error('[YahooFinance] Error fetching intraday data:', error);
    return null;
  }
}
