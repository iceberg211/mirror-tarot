'use client';

import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import {
  defaultOnboardingState,
  getLocalOnboardingState,
  mergeOnboardingState,
  normalizeOnboardingState,
  OnboardingState,
  saveLocalOnboardingState,
} from '@/lib/product/onboarding';

export interface PrivacySettings {
  localCacheOnSignOut: 'clear';
  birthProfileEnabled: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  onboardingState: OnboardingState;
  privacySettings: PrivacySettings;
  createdAt: string;
  updatedAt: string;
}

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  onboarding_state: unknown;
  privacy_settings: unknown;
  created_at: string;
  updated_at: string;
}

const defaultPrivacySettings: PrivacySettings = {
  localCacheOnSignOut: 'clear',
  birthProfileEnabled: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizePrivacySettings(value: unknown): PrivacySettings {
  if (!isRecord(value)) return { ...defaultPrivacySettings };
  return {
    localCacheOnSignOut: 'clear',
    birthProfileEnabled: value.birthProfileEnabled === true,
  };
}

function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email || '',
    displayName: row.display_name || '镜面旅人',
    onboardingState: normalizeOnboardingState(row.onboarding_state),
    privacySettings: normalizePrivacySettings(row.privacy_settings),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function ensureUserProfile(user: User): Promise<UserProfile | null> {
  if (!supabase) return null;

  const email = user.email || '';
  const localState = getLocalOnboardingState();

  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id,email,display_name,onboarding_state,privacy_settings,created_at,updated_at')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) {
    console.error('Failed to load profile:', selectError);
  }

  const mergedState = mergeOnboardingState(
    localState,
    existing ? (existing as ProfileRow).onboarding_state : defaultOnboardingState,
  );

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email,
        display_name: existing ? (existing as ProfileRow).display_name || '镜面旅人' : '镜面旅人',
        onboarding_state: mergedState,
        privacy_settings: existing
          ? (existing as ProfileRow).privacy_settings || defaultPrivacySettings
          : defaultPrivacySettings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('id,email,display_name,onboarding_state,privacy_settings,created_at,updated_at')
    .single();

  if (error) {
    console.error('Failed to ensure profile:', error);
    return existing ? mapProfileRow(existing as ProfileRow) : null;
  }

  saveLocalOnboardingState(mergedState);
  return mapProfileRow(data as ProfileRow);
}

export async function saveUserOnboardingState(
  userId: string,
  nextState: Partial<OnboardingState>,
): Promise<OnboardingState> {
  const merged = saveLocalOnboardingState(nextState);

  if (!supabase) return merged;

  const { error } = await supabase
    .from('profiles')
    .update({
      onboarding_state: merged,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update onboarding state:', error);
  }

  return merged;
}
