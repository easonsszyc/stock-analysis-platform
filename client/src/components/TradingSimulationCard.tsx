import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, Target, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradingSimulationResult {
  initialCapital: number;
  finalCapital: number;
  totalProfit: number;
  totalProfitPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  openPositions: number;
}

interface TradingSimulationCardProps {
  simulation: TradingSimulationResult;
  currency?: string;
}

export function TradingSimulationCard({ 
  simulation, 
  currency = 'USD' 
}: TradingSimulationCardProps) {
  const isProfit = simulation.totalProfit >= 0;
  const profitColor = isProfit ? 'text-red-500' : 'text-green-500';
  const bgColor = isProfit ? 'bg-red-500/10' : 'bg-green-500/10';
  const borderColor = isProfit ? 'border-red-500/30' : 'border-green-500/30';

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          模拟交易盈亏分析
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          基于当天买卖信号的模拟交易统计（初始资金: {simulation.initialCapital.toLocaleString()} {currency}）
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 总盈亏展示 */}
        <div className={cn('rounded-lg p-6 border', bgColor, borderColor)}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">总盈亏</div>
              <div className={cn('text-4xl font-bold', profitColor)}>
                {isProfit ? '+' : ''}{simulation.totalProfit.toFixed(2)} {currency}
              </div>
              <div className={cn('text-lg font-semibold mt-1', profitColor)}>
                {isProfit ? '+' : ''}{simulation.totalProfitPercent.toFixed(2)}%
              </div>
            </div>
            <div className={cn('p-4 rounded-full', bgColor)}>
              {isProfit ? (
                <TrendingUp className={cn('h-12 w-12', profitColor)} />
              ) : (
                <TrendingDown className={cn('h-12 w-12', profitColor)} />
              )}
            </div>
          </div>
        </div>

        {/* 统计数据网格 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 最终资金 */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <BarChart3 className="h-4 w-4" />
              最终资金
            </div>
            <div className="text-2xl font-bold">
              {simulation.finalCapital.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {currency}
            </div>
          </div>

          {/* 交易次数 */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <Activity className="h-4 w-4" />
              交易次数
            </div>
            <div className="text-2xl font-bold">
              {simulation.totalTrades}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              已完成交易
            </div>
          </div>

          {/* 胜率 */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <Target className="h-4 w-4" />
              胜率
            </div>
            <div className={cn(
              'text-2xl font-bold',
              simulation.winRate >= 50 ? 'text-red-500' : 'text-green-500'
            )}>
              {simulation.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {simulation.winningTrades}胜 / {simulation.losingTrades}负
            </div>
          </div>

          {/* 未平仓 */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <Activity className="h-4 w-4" />
              未平仓
            </div>
            <div className="text-2xl font-bold text-amber-500">
              {simulation.openPositions}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              持仓中
            </div>
          </div>
        </div>

        {/* 说明文字 */}
        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3">
          <p className="mb-1">📊 <strong>计算规则：</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>每次买入使用当前资金的30%</li>
            <li>根据买卖信号自动配对计算盈亏</li>
            <li>未配对的买入信号视为未平仓</li>
            <li>仅供参考，实际交易需考虑手续费、滑点等因素</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
