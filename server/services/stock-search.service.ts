import { callDataApi } from '../_core/dataApi.js';
import { getDisplayName } from '../data/stock-names-zh.js';
import { CacheService } from './cache.service.js';
import { searchStockByTencent } from './tencent-stock-search.service.js';

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
   * 优先使用Yahoo Finance API，失败时自动切换到腾讯财经API
   */
  async searchStock(query: string): Promise<StockSearchResult[]> {
    // 检查缓存
    const cached = CacheService.getSearchCache(query);
    if (cached) {
      console.log(`[StockSearch] Using cached result for: ${query}`);
      return cached;
    }

    let candidates: StockSearchResult[] = [];
    let useYahooFinance = true;

    // 清理输入
    const cleanQuery = query.trim().toUpperCase();

    // 策略优化：首先使用腾讯Smartbox API（支持中文模糊搜索且无乱码）
    try {
      console.log('[StockSearch] Trying Tencent Smartbox API...');
      const { searchStockBySmartbox } = await import('./tencent-smartbox.service.js');
      const smartboxResults = await searchStockBySmartbox(query);

      if (smartboxResults.length > 0) {
        // Smartbox results are usually good quality Chinese names
        candidates = smartboxResults;
        console.log(`[StockSearch] Smartbox returned ${candidates.length} results`);

        // Cache and return early if we trust Smartbox enough
        // But user might want Yahoo's robust code matching? 
        // Smartbox is usually better for fuzzy. Let's return or merge?
        // Returning is faster and satisfies "optimize search & encoded".
        CacheService.setSearchCache(query, candidates);
        return candidates;
      }
    } catch (e) {
      console.warn('[StockSearch] Smartbox failed, falling back to legacy methods', e);
    }

    // Legacy logic below (Yahoo -> Tencent Finance)
    // 尝试使用Yahoo Finance API
    try {
      candidates = await this.searchWithYahooFinance(cleanQuery);
      console.log(`[StockSearch] Yahoo Finance returned ${candidates.length} results`);
    } catch (error: any) {
      // 如果Yahoo Finance API配额耗尽，切换到腾讯财经API
      if (error.message && error.message.includes('API_QUOTA_EXHAUSTED')) {
        console.log('[StockSearch] Yahoo Finance API quota exhausted, switching to Tencent API');
        useYahooFinance = false;
      } else {
        console.error('[StockSearch] Yahoo Finance API error:', error);
        useYahooFinance = false;
      }
    }

    // 如果Yahoo Finance失败，使用腾讯财经API
    if (!useYahooFinance || candidates.length === 0) {
      console.log('[StockSearch] Using Tencent Finance API as fallback');
      const tencentResults = await searchStockByTencent(query);
      candidates = tencentResults.map(r => ({
        symbol: r.symbol,
        name: r.name,
        nameCn: r.name, // 腾讯API返回的通常是中文
        exchange: r.exchange,
        market: r.market,
        currency: r.market === 'US' ? 'USD' : r.market === 'HK' ? 'HKD' : 'CNY'
      }));
      console.log(`[StockSearch] Tencent API returned ${candidates.length} results`);
    }

    // 缓存结果
    if (candidates.length > 0) {
      CacheService.setSearchCache(query, candidates);
    }

    return candidates;
  }

  /**
   * 使用Yahoo Finance API搜索
   */
  private async searchWithYahooFinance(cleanQuery: string): Promise<StockSearchResult[]> {
    const candidates: StockSearchResult[] = [];

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

      const displayName = getDisplayName(meta.symbol, meta.longName, meta.shortName);
      const isChineseName = displayName !== meta.longName && displayName !== meta.shortName && displayName !== meta.symbol;

      return {
        symbol: meta.symbol,
        name: displayName,
        nameCn: isChineseName ? displayName : undefined,
        exchange: meta.exchangeName,
        market: market,
        currency: meta.currency
      };
    } catch (error: any) {
      // 检测API配额耗尽错误
      if (error.message && error.message.includes('usage exhausted')) {
        throw new Error('API_QUOTA_EXHAUSTED');
      }
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


}

export const stockSearchService = new StockSearchService();
