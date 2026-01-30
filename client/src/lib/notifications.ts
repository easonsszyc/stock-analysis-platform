/**
 * 浏览器通知工具函数
 */

/**
 * 请求通知权限
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('此浏览器不支持桌面通知');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * 检查是否有通知权限
 */
export function hasNotificationPermission(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * 发送桌面通知
 */
export function sendNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!hasNotificationPermission()) {
    console.warn('没有通知权限，无法发送通知');
    return null;
  }

  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    // 点击通知时聚焦窗口
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // 5秒后自动关闭
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  } catch (error) {
    console.error('发送通知失败:', error);
    return null;
  }
}

/**
 * 发送价格预警通知
 */
export function sendPriceAlertNotification(
  symbol: string,
  currentPrice: number,
  targetPrice: number,
  alertType: 'above' | 'below'
) {
  const direction = alertType === 'above' ? '突破' : '跌破';
  const emoji = alertType === 'above' ? '📈' : '📉';
  
  sendNotification(`${emoji} ${symbol} 价格预警`, {
    body: `${symbol} 当前价格 ${currentPrice.toFixed(2)} 已${direction}预警价格 ${targetPrice.toFixed(2)}`,
    tag: `price-alert-${symbol}`,
    requireInteraction: true, // 需要用户交互才关闭
  });
}
