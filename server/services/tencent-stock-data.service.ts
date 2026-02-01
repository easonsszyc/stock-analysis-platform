import { StockInfo, PriceDataPoint, MarketType, TimeRange, Interval } from '../../shared/stock-types';
import * as iconv from 'iconv-lite';

/**
 * Get start and end dates based on TimeRange
 */
function getDateRange(range: TimeRange): { startDate: string; endDate: string } {
    const end = new Date();
    const start = new Date();

    switch (range) {
        case '1d':
            // For 1d, we might want intraday, but this function is for daily kline usually
            start.setDate(end.getDate() - 1); // fallback
            break;
        case '5d':
            start.setDate(end.getDate() - 5);
            break;
        case '1mo':
            start.setMonth(end.getMonth() - 1);
            break;
        case '3mo':
            start.setMonth(end.getMonth() - 3);
            break;
        case '6mo':
            start.setMonth(end.getMonth() - 6);
            break;
        case '1y':
            start.setFullYear(end.getFullYear() - 1);
            break;
        case '2y':
            start.setFullYear(end.getFullYear() - 2);
            break;
        case '5y':
            start.setFullYear(end.getFullYear() - 5);
            break;
        default:
            start.setFullYear(end.getFullYear() - 1); // default 1y
    }

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    return {
        startDate: formatDate(start),
        endDate: formatDate(end)
    };
}

/**
 * Format symbol for Tencent API
 * A stock: sh600519
 * HK stock: hk00700
 * US stock: usAAPL
 */
function formatTencentSymbol(symbol: string, market: MarketType): string {
    let code = symbol.replace(/\..*$/, ''); // remove suffix if any

    if (market === 'CN') {
        // 6开头为沪市，其他深市(简单判断，实际应更严谨，但这里fallback够用)
        if (code.startsWith('6') || code.startsWith('5')) {
            return `sh${code}`;
        } else {
            return `sz${code}`;
        }
    } else if (market === 'HK') {
        // HK usually needs 5 digits
        return `hk${code.padStart(5, '0')}`;
    } else {
        // US
        return `us${code.toUpperCase()}`;
    }
}

/**
 * Fetch stock data from Tencent Finance API
 */
export async function getStockDataFromTencent(
    symbol: string,
    market: MarketType,
    range: TimeRange = '1y',
    interval: Interval = '1d'
): Promise<{ stockInfo: StockInfo; priceData: PriceDataPoint[] }> {
    const tencentSymbol = formatTencentSymbol(symbol, market);
    const { startDate, endDate } = getDateRange(range);

    // Tencent supports day, week, month. Map interval.
    // We only support 'day', 'week', 'month' for this basic fallback.
    // If interval is intraday (1m, 5m etc), we might just return daily data or throw not supported for now.
    // But let's try to map what we can.
    let tencentInterval = 'day';
    if (interval === '1wk') tencentInterval = 'week';
    else if (interval === '1mo') tencentInterval = 'month';
    else if (interval === '5m') tencentInterval = 'm5';
    else if (interval === '15m') tencentInterval = 'm15';
    else if (interval === '30m') tencentInterval = 'm30';
    else if (interval === '60m') tencentInterval = 'm60';
    else if (['1m'].includes(interval)) {
        // 1m usually via different endpoint, but m1 might work here too
        tencentInterval = 'm1';
    }

    // qfq stands for Qian Fu Quan (Forward Adjusted)
    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tencentSymbol},${tencentInterval},${startDate},${endDate},600,qfq`;

    console.log(`[TencentAPI] Fetching ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Tencent API failed with status ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    // Decode GBK just in case, though this endpoint usually returns JSON with limited chinese.
    const text = iconv.decode(Buffer.from(buffer), 'gbk');

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error('Failed to parse Tencent API response');
    }

    if (data.code !== 0 || !data.data || !data.data[tencentSymbol]) {
        // Try to see if it's in qt
        throw new Error('Tencent API returned no data for symbol');
    }

    const stockObj = data.data[tencentSymbol];
    // qt contains basic info
    const qtData = stockObj.qt?.[tencentSymbol];
    // [0]unknown [1]name [2]code [3]current [4]prev_close [5]open [6]volume [7]outer [8]inner [9]buy1 [10]buy1_vol ... [30]time [31]change [32]change% [33]high [34]low ...
    // Parsing qt is tricky as it varies by market.

    // Parse kline data
    // data.data[tencentSymbol][tencentInterval] usually holds the array
    // Format: [date, open, close, high, low, volume, ...]
    const klines = stockObj[tencentInterval] || stockObj['day'] || [];

    const priceData: PriceDataPoint[] = klines.map((item: any) => {
        // item: ["2023-01-01", "10.0", "11.0", "12.0", "9.0", "1000"]
        if (!item || item.length < 6) return null;
        return {
            date: item[0], // YYYY-MM-DD
            open: parseFloat(item[1]),
            close: parseFloat(item[2]),
            high: parseFloat(item[3]),
            low: parseFloat(item[4]),
            volume: parseFloat(item[5]),
            adjClose: parseFloat(item[2]) // Fallback to close
        };
    }).filter((item): item is PriceDataPoint => item !== null);

    // Calculate info from latest kline if qt not reliable or complex
    // But let's try to use basic info from the latest kline + general logic
    if (priceData.length === 0) {
        throw new Error('No price data found');
    }

    const latest = priceData[priceData.length - 1];

    // Calculate 52w high/low from data
    let high52 = -Infinity;
    let low52 = Infinity;
    // If we fetched 1y, we can calc it. If less, it's partial.
    priceData.forEach(p => {
        if (p.high > high52) high52 = p.high;
        if (p.low < low52) low52 = p.low;
    });

    const stockInfo: StockInfo = {
        symbol: symbol,
        name: stockObj.qt?.[tencentSymbol]?.[1] || symbol, // Try to get name from qt
        market: market,
        currency: market === 'US' ? 'USD' : (market === 'HK' ? 'HKD' : 'CNY'),
        exchange: market === 'US' ? 'US' : (market === 'HK' ? 'HKEX' : 'CN'),
        currentPrice: latest.close,
        previousClose: priceData.length > 1 ? priceData[priceData.length - 2].close : latest.open,
        fiftyTwoWeekHigh: high52,
        fiftyTwoWeekLow: low52,
        volume: latest.volume
    };

    return { stockInfo, priceData };
}
