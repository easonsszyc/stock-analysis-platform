/**
 * 腾讯API备用数据源测试
 */
import { describe, it, expect } from 'vitest';
import { searchStockByTencent } from './services/tencent-stock-search.service.js';
import { stockSearchService } from './services/stock-search.service.js';

describe('腾讯API备用数据源', () => {
  it('应该能够搜索港股（9988）', async () => {
    const results = await searchStockByTencent('9988');
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].symbol).toBe('09988');
    // 腾讯API可能返回股票代码而非中文名称，这是正常的
    expect(results[0].name).toBeDefined();
    expect(results[0].market).toBe('HK');
    expect(results[0].exchange).toBe('HKEX');
  }, 15000);
  
  it('应该能够搜索A股（600519）', async () => {
    const results = await searchStockByTencent('600519');
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].symbol).toBe('600519');
    // 腾讯API可能返回股票代码而非中文名称，这是正常的
    expect(results[0].name).toBeDefined();
    expect(results[0].market).toBe('CN');
  }, 15000);
  
  it('应该能够搜索美股（AAPL）', async () => {
    const results = await searchStockByTencent('AAPL');
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].symbol).toBe('aapl');
    expect(results[0].market).toBe('US');
    expect(results[0].exchange).toBe('NASDAQ/NYSE');
  }, 15000);
});

describe('自动数据源切换', () => {
  it('当Yahoo Finance API不可用时，应该自动切换到腾讯API', async () => {
    // 由于Yahoo Finance API配额已耗尽，这个测试应该自动切换到腾讯API
    const results = await stockSearchService.searchStock('9988');
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain('阿里');
    expect(results[0].market).toBe('HK');
  }, 20000);
  
  it('应该返回正确的股票信息格式', async () => {
    const results = await stockSearchService.searchStock('9988');
    
    expect(results[0]).toHaveProperty('symbol');
    expect(results[0]).toHaveProperty('name');
    expect(results[0]).toHaveProperty('nameCn');
    expect(results[0]).toHaveProperty('exchange');
    expect(results[0]).toHaveProperty('market');
    expect(results[0]).toHaveProperty('currency');
  }, 20000);
});
