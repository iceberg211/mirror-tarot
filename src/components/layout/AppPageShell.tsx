'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

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
  return (
    <main className="relative min-h-screen overflow-y-auto bg-[#05060A] pb-28 text-foreground select-none">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,167,106,0.10),transparent_34%),linear-gradient(180deg,rgba(7,9,15,0.10),rgba(5,6,10,0.97)_62%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col px-6 pt-7">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="grid grid-cols-[1fr_auto] items-end gap-5 border-b border-gold/12 pb-5"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gold-muted/55">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-[34px] font-serif font-semibold leading-none tracking-normal text-gold drop-shadow-[0_0_16px_rgba(201,167,106,0.22)]">
              {title}
            </h1>
            <p className="mt-4 text-xs font-serif leading-6 tracking-wide text-foreground/70">
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
