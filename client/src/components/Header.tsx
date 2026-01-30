/**
 * 全局导航Header组件
 */

import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { BarChart3, Star, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function Header() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: '/', label: '股票分析', icon: BarChart3 },
    { path: '/watchlist', label: '自选股', icon: Star },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-700 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/80">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <BarChart3 className="w-6 h-6 text-primary" />
          <span className="text-lg font-bold">智能股票分析</span>
        </a>

        {/* 导航菜单 */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Button
                key={item.path}
                variant={isActive ? 'default' : 'ghost'}
                className={`gap-2 ${isActive ? '' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => window.location.href = item.path}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            );
          })}

          {/* 主题切换按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title="切换主题"
            className="ml-2"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>
        </nav>
      </div>
    </header>
  );
}
