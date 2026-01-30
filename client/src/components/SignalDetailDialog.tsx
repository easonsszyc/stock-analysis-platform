import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, Target, Shield } from "lucide-react";

interface SignalDetail {
  time: string;
  price: number;
  type: "buy" | "sell" | "hold";
  strength: number;
  indicators?: {
    rsi?: number;
    macd?: { value: number; signal: number; histogram: number };
    kdj?: { k: number; d: number; j: number };
    bollingerBands?: { upper: number; middle: number; lower: number };
  };
  reasons: string[];
  stopLoss?: number;
  target?: number; // 兼容IntradayChart的target字段
  takeProfit?: number;
  riskRewardRatio?: number;
  confidence?: "high" | "medium" | "low";
}

interface SignalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signal: SignalDetail | null;
  currentPrice: number;
}

export function SignalDetailDialog({ open, onOpenChange, signal, currentPrice }: SignalDetailDialogProps) {
  if (!signal) return null;

  const isBuy = signal.type === "buy";
  const targetPrice = signal.takeProfit || signal.target || signal.price * (isBuy ? 1.05 : 0.95);
  const stopLossPrice = signal.stopLoss || signal.price * (isBuy ? 0.97 : 1.03);
  
  const potentialProfit = ((targetPrice - currentPrice) / currentPrice) * 100;
  const potentialLoss = ((currentPrice - stopLossPrice) / currentPrice) * 100;
  const riskReward = signal.riskRewardRatio || Math.abs(potentialProfit / potentialLoss);

  const getConfidenceColor = (confidence?: string) => {
    switch (confidence) {
      case "high":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "low":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const getConfidenceLabel = (confidence?: string) => {
    switch (confidence) {
      case "high":
        return "高置信度";
      case "medium":
        return "中等置信度";
      case "low":
        return "低置信度";
      default:
        return "中等置信度";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card/95 backdrop-blur-sm">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              {isBuy ? (
                <TrendingUp className="w-6 h-6 text-red-500" />
              ) : (
                <TrendingDown className="w-6 h-6 text-green-500" />
              )}
              <span>{isBuy ? "买入" : "卖出"}信号详情</span>
            </DialogTitle>
            <Badge className={getConfidenceColor(signal.confidence)}>
              {getConfidenceLabel(signal.confidence)}
            </Badge>
          </div>
          <DialogDescription className="text-muted-foreground">
            {signal.time} · 价格 {signal.price.toFixed(2)} · 信号强度 {signal.strength}%
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 信号原因 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              信号触发原因
            </h3>
            <ul className="space-y-1">
              {signal.reasons.map((reason, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 技术指标 */}
          {signal.indicators && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">技术指标数值</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* RSI */}
                {signal.indicators.rsi !== undefined && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">RSI (相对强弱指标)</div>
                    <div className="text-lg font-semibold text-foreground">{signal.indicators.rsi.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {signal.indicators.rsi > 70
                        ? "超买区域"
                        : signal.indicators.rsi < 30
                        ? "超卖区域"
                        : "中性区域"}
                    </div>
                  </div>
                )}

                {/* MACD */}
                {signal.indicators.macd && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">MACD</div>
                    <div className="space-y-0.5">
                      <div className="text-sm text-foreground">
                        DIF: {signal.indicators.macd.value.toFixed(4)}
                      </div>
                      <div className="text-sm text-foreground">
                        DEA: {signal.indicators.macd.signal.toFixed(4)}
                      </div>
                      <div className="text-sm text-foreground">
                        柱状图: {signal.indicators.macd.histogram.toFixed(4)}
                      </div>
                    </div>
                  </div>
                )}

                {/* KDJ */}
                {signal.indicators.kdj && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">KDJ</div>
                    <div className="space-y-0.5">
                      <div className="text-sm text-foreground">K: {signal.indicators.kdj.k.toFixed(2)}</div>
                      <div className="text-sm text-foreground">D: {signal.indicators.kdj.d.toFixed(2)}</div>
                      <div className="text-sm text-foreground">J: {signal.indicators.kdj.j.toFixed(2)}</div>
                    </div>
                  </div>
                )}

                {/* 布林带 */}
                {signal.indicators.bollingerBands && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">布林带</div>
                    <div className="space-y-0.5">
                      <div className="text-sm text-foreground">
                        上轨: {signal.indicators.bollingerBands.upper.toFixed(2)}
                      </div>
                      <div className="text-sm text-foreground">
                        中轨: {signal.indicators.bollingerBands.middle.toFixed(2)}
                      </div>
                      <div className="text-sm text-foreground">
                        下轨: {signal.indicators.bollingerBands.lower.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 交易建议 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">交易建议</h3>
            <div className="grid grid-cols-1 gap-3">
              {/* 止损建议 */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">止损价位</div>
                  <div className="text-lg font-semibold text-green-500">{stopLossPrice.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    潜在亏损: {potentialLoss.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* 止盈建议 */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Target className="w-5 h-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">止盈价位</div>
                  <div className="text-lg font-semibold text-red-500">{targetPrice.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    潜在收益: {potentialProfit.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* 风险收益比 */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium text-foreground">风险收益比</div>
                <div className="text-lg font-semibold text-primary">
                  1:{riskReward.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* 操作提示 */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="text-sm font-medium text-yellow-500">风险提示</div>
                <div className="text-xs text-muted-foreground">
                  • 技术分析信号仅供参考，不构成投资建议
                </div>
                <div className="text-xs text-muted-foreground">
                  • 请结合市场环境和个人风险承受能力做出决策
                </div>
                <div className="text-xs text-muted-foreground">
                  • 建议设置严格的止损，控制风险敞口
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
