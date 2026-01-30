/**
 * 市场状态工具函数
 * 判断美股/港股/A股市场是否在交易时间内
 */

/**
 * 判断美股是否在交易时间内
 * 美股交易时间（美东时间）：
 * - 盘前：04:00-09:30
 * - 正常交易：09:30-16:00
 * - 盘后：16:00-20:00
 */
export function isUSMarketOpen(): boolean {
  const now = new Date();
  const etTimeStr = now.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short'
  });
  
  // 检查是否是工作日
  const weekday = etTimeStr.split(',')[0];
  if (weekday === 'Sat' || weekday === 'Sun') {
    return false;
  }
  
  // 提取时间
  const timeMatch = etTimeStr.match(/(\d{2}):(\d{2})/);
  if (!timeMatch) return false;
  
  const hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const timeInMinutes = hours * 60 + minutes;
  
  // 正常交易时间：09:30-16:00
  const marketOpen = 9 * 60 + 30; // 09:30
  const marketClose = 16 * 60; // 16:00
  
  return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
}

/**
 * 获取美股市场状态描述
 */
export function getUSMarketStatus(): {
  isOpen: boolean;
  status: string;
  description: string;
} {
  const isOpen = isUSMarketOpen();
  
  if (isOpen) {
    return {
      isOpen: true,
      status: '交易中',
      description: '美股市场正在交易中，显示实时数据'
    };
  } else {
    return {
      isOpen: false,
      status: '已收盘',
      description: '美股市场已收盘，显示上一交易日数据'
    };
  }
}

/**
 * 判断港股是否在交易时间内
 * 港股交易时间（香港时间）：
 * - 上午：09:30-12:00
 * - 下午：13:00-16:00
 */
export function isHKMarketOpen(): boolean {
  const now = new Date();
  const hkTimeStr = now.toLocaleString('en-US', {
    timeZone: 'Asia/Hong_Kong',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short'
  });
  
  // 检查是否是工作日
  const weekday = hkTimeStr.split(',')[0];
  if (weekday === 'Sat' || weekday === 'Sun') {
    return false;
  }
  
  // 提取时间
  const timeMatch = hkTimeStr.match(/(\d{2}):(\d{2})/);
  if (!timeMatch) return false;
  
  const hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const timeInMinutes = hours * 60 + minutes;
  
  // 上午交易：09:30-12:00
  const morningOpen = 9 * 60 + 30;
  const morningClose = 12 * 60;
  
  // 下午交易：13:00-16:00
  const afternoonOpen = 13 * 60;
  const afternoonClose = 16 * 60;
  
  return (timeInMinutes >= morningOpen && timeInMinutes < morningClose) ||
         (timeInMinutes >= afternoonOpen && timeInMinutes < afternoonClose);
}

/**
 * 判断A股是否在交易时间内
 * A股交易时间（北京时间）：
 * - 上午：09:30-11:30
 * - 下午：13:00-15:00
 */
export function isCNMarketOpen(): boolean {
  const now = new Date();
  const cnTimeStr = now.toLocaleString('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short'
  });
  
  // 检查是否是工作日
  const weekday = cnTimeStr.split(',')[0];
  if (weekday === 'Sat' || weekday === 'Sun') {
    return false;
  }
  
  // 提取时间
  const timeMatch = cnTimeStr.match(/(\d{2}):(\d{2})/);
  if (!timeMatch) return false;
  
  const hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const timeInMinutes = hours * 60 + minutes;
  
  // 上午交易：09:30-11:30
  const morningOpen = 9 * 60 + 30;
  const morningClose = 11 * 60 + 30;
  
  // 下午交易：13:00-15:00
  const afternoonOpen = 13 * 60;
  const afternoonClose = 15 * 60;
  
  return (timeInMinutes >= morningOpen && timeInMinutes < morningClose) ||
         (timeInMinutes >= afternoonOpen && timeInMinutes < afternoonClose);
}
