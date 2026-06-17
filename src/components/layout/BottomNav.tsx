'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, BookOpen, Book } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: '首页', href: '/', icon: Compass },
    { name: '牌库', href: '/deck', icon: Book },
    { name: '日记', href: '/journal', icon: BookOpen },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-4 pointer-events-none">
      <div className="w-full max-w-md h-16 rounded-2xl glassmorphism px-6 flex justify-around items-center shadow-gold-glow pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                isActive
                  ? 'text-gold scale-105 filter drop-shadow-[0_0_5px_rgba(201,167,106,0.4)]'
                  : 'text-gold-muted/65 hover:text-gold/80'
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
