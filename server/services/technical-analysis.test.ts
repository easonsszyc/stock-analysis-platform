import { describe, it, expect } from 'vitest';
import { technicalAnalysisService } from './technical-analysis.service';
import type { PriceDataPoint } from '../../shared/stock-types';

describe('TechnicalAnalysisService', () => {
  // 创建测试数据
  const createTestData = (): PriceDataPoint[] => {
    const data: PriceDataPoint[] = [];
    const basePrice = 100;
    
    for (let i = 0; i < 100; i++) {
      const trend = Math.sin(i / 10) * 10;
      const noise = (Math.random() - 0.5) * 2;
      const close = basePrice + trend + noise;
      
      data.push({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        open: close - (Math.random() - 0.5),
        high: close + Math.random() * 2,
        low: close - Math.random() * 2,
        close: close,
        volume: Math.floor(1000000 + Math.random() * 500000)
      });
    }
    
    return data;
  };

  describe('calculateMA', () => {
    it('should calculate moving average correctly', () => {
      const prices = [10, 20, 30, 40, 50];
      const ma3 = technicalAnalysisService.calculateMA(prices, 3);
      
      expect(ma3[0]).toBeNaN();
      expect(ma3[1]).toBeNaN();
      expect(ma3[2]).toBe(20); // (10+20+30)/3
      expect(ma3[3]).toBe(30); // (20+30+40)/3
      expect(ma3[4]).toBe(40); // (30+40+50)/3
    });

    it('should handle period larger than data length', () => {
      const prices = [10, 20, 30];
      const ma5 = technicalAnalysisService.calculateMA(prices, 5);
      
      expect(ma5.every(v => isNaN(v))).toBe(true);
    });
  });

  describe('calculateRSI', () => {
    it('should calculate RSI correctly', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
      const rsi = technicalAnalysisService.calculateRSI(prices, 14);
      
      // RSI should be high for uptrend
      const lastRSI = rsi[rsi.length - 1];
      expect(lastRSI).toBeGreaterThan(50);
      expect(lastRSI).toBeLessThanOrEqual(100);
    });

    it('should return NaN for insufficient data', () => {
      const prices = [100, 101, 102];
      const rsi = technicalAnalysisService.calculateRSI(prices, 14);
      
      expect(rsi.slice(0, 14).every(v => isNaN(v))).toBe(true);
    });
  });

  describe('calculateMACD', () => {
    it('should calculate MACD components', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 10);
      const { macd, signal, histogram } = technicalAnalysisService.calculateMACD(prices);
      
      expect(macd.length).toBe(prices.length);
      expect(signal.length).toBe(prices.length);
      expect(histogram.length).toBe(prices.length);
      
      // Check that histogram = macd - signal
      const lastIndex = prices.length - 1;
      const calculatedHist = macd[lastIndex] - signal[lastIndex];
      expect(Math.abs(histogram[lastIndex] - calculatedHist)).toBeLessThan(0.0001);
    });
  });

  describe('calculateBollingerBands', () => {
    it('should calculate Bollinger Bands correctly', () => {
      const prices = Array.from({ length: 30 }, () => 100);
      const { upper, middle, lower } = technicalAnalysisService.calculateBollingerBands(prices, 20, 2);
      
      // For constant prices, upper and lower should be equal to middle
      const lastIndex = prices.length - 1;
      expect(upper[lastIndex]).toBeCloseTo(100, 1);
      expect(middle[lastIndex]).toBeCloseTo(100, 1);
      expect(lower[lastIndex]).toBeCloseTo(100, 1);
    });

    it('should have upper > middle > lower for volatile prices', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + (i % 2 === 0 ? 5 : -5));
      const { upper, middle, lower } = technicalAnalysisService.calculateBollingerBands(prices, 20, 2);
      
      const lastIndex = prices.length - 1;
      expect(upper[lastIndex]).toBeGreaterThan(middle[lastIndex]);
      expect(middle[lastIndex]).toBeGreaterThan(lower[lastIndex]);
    });
  });

  describe('addTechnicalIndicators', () => {
    it('should add all technical indicators to price data', () => {
      const priceData = createTestData();
      const dataWithIndicators = technicalAnalysisService.addTechnicalIndicators(priceData);
      
      expect(dataWithIndicators.length).toBe(priceData.length);
      
      // Check that indicators exist
      const lastPoint = dataWithIndicators[dataWithIndicators.length - 1];
      expect(lastPoint).toHaveProperty('ma5');
      expect(lastPoint).toHaveProperty('ma10');
      expect(lastPoint).toHaveProperty('ma20');
      expect(lastPoint).toHaveProperty('ma60');
      expect(lastPoint).toHaveProperty('rsi');
      expect(lastPoint).toHaveProperty('macd');
      expect(lastPoint).toHaveProperty('macdSignal');
      expect(lastPoint).toHaveProperty('macdHist');
      expect(lastPoint).toHaveProperty('bollingerUpper');
      expect(lastPoint).toHaveProperty('bollingerMiddle');
      expect(lastPoint).toHaveProperty('bollingerLower');
    });
  });

  describe('identifySupportResistance', () => {
    it('should identify support and resistance levels', () => {
      const priceData = createTestData();
      const levels = technicalAnalysisService.identifySupportResistance(priceData);
      
      expect(levels).toHaveProperty('support');
      expect(levels).toHaveProperty('resistance');
      expect(Array.isArray(levels.support)).toBe(true);
      expect(Array.isArray(levels.resistance)).toBe(true);
    });
  });

  describe('analyzeMomentum', () => {
    it('should analyze momentum correctly', () => {
      const priceData = createTestData();
      const dataWithIndicators = technicalAnalysisService.addTechnicalIndicators(priceData);
      const momentum = technicalAnalysisService.analyzeMomentum(dataWithIndicators);
      
      expect(momentum).toHaveProperty('upwardMomentum');
      expect(momentum).toHaveProperty('downwardMomentum');
      expect(momentum).toHaveProperty('trend');
      expect(momentum).toHaveProperty('strength');
      
      expect(momentum.upwardMomentum).toBeGreaterThanOrEqual(0);
      expect(momentum.upwardMomentum).toBeLessThanOrEqual(100);
      expect(momentum.downwardMomentum).toBeGreaterThanOrEqual(0);
      expect(momentum.downwardMomentum).toBeLessThanOrEqual(100);
      expect(momentum.strength).toBeGreaterThanOrEqual(0);
      expect(momentum.strength).toBeLessThanOrEqual(100);
    });
  });

  describe('generateTradingSignal', () => {
    it('should generate trading signal with valid properties', () => {
      const priceData = createTestData();
      const dataWithIndicators = technicalAnalysisService.addTechnicalIndicators(priceData);
      const signal = technicalAnalysisService.generateTradingSignal(dataWithIndicators);
      
      expect(signal).toHaveProperty('signal');
      expect(signal).toHaveProperty('confidence');
      expect(signal).toHaveProperty('reasons');
      expect(signal).toHaveProperty('entryPrice');
      expect(signal).toHaveProperty('stopLoss');
      expect(signal).toHaveProperty('takeProfit');
      
      expect(['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL']).toContain(signal.signal);
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(100);
      expect(Array.isArray(signal.reasons)).toBe(true);
      expect(signal.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('identifyCandlestickPatterns', () => {
    it('should identify candlestick patterns', () => {
      const priceData = createTestData();
      const patterns = technicalAnalysisService.identifyCandlestickPatterns(priceData);
      
      expect(Array.isArray(patterns)).toBe(true);
      
      if (patterns.length > 0) {
        const pattern = patterns[0];
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('type');
        expect(pattern).toHaveProperty('reliability');
        expect(pattern).toHaveProperty('description');
        expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(pattern.type);
      }
    });
  });

  describe('calculateKeyPriceLevels', () => {
    it('should calculate key price levels', () => {
      const priceData = createTestData();
      const keyLevels = technicalAnalysisService.calculateKeyPriceLevels(priceData);
      
      expect(keyLevels).toHaveProperty('currentPrice');
      expect(keyLevels).toHaveProperty('yearHigh');
      expect(keyLevels).toHaveProperty('yearLow');
      expect(keyLevels).toHaveProperty('recentHigh');
      expect(keyLevels).toHaveProperty('recentLow');
      expect(keyLevels).toHaveProperty('support');
      
      expect(keyLevels.yearHigh).toBeGreaterThanOrEqual(keyLevels.yearLow);
      expect(keyLevels.recentHigh).toBeGreaterThanOrEqual(keyLevels.recentLow);
    });
  });
});
