import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, TrendingUp, TrendingDown, Activity, Target, BarChart3, AlertTriangle, Zap, Clock, TrendingUpIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BacktestConfig {
  rsiOverbought: number;
  rsiOversold: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  
  // 趋势过滤模块
  useTrendFilter?: boolean;
  maPeriod?: number;
  maType?: 'SMA' | 'EMA';
  
  // ATR动态止损
  useATRStop?: boolean;
  atrPeriod?: number;
  atrMultiplier?: number;
}

interface BacktestResult {
  symbol: string;
  startDate: string;
  endDate: string;
  tradingDays: number;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
  equityCurve: Array<{ date: string; time: string; equity: number }>;
  trades: Array<{
    tradeId: number;
    entryDate: string;
    entryTime: string;
    entryPrice: number;
    exitDate: string | null;
    exitTime: string | null;
    exitPrice: number | null;
    shares: number;
    profit: number | null;
    profitPercent: number | null;
    exitReason: string | null;
  }>;
}

type TradingStyle = 'scalping' | 'day_trading' | 'swing_trading';

const TRADING_STYLE_PRESETS: Record<TradingStyle, { label: string; icon: any; config: BacktestConfig; description: string }> = {
  scalping: {
    label: '剥头皮',
    icon: Zap,
    description: '超短线，持仓<5分钟，高频交易',
    config: {
      rsiOverbought: 75,
      rsiOversold: 25,
      positionSize: 0.2,
      stopLoss: -0.01,
      takeProfit: 0.015,
    },
  },
  day_trading: {
    label: '日内交易',
    icon: Clock,
    description: '中短线，持仓<1天，中频交易',
    config: {
      rsiOverbought: 70,
      rsiOversold: 30,
      positionSize: 0.3,
      stopLoss: -0.03,
      takeProfit: 0.05,
    },
  },
  swing_trading: {
    label: '波段交易',
    icon: TrendingUpIcon,
    description: '中长线，持仓3-10天，低频交易',
    config: {
      rsiOverbought: 65,
      rsiOversold: 35,
      positionSize: 0.4,
      stopLoss: -0.08,
      takeProfit: 0.15,
    },
  },
};

