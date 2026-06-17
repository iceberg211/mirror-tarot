'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';

export default function JournalHeader() {
  return (
    <div className="w-full max-w-md px-6 pt-12 flex flex-col items-start gap-1">
      <h1 className="text-2xl font-serif tracking-widest text-gold font-bold flex items-center gap-2">
        <BookOpen className="w-5 h-5" />
        <span>情绪日记</span>
      </h1>
      <p className="text-[10px] text-gold-muted/60 font-mono tracking-wider uppercase">
        Mirror Tarot Journal History
      </p>
    </div>
  );
}
