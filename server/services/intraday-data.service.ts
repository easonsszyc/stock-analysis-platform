/**
 * 分时数据服务
 * 获取股票的分时数据（1分钟级别）
 */
import * as iconv from 'iconv-lite';

export interface IntradayDataPoint {
  time: string; // 格式：HH:mm
  price: number;
  volume: number;
  amount: number;
}

export interface IntradayData {
  symbol: string;
  date: string;
  data: IntradayDataPoint[];
}

/**
 * 将股票代码转换为腾讯财经API格式
 */
function convertToTencentSymbol(symbol: string, market: 'US' | 'HK' | 'CN'): string {
  if (market === 'US') {
    return `us${symbol}`;
  } else if (market === 'HK') {
    // 港股代码需要补齐到5位
    const paddedSymbol = symbol.padStart(5, '0');
    return `hk${paddedSymbol}`;
  } else {
    // A股需要判断上海还是深圳
    if (symbol.startsWith('6')) {
      return `sh${symbol}`;
    } else {
      return `sz${symbol}`;
    }
  }
}

/**
 * 解析分时数据
 * 数据格式：["0930 1437.00 10746 1544677000.00", ...]
 */
function parseIntradayData(rawData: string[]): IntradayDataPoint[] {
  return rawData.map(line => {
    const parts = line.split(' ');
    const time = parts[0];
    const formattedTime = `${time.substring(0, 2)}:${time.substring(2, 4)}`;
    
    return {
      time: formattedTime,
      price: parseFloat(parts[1]) || 0,
      volume: parseInt(parts[2]) || 0,
      amount: parseFloat(parts[3]) || 0,
    };
  });
}

/**
 * 获取分时数据
 */
export async function getIntradayData(
  symbol: string,
  market: 'US' | 'HK' | 'CN'
): Promise<IntradayData | null> {
  try {
    const tencentSymbol = convertToTencentSymbol(symbol, market);
    const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${tencentSymbol}`;
    
    console.log('Fetching intraday data from:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 腾讯财经API返回GBK编码，需要转换为UTF-8
    const buffer = await response.arrayBuffer();
    const rawText = iconv.decode(Buffer.from(buffer), 'gbk');
    const jsonData = JSON.parse(rawText);
    
    if (jsonData.code !== 0) {
      throw new Error(`API error: ${jsonData.msg}`);
    }

    const stockData = jsonData.data[tencentSymbol];
    if (!stockData || !stockData.data || !stockData.data.data) {
      throw new Error('No intraday data available');
    }

    const dataPoints = parseIntradayData(stockData.data.data);
    
    return {
      symbol,
      date: stockData.data.date || new Date().toISOString().split('T')[0],
      data: dataPoints,
    };
  } catch (error) {
    console.error('Error fetching intraday data:', error);
    return null;
  }
}
