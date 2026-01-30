/**
 * 腾讯财经API股票搜索服务
 * 作为Yahoo Finance API的备用数据源
 */
import * as iconv from 'iconv-lite';

export interface TencentSearchResult {
  symbol: string;
  name: string;
  market: 'US' | 'HK' | 'CN';
  exchange: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
}

/**
 * 将用户输入的股票代码转换为腾讯财经API格式
 */
function convertToTencentSymbol(input: string): string[] {
  const upperInput = input.toUpperCase().trim();
  
  // 美股：直接使用代码
  if (/^[A-Z]{1,5}$/.test(upperInput)) {
    return [`us${upperInput.toLowerCase()}`];
  }
  
  // 港股：1-5位数字
  if (/^\d{1,5}$/.test(upperInput)) {
    const paddedCode = upperInput.padStart(5, '0');
    return [`hk${paddedCode}`];
  }
  
  // A股：6位数字
  if (/^\d{6}$/.test(upperInput)) {
    // 尝试沪市和深市
    return [`sh${upperInput}`, `sz${upperInput}`];
  }
  
  // 带后缀的格式
  if (upperInput.includes('.')) {
    const [code, suffix] = upperInput.split('.');
    if (suffix === 'HK') {
      const paddedCode = code.padStart(5, '0');
      return [`hk${paddedCode}`];
    } else if (suffix === 'SS') {
      return [`sh${code}`];
    } else if (suffix === 'SZ') {
      return [`sz${code}`];
    }
  }
  
  return [];
}

/**
 * 解析市场类型
 */
function parseMarket(tencentSymbol: string): 'US' | 'HK' | 'CN' {
  if (tencentSymbol.startsWith('us')) return 'US';
  if (tencentSymbol.startsWith('hk')) return 'HK';
  return 'CN';
}

/**
 * 解析交易所
 */
function parseExchange(tencentSymbol: string): string {
  if (tencentSymbol.startsWith('us')) return 'NASDAQ/NYSE';
  if (tencentSymbol.startsWith('hk')) return 'HKEX';
  if (tencentSymbol.startsWith('sh')) return 'SSE';
  if (tencentSymbol.startsWith('sz')) return 'SZSE';
  return 'Unknown';
}

/**
 * 使用腾讯财经API搜索股票
 */
export async function searchStockByTencent(query: string): Promise<TencentSearchResult[]> {
  try {
    console.log(`[TencentSearch] Searching for: ${query}`);
    
    const tencentSymbols = convertToTencentSymbol(query);
    if (tencentSymbols.length === 0) {
      console.log('[TencentSearch] Invalid query format');
      return [];
    }
    
    const results: TencentSearchResult[] = [];
    
    for (const tencentSymbol of tencentSymbols) {
      try {
        // 使用腾讯财经API获取股票信息
        const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tencentSymbol},day,,,1,qfq`;
        console.log(`[TencentSearch] Fetching from: ${url}`);
        
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const text = iconv.decode(Buffer.from(buffer), 'gbk');
        const data = JSON.parse(text);
        
        if (data.code === 0 && data.data && data.data[tencentSymbol]) {
          const stockData = data.data[tencentSymbol];
          
          // 提取股票代码（移除前缀）
          const symbol = tencentSymbol.substring(2);
          const market = parseMarket(tencentSymbol);
          const exchange = parseExchange(tencentSymbol);
          
          // 获取最新价格数据
          let currentPrice: number | undefined;
          let change: number | undefined;
          let changePercent: number | undefined;
          
          if (stockData.day && stockData.day.length > 0) {
            const latestDay = stockData.day[stockData.day.length - 1];
            if (latestDay && latestDay.length >= 5) {
              currentPrice = parseFloat(latestDay[2]); // 收盘价
              if (stockData.day.length >= 2) {
                const prevDay = stockData.day[stockData.day.length - 2];
                if (prevDay && prevDay.length >= 5) {
                  const prevClose = parseFloat(prevDay[2]);
                  change = currentPrice - prevClose;
                  changePercent = (change / prevClose) * 100;
                }
              }
            }
          }
          
          results.push({
            symbol,
            name: stockData.name || symbol,
            market,
            exchange,
            currentPrice,
            change,
            changePercent,
          });
          
          console.log(`[TencentSearch] Found: ${stockData.name} (${symbol})`);
        }
      } catch (error) {
        console.error(`[TencentSearch] Error fetching ${tencentSymbol}:`, error);
      }
    }
    
    console.log(`[TencentSearch] Total results: ${results.length}`);
    return results;
  } catch (error) {
    console.error('[TencentSearch] Search error:', error);
    return [];
  }
}
