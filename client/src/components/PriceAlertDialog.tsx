/**
 * 价格预警设置对话框组件
 */
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, BellOff } from "lucide-react";

interface PriceAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol: string;
  currentPrice: number;
  existingAlert?: {
    priceUpper?: number;
    priceLower?: number;
  } | null;
  onSave: (priceUpper: number | null, priceLower: number | null) => Promise<void>;
}

export function PriceAlertDialog({ 
  open, 
  onOpenChange, 
  symbol, 
  currentPrice,
  existingAlert,
  onSave 
}: PriceAlertDialogProps) {
  const [priceUpper, setPriceUpper] = useState<string>('');
  const [priceLower, setPriceLower] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // 当对话框打开时，初始化表单值
  useEffect(() => {
    if (open) {
      if (existingAlert) {
        setPriceUpper(existingAlert.priceUpper?.toString() || '');
        setPriceLower(existingAlert.priceLower?.toString() || '');
      } else {
        // 默认设置为当前价格的±5%
        setPriceUpper((currentPrice * 1.05).toFixed(2));
        setPriceLower((currentPrice * 0.95).toFixed(2));
      }
    }
  }, [open, existingAlert, currentPrice]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const upper = priceUpper ? parseFloat(priceUpper) : null;
      const lower = priceLower ? parseFloat(priceLower) : null;

      // 验证输入
      if (upper !== null && lower !== null && upper <= lower) {
        alert('价格上限必须大于价格下限');
        setSaving(false);
        return;
      }

      await onSave(upper, lower);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save price alert:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onSave(null, null);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to clear price alert:', error);
      alert('清除失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            设置价格预警
          </DialogTitle>
          <DialogDescription>
            为 {symbol} 设置价格预警，当价格触及设定值时将收到通知
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 当前价格显示 */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-sm text-muted-foreground">当前价格</div>
            <div className="text-2xl font-bold text-foreground">{currentPrice.toFixed(2)}</div>
          </div>

          {/* 价格上限设置 */}
          <div className="space-y-2">
            <Label htmlFor="priceUpper">价格上限（触发时通知）</Label>
            <Input
              id="priceUpper"
              type="number"
              step="0.01"
              placeholder="留空表示不设置上限"
              value={priceUpper}
              onChange={(e) => setPriceUpper(e.target.value)}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              当价格 ≥ 此值时触发预警通知
            </p>
          </div>

          {/* 价格下限设置 */}
          <div className="space-y-2">
            <Label htmlFor="priceLower">价格下限（触发时通知）</Label>
            <Input
              id="priceLower"
              type="number"
              step="0.01"
              placeholder="留空表示不设置下限"
              value={priceLower}
              onChange={(e) => setPriceLower(e.target.value)}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              当价格 ≤ 此值时触发预警通知
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {existingAlert && (
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={saving}
              className="gap-2"
            >
              <BellOff className="w-4 h-4" />
              清除预警
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存预警'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