export default function StrategyLab() {
  const [symbol, setSymbol] = useState('9988');
  const [market, setMarket] = useState('HK');
  const [startDate, setStartDate] = useState('2025-11-01');
  const [endDate, setEndDate] = useState('2026-01-30');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [tradingStyle, setTradingStyle] = useState<TradingStyle>('day_trading');
  
  const [config, setConfig] = useState<BacktestConfig>(TRADING_STYLE_PRESETS.day_trading.config);
  
  const handleTradingStyleChange = (style: TradingStyle) => {
    setTradingStyle(style);
    setConfig(TRADING_STYLE_PRESETS[style].config);
  };

  const runBacktest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          market,
          startDate,
          endDate,
          config,
        }),
      });
      
      if (!response.ok) {
        throw new Error('回测失败');
      }
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error running backtest:', error);
      alert('回测失败，请检查参数后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">策略优化实验室</h1>
          <p className="text-muted-foreground mt-2">
            调整参数，回测历史数据，优化交易策略
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：参数配置 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>策略参数配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 交易风格选择 */}
            <div className="space-y-2">
              <Label>交易风格</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(TRADING_STYLE_PRESETS) as TradingStyle[]).map((style) => {
                  const preset = TRADING_STYLE_PRESETS[style];
                  const Icon = preset.icon;
                  const isActive = tradingStyle === style;
                  return (
                    <button
                      key={style}
                      onClick={() => handleTradingStyleChange(style)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isActive
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <div className={`text-xs font-medium ${
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {preset.label}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {TRADING_STYLE_PRESETS[tradingStyle].description}
              </p>
            </div>

            {/* 股票选择 */}
            <div className="space-y-2">
              <Label>股票代码</Label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="例如：9988, AAPL, 600519"
              />
            </div>

            <div className="space-y-2">
              <Label>市场</Label>
              <select
                className="w-full p-2 border rounded-md bg-background"
                value={market}
                onChange={(e) => setMarket(e.target.value)}
              >
                <option value="CN">A股</option>
                <option value="HK">港股</option>
                <option value="US">美股</option>
              </select>
            </div>

            {/* 时间范围 */}
            <div className="space-y-2">
              <Label>开始日期</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>结束日期</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold">技术指标参数</h3>
              
              {/* RSI超买线 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>RSI超买线</Label>
                  <span className="text-sm text-muted-foreground">{config.rsiOverbought}</span>
                </div>
                <Slider
                  value={[config.rsiOverbought]}
                  onValueChange={([value]) => setConfig({ ...config, rsiOverbought: value })}
                  min={60}
                  max={80}
                  step={1}
                />
              </div>

              {/* RSI超卖线 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>RSI超卖线</Label>
                  <span className="text-sm text-muted-foreground">{config.rsiOversold}</span>
                </div>
                <Slider
                  value={[config.rsiOversold]}
                  onValueChange={([value]) => setConfig({ ...config, rsiOversold: value })}
                  min={20}
                  max={40}
                  step={1}
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold">仓位管理</h3>
              
              {/* 单次仓位 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>单次投入比例</Label>
                  <span className="text-sm text-muted-foreground">{(config.positionSize * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[config.positionSize * 100]}
                  onValueChange={([value]) => setConfig({ ...config, positionSize: value / 100 })}
                  min={10}
                  max={50}
                  step={5}
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold">趋势过滤模块</h3>
              
              {/* 启用趋势过滤 */}
              <div className="flex items-center justify-between">
                <Label>启用MA趋势过滤</Label>
                <input
                  type="checkbox"
                  checked={config.useTrendFilter !== false}
                  onChange={(e) => setConfig({ ...config, useTrendFilter: e.target.checked })}
                  className="w-4 h-4"
                />
              </div>
              
              {config.useTrendFilter !== false && (
                <>
                  {/* MA周期 */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>MA均线周期</Label>
                      <span className="text-sm text-muted-foreground">{config.maPeriod || 20}</span>
                    </div>
                    <Slider
                      value={[config.maPeriod || 20]}
                      onValueChange={([value]) => setConfig({ ...config, maPeriod: value })}
                      min={10}
                      max={120}
                      step={10}
                    />
                  </div>
                  
                  {/* MA类型 */}
                  <div className="space-y-2">
                    <Label>MA类型</Label>
                    <select
                      className="w-full p-2 border rounded-md bg-background"
                      value={config.maType || 'SMA'}
                      onChange={(e) => setConfig({ ...config, maType: e.target.value as 'SMA' | 'EMA' })}
                    >
                      <option value="SMA">简单移动平均(SMA)</option>
                      <option value="EMA">指数移动平均(EMA)</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold">风险控制</h3>
              
              {/* 启用ATR动态止损 */}
              <div className="flex items-center justify-between">
                <Label>启用ATR动态止损</Label>
                <input
                  type="checkbox"
                  checked={config.useATRStop !== false}
                  onChange={(e) => setConfig({ ...config, useATRStop: e.target.checked })}
                  className="w-4 h-4"
                />
              </div>
              
              {config.useATRStop !== false && (
                <>
                  {/* ATR周期 */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>ATR周期</Label>
                      <span className="text-sm text-muted-foreground">{config.atrPeriod || 14}</span>
                    </div>
                    <Slider
                      value={[config.atrPeriod || 14]}
                      onValueChange={([value]) => setConfig({ ...config, atrPeriod: value })}
                      min={7}
                      max={30}
                      step={1}
                    />
                  </div>
                  
                  {/* ATR倍数 */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>ATR倍数</Label>
                      <span className="text-sm text-muted-foreground">{(config.atrMultiplier || 2.0).toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[(config.atrMultiplier || 2.0) * 10]}
                      onValueChange={([value]) => setConfig({ ...config, atrMultiplier: value / 10 })}
                      min={10}
                      max={40}
                      step={1}
                    />
                  </div>
                </>
              )}
              
              {/* 固定止损线（仅当未启用ATR时显示） */}
              {config.useATRStop === false && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>止损线</Label>
                    <span className="text-sm text-muted-foreground">{(config.stopLoss * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[Math.abs(config.stopLoss) * 100]}
                    onValueChange={([value]) => setConfig({ ...config, stopLoss: -value / 100 })}
                    min={1}
                    max={10}
                    step={0.5}
                  />
                </div>
              )}

              {/* 止盈线 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>止盈线</Label>
                  <span className="text-sm text-muted-foreground">+{(config.takeProfit * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[config.takeProfit * 100]}
                  onValueChange={([value]) => setConfig({ ...config, takeProfit: value / 100 })}
                  min={2}
                  max={15}
                  step={0.5}
                />
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={runBacktest}
              disabled={loading}
            >
              <Play className="h-4 w-4 mr-2" />
              {loading ? '回测中...' : '开始回测'}
            </Button>
          </CardContent>
        </Card>

        {/* 右侧：回测结果 */}
        <div className="lg:col-span-2 space-y-6">
          {!result ? (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>配置参数后点击"开始回测"查看结果</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 核心指标卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">总收益率</div>
                    <div className={`text-2xl font-bold ${result.totalReturn >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {result.totalReturn >= 0 ? '+' : ''}{(result.totalReturn * 100).toFixed(2)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">最大回撤</div>
                    <div className="text-2xl font-bold text-red-500">
                      {(result.maxDrawdown * 100).toFixed(2)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">胜率</div>
                    <div className="text-2xl font-bold">
                      {(result.winRate * 100).toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">夏普比率</div>
                    <div className="text-2xl font-bold">
                      {result.sharpeRatio.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 资金曲线图 */}
              <Card>
                <CardHeader>
                  <CardTitle>资金曲线</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={result.equityCurve}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="equity" 
                        stroke="#10b981" 
                        name="总资产"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 详细统计 */}
              <Card>
                <CardHeader>
                  <CardTitle>详细统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">初始资金</div>
                      <div className="text-lg font-semibold">{result.initialCapital.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">最终资金</div>
                      <div className="text-lg font-semibold">{result.finalCapital.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">年化收益率</div>
                      <div className="text-lg font-semibold">{(result.annualizedReturn * 100).toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">交易次数</div>
                      <div className="text-lg font-semibold">{result.totalTrades}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">盈利交易</div>
                      <div className="text-lg font-semibold text-red-500">{result.winningTrades}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">亏损交易</div>
                      <div className="text-lg font-semibold text-green-500">{result.losingTrades}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">平均盈利</div>
                      <div className="text-lg font-semibold text-red-500">+{result.avgProfit.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">平均亏损</div>
                      <div className="text-lg font-semibold text-green-500">{result.avgLoss.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">盈亏比</div>
                      <div className="text-lg font-semibold">{result.profitFactor.toFixed(2)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 交易明细 */}
              <Card>
                <CardHeader>
                  <CardTitle>交易明细</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">交易ID</th>
                          <th className="text-left p-2">买入时间</th>
                          <th className="text-right p-2">买入价</th>
                          <th className="text-left p-2">卖出时间</th>
                          <th className="text-right p-2">卖出价</th>
                          <th className="text-right p-2">股数</th>
                          <th className="text-right p-2">盈亏</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.trades.map((trade) => (
                          <tr key={trade.tradeId} className="border-b">
                            <td className="p-2">{trade.tradeId}</td>
                            <td className="p-2">{trade.entryDate} {trade.entryTime}</td>
                            <td className="text-right p-2">{trade.entryPrice.toFixed(2)}</td>
                            <td className="p-2">
                              {trade.exitDate ? `${trade.exitDate} ${trade.exitTime}` : '-'}
                            </td>
                            <td className="text-right p-2">
                              {trade.exitPrice ? trade.exitPrice.toFixed(2) : '-'}
                            </td>
                            <td className="text-right p-2">{trade.shares}</td>
                            <td className={`text-right p-2 font-semibold ${
                              trade.profit === null ? '' :
                              trade.profit >= 0 ? 'text-red-500' : 'text-green-500'
                            }`}>
                              {trade.profit === null ? '持仓中' : 
                                `${trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
