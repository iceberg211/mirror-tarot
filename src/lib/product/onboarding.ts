'use client';

export interface OnboardingState {
  firstReadingCompleted: boolean;
  firstFollowUpCompleted: boolean;
  authPromptSeen: boolean;
  updatedAt: string;
}

const ONBOARDING_STORAGE_KEY = 'mirror_tarot_onboarding_state';

export const defaultOnboardingState: OnboardingState = {
  firstReadingCompleted: false,
  firstFollowUpCompleted: false,
  authPromptSeen: false,
  updatedAt: '',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeOnboardingState(value: unknown): OnboardingState {
  if (!isRecord(value)) return { ...defaultOnboardingState };

  return {
    firstReadingCompleted: value.firstReadingCompleted === true,
    firstFollowUpCompleted: value.firstFollowUpCompleted === true,
    authPromptSeen: value.authPromptSeen === true,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
  };
}

export function getLocalOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') return { ...defaultOnboardingState };

  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    return raw ? normalizeOnboardingState(JSON.parse(raw)) : { ...defaultOnboardingState };
  } catch (error) {
    console.error('Failed to read onboarding state:', error);
    return { ...defaultOnboardingState };
  }
}

export function saveLocalOnboardingState(nextState: Partial<OnboardingState>): OnboardingState {
  const current = getLocalOnboardingState();
  const merged: OnboardingState = {
    ...current,
    ...nextState,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(merged));
  }

  return merged;
}

export function mergeOnboardingState(
  localState: OnboardingState,
  remoteState: unknown,
): OnboardingState {
  const remote = normalizeOnboardingState(remoteState);
  return {
    firstReadingCompleted: localState.firstReadingCompleted || remote.firstReadingCompleted,
    firstFollowUpCompleted: localState.firstFollowUpCompleted || remote.firstFollowUpCompleted,
    authPromptSeen: localState.authPromptSeen || remote.authPromptSeen,
    updatedAt: new Date().toISOString(),
  };
}
