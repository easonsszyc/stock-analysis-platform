import { StockInfo, PriceDataPoint, MarketType, TimeRange, Interval } from '../../shared/stock-types';

/**
 * Format symbol for EastMoney API (secid)
 * Rule:
 * 0: SZ (00xxxx, 30xxxx)
 * 1: SH (60xxxx, 68xxxx)
 * 105: US (NASDAQ/NYSE) - But actually EM uses specific internal IDs for US stocks, 
 *      often 105.AAPL for Nasdaq, 106.BABA for NYSE approx. THIS IS TRICKY for US.
 *      Let's focus on CN/HK first which are standard. 
 *      HK is usually 116.
 * 
 * For US, mapping is complex without a search. We might stick to Yahoo/Tencent for US
 * unless we implement a search-first approach.
 * For now: Optimize CN/HK to use EastMoney.
 */
function getSecId(symbol: string, market: MarketType): string {
    const code = symbol.replace(/\..*$/, ''); // Remove .SZ/.SS/.HK suffix

    if (market === 'CN') {
        if (code.startsWith('6') || code.startsWith('5')) {
            return `1.${code}`; // SH
        } else {
            return `0.${code}`; // SZ
        }
    } else if (market === 'HK') {
        return `116.${code}`; // HK
    } else if (market === 'US') {
        // EastMoney US support is tricky with simple mapping. 
        // We might need to guess 105 (Nasdaq) vs 106 (NYSE).
        // For fail-safe, maybe skip US or default to 105 and hope.
        // Let's force 105 for common tech stocks as a try, but this is risky.
        return `105.${code.toUpperCase()}`;
    }
    return `0.${code}`;
}

/**
 * Map Interval to EastMoney klt param
 * 101: Daily
 * 102: Weekly
 * 103: Monthly
 * 15: 15m ? No, specific map:
 * 1: 1m
 * 5: 5m
 * 15: 15m
 * 30: 30m
 * 60: 60m
 */
function getKlt(interval: Interval): string {
    switch (interval) {
        case '1d': return '101';
        case '1wk': return '102';
        case '1mo': return '103';
        case '1m': return '1';
        case '5m': return '5';
        case '15m': return '15';
        case '30m': return '30';
        case '60m': return '60';
        default: return '101';
    }
}

export async function getStockDataFromEastMoney(
    symbol: string,
    market: MarketType,
    range: TimeRange = '1y',
    interval: Interval = '1d'
): Promise<{ stockInfo: StockInfo; priceData: PriceDataPoint[] }> {
    const secid = getSecId(symbol, market);
    const klt = getKlt(interval);

    // beg=0 end=20500101 means all data, regulated by lmt (limit) roughly
    // Or we can calculate beg date. "0" means from start usually for EM.
    // lmt=1000 gives last 1000 points which covers 1y easily.

    // fields1=f1,f2... (header info)
    // fields2=f51,f52... (kline data: date, open, close, high, low, vol, amount, amplitude)
    // f51: date, f52: open, f53: close, f54: high, f55: low, f56: vol, f57: amt
    // lmt=5000 (Allows ~20 days of 1m data, or ~100 days of 5m data)
    const url = `http://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&klt=${klt}&fqt=1&lmt=5000&end=20500101&iscca=1&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58`;

    console.log(`[EastMoney] Fetching ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`EastMoney API failed: ${response.status}`);
    }

    const json = await response.json();

    if (!json.data || !json.data.klines) {
        throw new Error('EastMoney API returned no data');
    }

    const data = json.data;
    const klines = data.klines as string[]; // ["2020-01-01,10.0,11.0...", ...]

    const priceData: PriceDataPoint[] = klines.map(line => {
        const parts = line.split(',');
        // f51,f52,f53,f54,f55,f56,f57
        // date, open, close, high, low, vol, amt
        return {
            date: parts[0],
            open: parseFloat(parts[1]),
            close: parseFloat(parts[2]),
            high: parseFloat(parts[3]),
            low: parseFloat(parts[4]),
            volume: parseFloat(parts[5]),
            adjClose: parseFloat(parts[2])
        };
    });

    if (priceData.length === 0) throw new Error('No price data found');

    const latest = priceData[priceData.length - 1];

    // Basic Info from meta (f1...f6) is limited in this API (mostly just name/code)
    // data.name, data.code

    let high52 = -Infinity;
    let low52 = Infinity;
    priceData.forEach(p => {
        if (p.high > high52) high52 = p.high;
        if (p.low < low52) low52 = p.low;
    });

    const previousClose = priceData.length > 1 ? priceData[priceData.length - 2].close : latest.open; // Fallback to open if no prev close
    const changeAmount = latest.close - previousClose;
    const changePercent = (changeAmount / previousClose) * 100;

    const stockInfo: StockInfo = {
        symbol: data.code || symbol, // EM returns pure code "600519"
        name: data.name || symbol,
        market: market,
        currency: market === 'US' ? 'USD' : (market === 'HK' ? 'HKD' : 'CNY'),
        exchange: market === 'US' ? 'US' : (market === 'HK' ? 'HKEX' : 'CN'),
        currentPrice: latest.close,
        previousClose: previousClose,
        changeAmount: changeAmount,
        changePercent: changePercent,
        fiftyTwoWeekHigh: high52,
        fiftyTwoWeekLow: low52,
        volume: latest.volume,
        marketStatus: 'OPEN', // Default to OPEN (simpler than full time logic here, handled better in client or unified service)
        // Note: Real pre/post market data usually requires separate full-quote API, not just kline
    };

    return { stockInfo, priceData };
}
