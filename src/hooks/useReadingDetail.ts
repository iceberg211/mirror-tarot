'use client';

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { buildFollowUpSuggestions } from '@/lib/tarot/utils';
import { useReadingEntry } from '@/hooks/reading/useReadingEntry';
import { useReadingGeneration } from '@/hooks/reading/useReadingGeneration';
import { useReadingChat } from '@/hooks/reading/useReadingChat';

export function useReadingDetail(id: string, trigger: boolean) {
  const { user } = useAuth();
  const {
    entry,
    setEntry,
    loading,
    handleDelete,
    handleToggleStar,
    isStarred,
  } = useReadingEntry(id);

  const {
    generating,
    readingText,
    readingError,
    showZen,
    setShowZen,
    activeElement,
    handleRegenerate,
    parsedReading,
    activeFocusIndex,
    formattedDate,
    isReadingEmpty,
    markOnboarding,
  } = useReadingGeneration({
    entry,
    setEntry,
    loading,
    trigger,
    user,
  });

  const {
    chatInput,
    setChatInput,
    showShare,
    setShowShare,
    chatMessages,
    chatLoading,
    chatEndRef,
    handleSendFollowUp,
  } = useReadingChat({
    entry,
    setEntry,
    markOnboarding,
  });

  const defaultSuggestions = useMemo(
    () =>
      entry
        ? buildFollowUpSuggestions({
            question: entry.question,
            spreadType: entry.spreadType,
            cards: entry.cards,
            reading: parsedReading || undefined,
          })
        : [],
    [entry, parsedReading]
  );

  return {
    entry,
    loading,
    generating,
    readingText,
    readingError,
    showZen,
    setShowZen,
    activeElement,
    chatInput,
    setChatInput,
    showShare,
    setShowShare,
    chatMessages,
    chatLoading,
    chatEndRef,
    handleDelete,
    handleRegenerate,
    handleSendFollowUp,
    handleToggleStar,
    isStarred,
    parsedReading,
    activeFocusIndex,
    formattedDate,
    isReadingEmpty,
    defaultSuggestions,
  };
}
