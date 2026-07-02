'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, BookOpen, Moon, Sparkles, UserRound } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';

export default function BottomNav() {
  const pathname = usePathname();
  const { theme } = useTheme();

  const navItems = [
    { name: '镜面', href: '/', icon: Compass },
    { name: '觉察', href: '/reflections', icon: Sparkles },
    { name: '轨迹', href: '/journal', icon: BookOpen },
    { name: '疗愈', href: '/zen', icon: Moon },
    { name: '账号', href: '/account', icon: UserRound },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-4 pointer-events-none">
      <div className="w-full max-w-md h-16 rounded-2xl glassmorphism px-4 flex justify-around items-center shadow-gold-glow pointer-events-auto transition-colors duration-400">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          const activeClasses = theme === 'dark'
            ? 'text-gold scale-105 filter drop-shadow-[0_0_5px_rgba(201,167,106,0.4)]'
            : 'text-gold scale-105 filter drop-shadow-[0_0_4px_rgba(165,128,67,0.3)]';

          const inactiveClasses = theme === 'dark'
            ? 'text-gold-muted/65 hover:text-gold/80'
            : 'text-gold-muted/80 hover:text-gold';

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                isActive ? activeClasses : inactiveClasses
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-widest font-serif font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
