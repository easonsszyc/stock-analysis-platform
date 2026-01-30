import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { StockAnalysis } from '@shared/stock-types';
import { StockChart } from './StockChart';

interface StockAnalysisViewProps {
  analysis: StockAnalysis;
}

export function StockAnalysisView({ analysis }: StockAnalysisViewProps) {
  const { stockInfo, tradingSignal, momentum, keyLevels, patterns, volumeAnalysis, recommendation } = analysis;

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'STRONG_BUY':
        return 'bg-green-600 text-white';
      case 'BUY':
        return 'bg-green-500 text-white';
      case 'HOLD':
        return 'bg-yellow-500 text-white';
      case 'SELL':
        return 'bg-red-500 text-white';
      case 'STRONG_SELL':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getSignalText = (signal: string) => {
    switch (signal) {
      case 'STRONG_BUY':
        return '强烈买入';
      case 'BUY':
        return '买入';
      case 'HOLD':
        return '持有';
      case 'SELL':
        return '卖出';
      case 'STRONG_SELL':
        return '强烈卖出';
      default:
        return signal;
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend.includes('UPTREND')) return <TrendingUp className="h-4 w-4" />;
    if (trend.includes('DOWNTREND')) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'STRONG_UPTREND':
        return '强势上涨';
      case 'UPTREND':
        return '上涨趋势';
      case 'SIDEWAYS':
        return '横盘整理';
      case 'DOWNTREND':
        return '下跌趋势';
      case 'STRONG_DOWNTREND':
        return '强势下跌';
      default:
        return trend;
    }
  };

  return (
    <div className="space-y-6">
      {/* 股票基本信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{stockInfo.name}</CardTitle>
              <CardDescription className="text-lg">{stockInfo.symbol}</CardDescription>
            </div>
            <Badge className={getSignalColor(tradingSignal.signal)}>
              {getSignalText(tradingSignal.signal)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">当前价格</p>
              <p className="text-2xl font-bold">{stockInfo.currentPrice?.toFixed(2)} {stockInfo.currency}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">52周最高</p>
              <p className="text-lg font-semibold">{stockInfo.fiftyTwoWeekHigh?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">52周最低</p>
              <p className="text-lg font-semibold">{stockInfo.fiftyTwoWeekLow?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">交易所</p>
              <p className="text-lg font-semibold">{stockInfo.exchange}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 交易建议 */}
      <Alert className={recommendation.action === 'BUY' ? 'border-green-500' : recommendation.action === 'SELL' ? 'border-red-500' : 'border-yellow-500'}>
        <AlertDescription className="space-y-2">
          <div className="flex items-center gap-2 font-semibold text-lg">
            {recommendation.action === 'BUY' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
            {recommendation.action === 'SELL' && <AlertTriangle className="h-5 w-5 text-red-600" />}
            {recommendation.action === 'HOLD' && <Info className="h-5 w-5 text-yellow-600" />}
            投资建议：{recommendation.action === 'BUY' ? '建议买入' : recommendation.action === 'SELL' ? '建议卖出' : '建议观望'}
          </div>
          <p className="text-sm">{recommendation.reasoning}</p>
          {recommendation.targetPrice && (
            <div className="flex gap-4 text-sm">
              <span>目标价位: <strong>{recommendation.targetPrice.toFixed(2)}</strong></span>
              <span>止损价位: <strong>{recommendation.stopLoss?.toFixed(2)}</strong></span>
            </div>
          )}
        </AlertDescription>
      </Alert>

      {/* 价格走势图 */}
      <Card>
        <CardHeader>
          <CardTitle>价格走势与技术指标</CardTitle>
        </CardHeader>
        <CardContent>
          <StockChart data={analysis.priceData} stockInfo={stockInfo} />
        </CardContent>
      </Card>

      {/* 技术分析指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 交易信号详情 */}
        <Card>
          <CardHeader>
            <CardTitle>交易信号</CardTitle>
            <CardDescription>信号强度: {tradingSignal.confidence}%</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tradingSignal.reasons.map((reason, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <p className="text-sm">{reason}</p>
              </div>
            ))}
            {tradingSignal.entryPrice && (
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">建议入场价:</span>
                  <span className="font-semibold">{tradingSignal.entryPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">止损价位:</span>
                  <span className="font-semibold text-red-600">{tradingSignal.stopLoss?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">止盈价位:</span>
                  <span className="font-semibold text-green-600">{tradingSignal.takeProfit?.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 动能分析 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getTrendIcon(momentum.trend)}
              趋势动能
            </CardTitle>
            <CardDescription>{getTrendText(momentum.trend)} - 强度 {momentum.strength.toFixed(0)}%</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>上涨动能</span>
                <span className="font-semibold">{momentum.upwardMomentum.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${momentum.upwardMomentum}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>下跌动能</span>
                <span className="font-semibold">{momentum.downwardMomentum.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${momentum.downwardMomentum}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>趋势强度</span>
                <span className="font-semibold">{momentum.strength.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${momentum.strength}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 关键价格点 */}
        <Card>
          <CardHeader>
            <CardTitle>关键价格点</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">年度最高</p>
                <p className="text-lg font-semibold text-green-600">{keyLevels.yearHigh.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">年度最低</p>
                <p className="text-lg font-semibold text-red-600">{keyLevels.yearLow.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">近期最高</p>
                <p className="text-lg font-semibold">{keyLevels.recentHigh.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">近期最低</p>
                <p className="text-lg font-semibold">{keyLevels.recentLow.toFixed(2)}</p>
              </div>
            </div>
            {keyLevels.support.support.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground mb-2">支撑位</p>
                <div className="flex gap-2">
                  {keyLevels.support.support.map((level, index) => (
                    <Badge key={index} variant="outline" className="text-green-600">
                      {level.toFixed(2)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {keyLevels.support.resistance.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">阻力位</p>
                <div className="flex gap-2">
                  {keyLevels.support.resistance.map((level, index) => (
                    <Badge key={index} variant="outline" className="text-red-600">
                      {level.toFixed(2)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 成交量分析 */}
        <Card>
          <CardHeader>
            <CardTitle>成交量分析</CardTitle>
            <CardDescription>
              {volumeAnalysis.volumeTrend === 'INCREASING' ? '成交量放大' : 
               volumeAnalysis.volumeTrend === 'DECREASING' ? '成交量萎缩' : '成交量平稳'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">平均成交量</p>
              <p className="text-lg font-semibold">{volumeAnalysis.averageVolume.toLocaleString()}</p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>成交量强度</span>
                <span className="font-semibold">{volumeAnalysis.volumeStrength.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{ width: `${Math.min(100, volumeAnalysis.volumeStrength)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* K线形态 */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>识别的K线形态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patterns.map((pattern, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{pattern.name}</h4>
                    <Badge variant={pattern.type === 'BULLISH' ? 'default' : pattern.type === 'BEARISH' ? 'destructive' : 'secondary'}>
                      {pattern.type === 'BULLISH' ? '看涨' : pattern.type === 'BEARISH' ? '看跌' : '中性'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{pattern.description}</p>
                  <p className="text-xs text-muted-foreground">可靠性: {pattern.reliability}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
