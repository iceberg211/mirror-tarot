'use client';

import { useSyncExternalStore } from 'react';

function subscribe() {
  return () => {};
}

/**
 * SSR 恒为 false，客户端挂载后为 true。
 * 用于依赖 localStorage 的 UI，避免水合不一致。
 */
export function useClientReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
