
import { getStockDataFromTencent } from './tencent-stock-data.service';
import { getStockDataFromEastMoney } from './eastmoney-stock-data.service';

async function testTencentUS() {
    console.log('--- Testing Tencent US (AAPL) ---');
    try {
        // Tencent expects usAAPL
        const data = await getStockDataFromTencent('AAPL', 'US');
        console.log('Stock Info:', JSON.stringify(data.stockInfo, null, 2));
        console.log('Price Data Items:', data.priceData.length);
        if (data.priceData.length > 0) {
            console.log('Latest Price:', JSON.stringify(data.priceData[data.priceData.length - 1], null, 2));
        }
    } catch (e: any) {
        console.error('Tencent Error:', e.message);
    }
}

async function testTencentUS_LowerCase() {
    console.log('--- Testing Tencent US Lowercase (aapl) ---');
    try {
        // Service handles casing, but let's see if passing raw lower case works if we bypass service? 
        // We are using service function so it will format it.
        // Let's manually fetch URL to see raw response if service works.
    } catch (e: any) {
        console.error(e);
    }
}

async function testEastMoneyUS() {
    console.log('--- Testing EastMoney US (AAPL) ---');
    try {
        // EastMoney US is tricky. 105.AAPL?
        const data = await getStockDataFromEastMoney('AAPL', 'US');
        console.log('Stock Info:', JSON.stringify(data.stockInfo, null, 2));
        console.log('Price Data Items:', data.priceData.length);
    } catch (e: any) {
        console.error('EastMoney Error:', e.message);
    }
}

async function run() {
    await testTencentUS();
    await testEastMoneyUS();
}

run();
