import { StockSearchResult } from './stock-search.service.js';

/**
 * Interface for Tencent Smartbox response item
 */
interface SmartboxItem {
    v: string; // "1~600519~贵州茅台~gzmt~A股~100" (market~code~name~pinyin~type~?)
}

/**
 * Smartbox API usually returns `v_hint="N~..."` or similar
 */
interface SmartboxResponse {
    v_hint?: string;
    result?: string; // Sometimes response format varies
}

/**
 * Service to search using Tencent Smartbox API
 * URL: https://smartbox.gtimg.cn/s3/?t=all&q={query}
 */
export async function searchStockBySmartbox(query: string): Promise<StockSearchResult[]> {
    const url = `https://smartbox.gtimg.cn/s3/?t=all&q=${encodeURIComponent(query)}`;

    try {
        console.log(`[Smartbox] Searching for: ${query}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Smartbox API failed: ${response.status}`);
        }

        const text = await response.text();
        // Response is like: v_hint="N~600519~贵州茅台~gzmt~GP-A~100^N~000519~中兵红箭~zbhj~GP-A~100^..."

        // Extract content inside quotes
        const match = text.match(/v_hint="([^"]+)"/);
        if (!match || !match[1]) {
            // Sometimes it returns nothing found
            console.log(`[Smartbox] No results found or invalid format`);
            return [];
        }

        let rawData = match[1];
        if (rawData === 'N') return []; // "N" means no result

        // Decode Unicode escape sequences (e.g., \u79d1\u521b → 科创)
        try {
            rawData = JSON.parse(`"${rawData}"`);
        } catch (e) {
            console.warn('[Smartbox] Failed to decode Unicode escapes');
        }

        const items = rawData.split('^');
        const results: StockSearchResult[] = [];

        // Format: "Region~Code~Name~Pinyin~Sort~Type?~MarketCode?~?"
        // Example: "sh~600519~贵州茅台~gzmt~GP-A~1~..."
        // Or sometimes: "1~600519~贵州茅台~gzmt~GP-A"
        // Let's analyze common patterns
        // Observed: "sh~600519~贵州茅台~gzmt~GP-A"
        //           "hk~00700~腾讯控股~txkg~GP-HK"
        //           "us~AAPL~苹果~pg~GP-US"

        for (const item of items) {
            const parts = item.split('~');
            if (parts.length < 4) continue;

            const region = parts[0]; // sh, sz, hk, us
            const code = parts[1];   // 600519, 00700, AAPL
            const name = parts[2];   // 贵州茅台
            // const pinyin = parts[3]; // gzmt
            const type = parts[4];   // GP-A, GP-HK, GP-US

            // Filter stocks (GP), funds (JJ), and ETFs
            // Smartbox types: GP-A (Stock), JJ (Fund), ETF, GP-US (US Stock), etc.
            if (!type.startsWith('GP') && !type.startsWith('JJ') && type !== 'ETF') continue;

            let market: 'CN' | 'HK' | 'US';
            let symbol = code;
            let exchange = 'Unknown';
            let currency = 'CNY'; // Default

            if (region === 'sh' || region === 'sz') {
                market = 'CN';
                symbol = region === 'sh' ? `${code}.SS` : `${code}.SZ`;
                exchange = region === 'sh' ? 'SSE' : 'SZSE';
                currency = 'CNY';
            } else if (region === 'hk') {
                market = 'HK';
                symbol = `${code}.HK`;
                exchange = 'HKEX';
                currency = 'HKD';
            } else if (region === 'us') {
                market = 'US';
                symbol = code.toUpperCase(); // Ensure upper case for US
                exchange = 'US'; // Could be NASDAQ/NYSE but smartbox doesn't always say
                currency = 'USD';
            } else {
                continue; // Skip unknown regions
            }

            results.push({
                symbol,
                name: name, // Smartbox returns Chinese names usually
                nameCn: name,
                market,
                exchange,
                currency
            });
        }

        console.log(`[Smartbox] Found ${results.length} results`);
        return results;

    } catch (error) {
        console.error('[Smartbox] Error:', error);
        return [];
    }
}
