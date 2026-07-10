'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteLocalReading,
  getLocalReadingById,
  JournalEntry,
  syncJournalData,
  toggleStarReading,
} from '@/lib/db/localJournal';

export function useReadingEntry(id: string) {
  const router = useRouter();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const localData = getLocalReadingById(id);
      if (!cancelled && localData) {
        setEntry(localData);
      }

      try {
        const synced = await syncJournalData();
        if (!cancelled && synced) {
          const syncedData = getLocalReadingById(id);
          if (syncedData) setEntry(syncedData);
        }
      } catch (err) {
        console.error('Reading page sync error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDelete = useCallback(() => {
    if (confirm('确定要删除这篇情绪日记吗？删除后将不可找回。')) {
      deleteLocalReading(id);
      router.push('/journal');
    }
  }, [id, router]);

  const handleToggleStar = useCallback(() => {
    if (!entry) return;
    const ok = toggleStarReading(entry.id);
    if (ok) {
      setEntry((prev) => (prev ? { ...prev, isStarred: !prev.isStarred } : null));
    }
  }, [entry]);

  return {
    entry,
    setEntry,
    loading,
    handleDelete,
    handleToggleStar,
    isStarred: entry?.isStarred || false,
  };
}
