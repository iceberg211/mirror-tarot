'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, BookOpen, Moon, Sparkles, UserRound } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';

/** 专注流程：隐藏底栏，避免遮挡关键操作与长文阅读 */
const HIDDEN_PREFIXES = ['/reading/'];

export default function BottomNav() {
  const pathname = usePathname();
  const { theme } = useTheme();

  const shouldHide = HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix)
  );

  if (shouldHide) return null;

  // 更直白的栏目名 + 品牌副标（审计：降低理解成本）
  const navItems = [
    { name: '问牌', href: '/', icon: Compass, aria: '问牌，首页' },
    { name: '洞察', href: '/reflections', icon: Sparkles, aria: '洞察，觉察分析' },
    { name: '日记', href: '/journal', icon: BookOpen, aria: '日记，轨迹列表' },
    { name: '练习', href: '/zen', icon: Moon, aria: '练习，疗愈调息' },
    { name: '我的', href: '/account', icon: UserRound, aria: '我的，账号' },
  ];

  return (
    <nav
      aria-label="主导航"
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none"
    >
      <div className="w-full max-w-md h-[4.25rem] rounded-2xl glassmorphism px-2 flex justify-around items-center shadow-gold-glow pointer-events-auto transition-colors duration-400">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          const activeClasses =
            theme === 'dark'
              ? 'text-gold scale-105 filter drop-shadow-[0_0_5px_rgba(201,167,106,0.4)]'
              : 'text-gold scale-105 filter drop-shadow-[0_0_4px_rgba(165,128,67,0.3)]';

          const inactiveClasses =
            theme === 'dark'
              ? 'text-gold-muted hover:text-gold/90'
              : 'text-gold-muted hover:text-gold';

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.aria}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 transition-all duration-300 ${
                isActive ? activeClasses : inactiveClasses
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="text-[11px] tracking-widest font-serif font-medium leading-none">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
