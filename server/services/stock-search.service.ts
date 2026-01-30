import { callDataApi } from '../_core/dataApi';

export interface StockSearchResult {
  symbol: string;
  name: string;
  nameCn?: string;
  exchange: string;
  market: 'US' | 'HK' | 'CN';
  currency: string;
}

export class StockSearchService {
  /**
   * 智能搜索股票 - 自动识别市场并返回候选列表
   */
  async searchStock(query: string): Promise<StockSearchResult[]> {
    const candidates: StockSearchResult[] = [];
    
    // 清理输入
    const cleanQuery = query.trim().toUpperCase();
    
    // 策略1: 如果是纯数字，尝试港股
    if (/^\d+$/.test(cleanQuery)) {
      const hkResult = await this.tryFetchStock(`${cleanQuery}.HK`, 'HK');
      if (hkResult) candidates.push(hkResult);
      
      // 也尝试A股（上海）
      const shResult = await this.tryFetchStock(`${cleanQuery}.SS`, 'CN');
      if (shResult) candidates.push(shResult);
      
      // 尝试A股（深圳）
      const szResult = await this.tryFetchStock(`${cleanQuery}.SZ`, 'CN');
      if (szResult) candidates.push(szResult);
    }
    
    // 策略2: 如果包含字母，优先尝试美股
    else if (/^[A-Z]+$/.test(cleanQuery)) {
      const usResult = await this.tryFetchStock(cleanQuery, 'US');
      if (usResult) candidates.push(usResult);
    }
    
    // 策略3: 如果已经包含后缀，直接解析
    else if (cleanQuery.includes('.')) {
      const market = this.detectMarketFromSuffix(cleanQuery);
      const result = await this.tryFetchStock(cleanQuery, market);
      if (result) candidates.push(result);
    }
    
    // 如果没有找到任何候选，尝试所有市场
    if (candidates.length === 0) {
      const usResult = await this.tryFetchStock(cleanQuery, 'US');
      if (usResult) candidates.push(usResult);
      
      const hkResult = await this.tryFetchStock(`${cleanQuery}.HK`, 'HK');
      if (hkResult) candidates.push(hkResult);
      
      const shResult = await this.tryFetchStock(`${cleanQuery}.SS`, 'CN');
      if (shResult) candidates.push(shResult);
      
      const szResult = await this.tryFetchStock(`${cleanQuery}.SZ`, 'CN');
      if (szResult) candidates.push(szResult);
    }
    
    return candidates;
  }

  /**
   * 尝试获取股票信息
   */
  private async tryFetchStock(symbol: string, market: 'US' | 'HK' | 'CN'): Promise<StockSearchResult | null> {
    try {
      const region = market === 'CN' ? 'CN' : market === 'HK' ? 'HK' : 'US';
      
      const response: any = await callDataApi('YahooFinance/get_stock_chart', {
        query: {
          symbol: symbol,
          region: region,
          interval: '1d',
          range: '5d',
          includeAdjustedClose: 'true'
        }
      });

      if (!response || !response.chart || !response.chart.result || response.chart.result.length === 0) {
        return null;
      }

      const result = response.chart.result[0];
      const meta = result.meta;

      return {
        symbol: meta.symbol,
        name: meta.longName || meta.shortName || symbol,
        nameCn: this.getChineseName(meta.longName, meta.shortName),
        exchange: meta.exchangeName,
        market: market,
        currency: meta.currency
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 从后缀检测市场
   */
  private detectMarketFromSuffix(symbol: string): 'US' | 'HK' | 'CN' {
    if (symbol.endsWith('.HK')) return 'HK';
    if (symbol.endsWith('.SS') || symbol.endsWith('.SZ')) return 'CN';
    return 'US';
  }

  /**
   * 获取中文名称（简单映射，实际应该从数据库或API获取）
   */
  private getChineseName(longName?: string, shortName?: string): string | undefined {
    const name = longName || shortName || '';
    
    // 常见公司的中文名称映射
    const nameMap: Record<string, string> = {
      'Apple Inc.': '苹果公司',
      'Microsoft Corporation': '微软公司',
      'Alphabet Inc.': '谷歌',
      'Amazon.com, Inc.': '亚马逊',
      'Tesla, Inc.': '特斯拉',
      'Meta Platforms, Inc.': 'Meta平台',
      'NVIDIA Corporation': '英伟达',
      '3SBio Inc.': '三生制药',
      'Tencent Holdings Limited': '腾讯控股',
      'Alibaba Group Holding Limited': '阿里巴巴',
      'Meituan': '美团',
      'JD.com, Inc.': '京东',
      'Baidu, Inc.': '百度',
      'NetEase, Inc.': '网易',
      'Xiaomi Corporation': '小米集团',
      'BYD Company Limited': '比亚迪',
      'CATL': '宁德时代',
      'Kweichow Moutai Co., Ltd.': '贵州茅台'
    };

    // 尝试精确匹配
    if (nameMap[name]) {
      return nameMap[name];
    }

    // 尝试部分匹配
    for (const [key, value] of Object.entries(nameMap)) {
      if (name.includes(key) || key.includes(name)) {
        return value;
      }
    }

    return undefined;
  }
}

export const stockSearchService = new StockSearchService();
