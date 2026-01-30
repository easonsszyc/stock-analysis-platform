import { describe, it, expect } from 'vitest';
import { stockComparisonService } from './stock-comparison.service';
import type { PriceDataPoint } from '../../shared/stock-types';

describe('StockComparisonService', () => {
  // 创建测试数据
  const createTestPriceData = (basePrice: number, trend: number, days: number): PriceDataPoint[] => {
    const data: PriceDataPoint[] = [];
    
    for (let i = 0; i < days; i++) {
      const price = basePrice + (trend * i) + (Math.random() - 0.5) * 2;
      data.push({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        open: price - 0.5,
        high: price + 1,
        low: price - 1,
        close: price,
        volume: Math.floor(1000000 + Math.random() * 500000)
      });
    }
    
    return data;
  };

  describe('calculateRelativeStrength', () => {
    it('should calculate relative strength correctly', () => {
      const priceData = {
        'STOCK1': createTestPriceData(100, 0.5, 100), // 上涨趋势
        'STOCK2': createTestPriceData(100, -0.3, 100), // 下跌趋势
        'STOCK3': createTestPriceData(100, 0, 100) // 横盘
      };

      const relativeStrength = (stockComparisonService as any).calculateRelativeStrength(priceData);

      expect(relativeStrength).toHaveProperty('STOCK1');
      expect(relativeStrength).toHaveProperty('STOCK2');
      expect(relativeStrength).toHaveProperty('STOCK3');

      // 上涨股票的相对强度应该大于100
      expect(relativeStrength['STOCK1']).toBeGreaterThan(100);
      
      // 下跌股票的相对强度应该小于100
      expect(relativeStrength['STOCK2']).toBeLessThan(100);
      
      // 横盘股票的相对强度应该接近100
      expect(Math.abs(relativeStrength['STOCK3'] - 100)).toBeLessThan(5);
    });
  });

  describe('calculatePerformance', () => {
    it('should calculate performance metrics correctly', () => {
      const priceData = {
        'TEST': createTestPriceData(100, 0.1, 100)
      };

      const performance = (stockComparisonService as any).calculatePerformance(priceData);

      expect(performance).toHaveProperty('TEST');
      expect(performance['TEST']).toHaveProperty('daily');
      expect(performance['TEST']).toHaveProperty('weekly');
      expect(performance['TEST']).toHaveProperty('monthly');
      expect(performance['TEST']).toHaveProperty('yearly');

      // 所有指标应该是数字
      expect(typeof performance['TEST'].daily).toBe('number');
      expect(typeof performance['TEST'].weekly).toBe('number');
      expect(typeof performance['TEST'].monthly).toBe('number');
      expect(typeof performance['TEST'].yearly).toBe('number');
    });

    it('should handle different time periods', () => {
      const priceData = {
        'SHORT': createTestPriceData(100, 1, 10), // 只有10天数据
        'LONG': createTestPriceData(100, 1, 250) // 250天数据
      };

      const performance = (stockComparisonService as any).calculatePerformance(priceData);

      expect(performance['SHORT']).toBeDefined();
      expect(performance['LONG']).toBeDefined();
    });
  });

  describe('calculateCorrelation', () => {
    it('should calculate correlation matrix correctly', () => {
      const priceData = {
        'STOCK1': createTestPriceData(100, 0.5, 100),
        'STOCK2': createTestPriceData(100, 0.5, 100),
        'STOCK3': createTestPriceData(100, -0.5, 100)
      };

      const correlation = (stockComparisonService as any).calculateCorrelation(priceData);

      // 检查矩阵结构
      expect(correlation).toHaveProperty('STOCK1');
      expect(correlation).toHaveProperty('STOCK2');
      expect(correlation).toHaveProperty('STOCK3');

      // 自相关应该是1
      expect(correlation['STOCK1']['STOCK1']).toBe(1);
      expect(correlation['STOCK2']['STOCK2']).toBe(1);
      expect(correlation['STOCK3']['STOCK3']).toBe(1);

      // 相关系数应该在-1到1之间
      expect(correlation['STOCK1']['STOCK2']).toBeGreaterThanOrEqual(-1);
      expect(correlation['STOCK1']['STOCK2']).toBeLessThanOrEqual(1);

      // 矩阵应该是对称的
      expect(correlation['STOCK1']['STOCK2']).toBe(correlation['STOCK2']['STOCK1']);
    });
  });

  describe('calculatePearsonCorrelation', () => {
    it('should calculate Pearson correlation coefficient', () => {
      // 创建完全正相关的数据
      const data1 = createTestPriceData(100, 1, 50);
      const data2 = createTestPriceData(100, 1, 50);

      const correlation = (stockComparisonService as any).calculatePearsonCorrelation(data1, data2);

      // 相同趋势的股票应该有较高的正相关
      expect(correlation).toBeGreaterThan(0);
      expect(correlation).toBeLessThanOrEqual(1);
    });

    it('should handle different trends', () => {
      const data1 = createTestPriceData(100, 1, 50);
      const data2 = createTestPriceData(100, -1, 50);

      const correlation = (stockComparisonService as any).calculatePearsonCorrelation(data1, data2);

      // 相关系数应该在-1到01之间
      expect(correlation).toBeGreaterThanOrEqual(-1);
      expect(correlation).toBeLessThanOrEqual(1);
    });

    it('should return 0 for insufficient data', () => {
      const data1 = createTestPriceData(100, 0, 1);
      const data2 = createTestPriceData(100, 0, 1);

      const correlation = (stockComparisonService as any).calculatePearsonCorrelation(data1, data2);

      expect(correlation).toBe(0);
    });
  });

  describe('calculateReturns', () => {
    it('should calculate returns correctly', () => {
      const prices = [100, 105, 103, 108, 110];
      const returns = (stockComparisonService as any).calculateReturns(prices);

      expect(returns.length).toBe(4); // n-1 returns for n prices
      expect(returns[0]).toBeCloseTo(0.05, 2); // (105-100)/100
      expect(returns[1]).toBeCloseTo(-0.019, 2); // (103-105)/105
    });

    it('should handle zero prices', () => {
      const prices = [100, 0, 105];
      const returns = (stockComparisonService as any).calculateReturns(prices);

      // 应该跳过零值
      expect(returns.length).toBeLessThan(2);
    });
  });
});
