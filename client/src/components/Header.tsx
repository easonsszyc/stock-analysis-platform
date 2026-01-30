/**
 * 全局导航Header组件
 * 支持桌面端和移动端响应式设计
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { BarChart3, Star, Moon, Sun, Menu, X, FlaskConical } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export function Header() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: '股票分析', icon: BarChart3 },
    { path: '/watchlist', label: '自选股', icon: Star },
    { path: '/strategy-lab', label: '策略实验室', icon: FlaskConical },
  ];

  const handleNavClick = (path: string) => {
    window.location.href = path;
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-700 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/80">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <BarChart3 className="w-6 h-6 text-primary" />
          <span className="text-lg font-bold">智能股票分析</span>
        </a>

        {/* 桌面端导航菜单 */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Button
                key={item.path}
                variant={isActive ? 'default' : 'ghost'}
                className={`gap-2 ${isActive ? '' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => handleNavClick(item.path)}
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

        {/* 移动端汉堡菜单按钮 */}
        <div className="flex md:hidden items-center gap-2">
          {/* 主题切换按钮（移动端） */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title="切换主题"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            title="菜单"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </Button>
        </div>
      </div>

      {/* 移动端菜单展开内容 */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-700 bg-black/95 backdrop-blur">
          <nav className="container py-4 flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? 'default' : 'ghost'}
                  className={cn(
                    "w-full justify-start gap-3 h-12",
                    isActive ? '' : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => handleNavClick(item.path)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-base">{item.label}</span>
                </Button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
