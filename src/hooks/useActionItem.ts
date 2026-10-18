'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getLatestActionSeed,
  toggleActionSeedStatus,
  setReadingActionSeed,
  type ActiveActionSeedItem,
} from '@/lib/db/localJournal';
import { useAudio } from '@/hooks/useAudio';

export function useActionItem() {
  const [activeItem, setActiveItem] = useState<ActiveActionSeedItem | null>(() => {
    try {
      return getLatestActionSeed();
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const { playReveal } = useAudio();

  const refreshActionItem = useCallback(() => {
    try {
      const latest = getLatestActionSeed();
      setActiveItem(latest);
    } catch (e) {
      console.error('Failed to load active action item:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleSeedUpdate = () => {
      refreshActionItem();
    };

    window.addEventListener('mirror_action_seed_updated', handleSeedUpdate);
    window.addEventListener('storage', handleSeedUpdate);

    return () => {
      window.removeEventListener('mirror_action_seed_updated', handleSeedUpdate);
      window.removeEventListener('storage', handleSeedUpdate);
    };
  }, [refreshActionItem]);

  const toggleComplete = useCallback(() => {
    if (!activeItem) return;
    const isNowCompleted = activeItem.actionSeed.status !== 'completed';
    const updated = toggleActionSeedStatus(activeItem.readingId);
    if (updated) {
      setActiveItem((prev) =>
        prev ? { ...prev, actionSeed: updated } : null
      );
      if (isNowCompleted) {
        try {
          playReveal();
        } catch {
          /* fail soft */
        }
      }
    }
  }, [activeItem, playReveal]);

  const acceptAction = useCallback(
    (readingId: string, customSeedText?: string) => {
      const updated = setReadingActionSeed(readingId, customSeedText);
      if (updated) {
        refreshActionItem();
      }
      return updated;
    },
    [refreshActionItem]
  );

  return {
    activeItem,
    loading,
    toggleComplete,
    acceptAction,
    refreshActionItem,
  };
}
