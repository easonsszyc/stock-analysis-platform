import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Target, Shield, Clock, AlertTriangle } from 'lucide-react';

interface TradingStrategy {
  适配度: number;
  推荐指数: number;
  风险等级: 'LOW' | 'MEDIUM' | 'HIGH';
  入场建议: string;
  出场建议: string;
  止损建议: string;
  预期收益: string;
  持仓时长: string;
  操作要点: string[];
  风险提示: string[];
}

interface TradingStrategyCardProps {
  title: string;
  description: string;
  strategy: TradingStrategy;
  icon: 'scalping' | 'swing';
}

export function TradingStrategyCard({ title, description, strategy, icon }: TradingStrategyCardProps) {
  // 数据验证，防止undefined错误
  if (!strategy || !strategy.操作要点 || !strategy.风险提示) {
    return (
      <Card className="shadow-lg border-2">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            策略数据加载中...
          </div>
        </CardContent>
      </Card>
    );
  }
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRiskBadge = (risk: string) => {
    const colors = {
      LOW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      HIGH: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    const labels = {
      LOW: '低风险',
      MEDIUM: '中等风险',
      HIGH: '高风险'
    };
    return { color: colors[risk as keyof typeof colors], label: labels[risk as keyof typeof labels] };
  };

  const riskBadge = getRiskBadge(strategy.风险等级);

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-2">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {icon === 'scalping' ? (
              <Activity className="w-8 h-8 text-primary" />
            ) : (
              <TrendingUp className="w-8 h-8 text-primary" />
            )}
            <div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription className="text-base mt-1">{description}</CardDescription>
            </div>
          </div>
          <Badge className={riskBadge.color}>{riskBadge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* 适配度评分 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">适配度</div>
            <div className={`text-3xl font-bold ${getScoreColor(strategy.适配度)}`}>
              {strategy.适配度}%
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">推荐指数</div>
            <div className={`text-3xl font-bold ${getScoreColor(strategy.推荐指数)}`}>
              {strategy.推荐指数}%
            </div>
          </div>
        </div>

        {/* 关键信息 */}
        <div className="grid gap-4">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Target className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-sm mb-1">入场建议</div>
              <div className="text-sm">{strategy.入场建议}</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <TrendingDown className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-sm mb-1">出场建议</div>
              <div className="text-sm">{strategy.出场建议}</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-sm mb-1">止损建议</div>
              <div className="text-sm">{strategy.止损建议}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1">持仓时长</div>
                <div className="text-sm">{strategy.持仓时长}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1">预期收益</div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400">{strategy.预期收益}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 操作要点 */}
        <div>
          <div className="font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            操作要点
          </div>
          <ul className="space-y-2">
            {strategy.操作要点.map((point, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-1">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 风险提示 */}
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="font-semibold mb-3 flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
            <AlertTriangle className="w-4 h-4" />
            风险提示
          </div>
          <ul className="space-y-2">
            {strategy.风险提示.map((warning, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-300">
                <span className="mt-1">⚠</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
