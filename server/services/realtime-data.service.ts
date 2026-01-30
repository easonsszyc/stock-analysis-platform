/**
 * 实时股票数据服务
 * 使用腾讯财经API获取实时行情数据
 */
import * as iconv from 'iconv-lite';
import { getUSMarketStatus } from '../utils/market-status';

interface RealtimeQuote {
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: string;
  currency: string;
  market: 'US' | 'HK' | 'CN';
  sessionLabel?: string; // 交易时段标签（仅美股）
}

/**
 * 解析腾讯财经API返回的数据
 * 数据格式：v_symbol="字段1~字段2~字段3~..."
 */
function parseTencentData(rawData: string, originalSymbol: string): RealtimeQuote | null {
  try {
    // 提取数据部分
    const match = rawData.match(/="([^"]+)"/);
    if (!match) {
      console.error('Failed to extract data from response');
      return null;
    }

    const fields = match[1].split('~');
    
    // 判断市场类型
    let market: 'US' | 'HK' | 'CN' = 'CN';
    if (originalSymbol.startsWith('us')) {
      market = 'US';
    } else if (originalSymbol.startsWith('hk')) {
      market = 'HK';
    } else if (originalSymbol.startsWith('sh') || originalSymbol.startsWith('sz')) {
      market = 'CN';
    }

    // 根据市场类型解析不同的字段位置
    if (market === 'US') {
      // 美股字段位置（测试验证后的正确映射）
      const currentPrice = parseFloat(fields[3]) || 0;
      const previousClose = parseFloat(fields[4]) || 0;
      const change = parseFloat(fields[31]) || 0;
      const changePercent = parseFloat(fields[32]) || 0;
      
      // 获取美股交易时段标签
      const marketStatus = getUSMarketStatus();
      
      return {
        symbol: fields[2] || originalSymbol,
        name: fields[1] || '',
        currentPrice,
        previousClose,
        open: parseFloat(fields[5]) || 0,
        high: parseFloat(fields[33]) || 0,
        low: parseFloat(fields[34]) || 0,
        volume: parseInt(fields[6]) || 0,
        change,
        changePercent,
        timestamp: fields[30] || '',
        currency: fields[35] || 'USD',
        market: 'US',
        sessionLabel: marketStatus.sessionLabel,
      };
    } else if (market === 'HK') {
      // 港股字段位置
      return {
        symbol: fields[2] || originalSymbol,
        name: fields[1] || '',
        currentPrice: parseFloat(fields[3]) || 0,
        previousClose: parseFloat(fields[4]) || 0,
        open: parseFloat(fields[5]) || 0,
        high: parseFloat(fields[33]) || 0,
        low: parseFloat(fields[34]) || 0,
        volume: parseFloat(fields[6]) || 0,
        change: parseFloat(fields[31]) || 0,
        changePercent: parseFloat(fields[32]) || 0,
        timestamp: fields[30] || '',
        currency: fields[47] || 'HKD',
        market: 'HK',
      };
    } else {
      // A股字段位置
      return {
        symbol: fields[2] || originalSymbol,
        name: fields[1] || '',
        currentPrice: parseFloat(fields[3]) || 0,
        previousClose: parseFloat(fields[4]) || 0,
        open: parseFloat(fields[5]) || 0,
        high: parseFloat(fields[33]) || 0,
        low: parseFloat(fields[34]) || 0,
        volume: parseInt(fields[6]) || 0,
        change: parseFloat(fields[31]) || 0,
        changePercent: parseFloat(fields[32]) || 0,
        timestamp: fields[30] || '',
        currency: 'CNY',
        market: 'CN',
      };
    }
  } catch (error) {
    console.error('Error parsing Tencent data:', error);
    return null;
  }
}

/**
 * 将股票代码转换为腾讯财经API格式
 */
function convertToTencentSymbol(symbol: string, market: string): string {
  // 移除可能存在的后缀
  const cleanSymbol = symbol.replace(/\.(HK|SS|SZ)$/i, '');
  
  if (market === 'US') {
    return `us${cleanSymbol}`;
  } else if (market === 'HK') {
    // 港股需要补齐到5位数字
    const paddedSymbol = cleanSymbol.padStart(5, '0');
    return `hk${paddedSymbol}`;
  } else if (market === 'CN') {
    // A股需要添加交易所前缀
    if (cleanSymbol.startsWith('6')) {
      return `sh${cleanSymbol}`; // 上海
    } else {
      return `sz${cleanSymbol}`; // 深圳
    }
  }
  
  return cleanSymbol;
}

/**
 * 获取实时股票报价
 */
export async function getRealtimeQuote(
  symbol: string,
  market: string
): Promise<RealtimeQuote | null> {
  try {
    const tencentSymbol = convertToTencentSymbol(symbol, market);
    const url = `https://qt.gtimg.cn/q=${tencentSymbol}`;
    
    console.log('Fetching realtime data from:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 腾讯财经API返回GBK编码，需要转换为UTF-8
    const buffer = await response.arrayBuffer();
    const rawData = iconv.decode(Buffer.from(buffer), 'gbk');
    console.log(`Received data: ${rawData.substring(0, 200)}...`);
    
    const quote = parseTencentData(rawData, tencentSymbol);
    
    if (!quote) {
      throw new Error('Failed to parse realtime data');
    }
    
    return quote;
  } catch (error) {
    console.error('Error fetching realtime quote:', error);
    return null;
  }
}

/**
 * 批量获取实时报价
 */
export async function getBatchRealtimeQuotes(
  symbols: Array<{ symbol: string; market: string }>
): Promise<RealtimeQuote[]> {
  try {
    // 转换所有股票代码
    const tencentSymbols = symbols.map(({ symbol, market }) =>
      convertToTencentSymbol(symbol, market)
    );
    
    // 腾讯API支持批量查询，用逗号分隔
    const url = `https://qt.gtimg.cn/q=${tencentSymbols.join(',')}`;
    
    console.log(`Fetching batch realtime data from: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const rawData = await response.text();
    
    // 分割多个股票的数据
    const lines = rawData.trim().split('\n');
    const quotes: RealtimeQuote[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const quote = parseTencentData(lines[i], tencentSymbols[i]);
      if (quote) {
        quotes.push(quote);
      }
    }
    
    return quotes;
  } catch (error) {
    console.error('Error fetching batch realtime quotes:', error);
    return [];
  }
}
