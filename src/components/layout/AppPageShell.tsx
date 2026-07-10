'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTheme } from '@/components/theme/ThemeProvider';

interface AppPageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  children: React.ReactNode;
}

export default function AppPageShell({
  eyebrow,
  title,
  description,
  imageSrc,
  imageAlt,
  children,
}: AppPageShellProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="relative min-h-screen overflow-y-auto bg-background pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-foreground transition-colors duration-400">
      <div className={`pointer-events-none fixed inset-0 transition-all duration-400 ${
        theme === 'dark'
          ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(201,167,106,0.10),transparent_34%),linear-gradient(180deg,rgba(7,9,15,0.10),rgba(5,6,10,0.97)_62%)]'
          : 'bg-[radial-gradient(circle_at_50%_0%,rgba(165,128,67,0.06),transparent_34%)]'
      }`} />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col px-6 pt-7">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="grid grid-cols-[1fr_auto] items-end gap-5 border-b border-gold/12 pb-5"
        >
          <div className="min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono uppercase tracking-[0.28em] text-gold-muted">
                {eyebrow}
              </p>
              <button
                type="button"
                onClick={toggleTheme}
                className="min-h-11 min-w-11 flex items-center justify-center rounded-full border border-gold/15 bg-gold/5 text-gold hover:border-gold/45 transition-all duration-300 cursor-pointer pointer-events-auto shadow-gold-glow"
                title={theme === 'dark' ? '切换亮色' : '切换暗色'}
                aria-label={theme === 'dark' ? '切换为亮色主题' : '切换为暗色主题'}
              >
                {theme === 'dark' ? (
                  <span className="text-[11px] leading-none">☀</span>
                ) : (
                  <span className="text-[11px] leading-none">☾</span>
                )}
              </button>
            </div>
            <h1 className="mt-3 text-[34px] font-serif font-semibold leading-none tracking-normal text-gold drop-shadow-[0_0_16px_rgba(201,167,106,0.22)]">
              {title}
            </h1>
            <p className="mt-4 text-sm font-serif leading-6 tracking-wide text-foreground/85">
              {description}
            </p>
          </div>

          <div className="relative h-[126px] w-[74px] shrink-0 rotate-3 overflow-hidden rounded-[9px] border border-gold/18 shadow-[0_24px_50px_rgba(0,0,0,0.48)]">
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={74}
              height={126}
              priority={false}
              sizes="74px"
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05060A]/35 via-transparent to-transparent" />
          </div>
        </motion.header>

        {children}
      </div>
    </main>
  );
}
