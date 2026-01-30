import sys from 'sys';
sys.path.append('/opt/.manus/.sandbox-runtime');
import { ApiClient } from '/opt/.manus/.sandbox-runtime/data_api.mjs';

const client = new ApiClient();

async function test() {
  try {
    console.log('Testing Yahoo Finance API for 9988.HK...');
    const response = await client.call_api('YahooFinance/get_stock_chart', {
      query: {
        symbol: '9988.HK',
        region: 'HK',
        interval: '1d',
        range: '5d',
        includeAdjustedClose: 'true'
      }
    });
    
    console.log('Response:', JSON.stringify(response, null, 2).substring(0, 500));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
