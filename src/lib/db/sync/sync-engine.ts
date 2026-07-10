import type { SpreadType } from '../../tarot/types';
import { supabase } from '../../supabaseClient';
import type { CloudCheckInRow, CloudMonthlyReportRow, CloudReadingRow, JournalEntry } from '../types';
import {
  CHECKIN_STORAGE_KEY,
  getActiveUserId,
  getDeviceId,
  getScopedStorageKey,
  LOCAL_STORAGE_KEY,
  MONTHLY_REPORT_KEY,
  setActiveUserId,
  setMonthlyReportForKey,
  writeJsonArray,
} from '../local-storage';
import {
  getAllLocalReadings,
  getLocalCheckIns,
  getLocalMonthlyReport,
} from '../journal-crud';
import { mergeCheckIns, mergeReadings, normalizeJournalEntry } from './merge';

function isCloudEnabled(): boolean {
  return Boolean(supabase);
}

function mapCloudReading(r: CloudReadingRow): JournalEntry {
  const {
    _chatHistory: chatHistory,
    _isStarred: isStarred,
    _actionSeed: actionSeed,
    _userNotes: userNotes,
    _readingStyle: readingStyle,
    _dreamContext: dreamContext,
    _recentMoodState: recentMoodState,
    _isZen: isZen,
    _zenScore: zenScore,
    ...cleanReading
  } = r.reading || ({} as CloudReadingRow['reading']);

  return normalizeJournalEntry({
    id: r.id,
    question: r.question,
    mood: r.mood,
    spreadType: r.spread_type as SpreadType,
    cards: r.cards,
    reading: cleanReading as JournalEntry['reading'],
    createdAt: r.created_at,
    updatedAt: r.updated_at || r.created_at,
    revision: typeof r.revision === 'number' && r.revision > 0 ? r.revision : 1,
    deletedAt: r.deleted_at ?? null,
    clientId: r.client_id || undefined,
    syncStatus: 'synced',
    isDream: r.is_dream,
    chatHistory,
    isStarred,
    actionSeed,
    userNotes,
    readingStyle,
    dreamContext,
    recentMoodState,
    isZen,
    zenScore,
  });
}

function toCloudRow(entry: JournalEntry, userId: string, deviceId: string) {
  const normalized = normalizeJournalEntry(entry);
  return {
    id: normalized.id,
    user_id: userId,
    device_id: deviceId,
    question: normalized.question,
    mood: normalized.mood,
    spread_type: normalized.spreadType,
    cards: normalized.cards,
    reading: {
      ...normalized.reading,
      _chatHistory: normalized.chatHistory,
      _isStarred: normalized.isStarred,
      _actionSeed: normalized.actionSeed,
      _userNotes: normalized.userNotes,
      _readingStyle: normalized.readingStyle,
      _dreamContext: normalized.dreamContext,
      _recentMoodState: normalized.recentMoodState,
      _isZen: normalized.isZen,
      _zenScore: normalized.zenScore,
    },
    created_at: normalized.createdAt,
    updated_at: normalized.updatedAt,
    deleted_at: normalized.deletedAt || null,
    revision: normalized.revision,
    client_id: normalized.clientId || deviceId,
    is_dream: normalized.isDream || false,
  };
}

/**
 * 拉取云端、按 revision/updatedAt 合并，推送本地更新或独有记录。
 */
export async function syncJournalData(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!isCloudEnabled() || !supabase) return false;

  let userId = getActiveUserId();
  if (!userId) {
    const { data } = await supabase.auth.getSession();
    userId = data.session?.user.id || '';
    if (userId) setActiveUserId(userId);
  }
  if (!userId) return false;

  const deviceId = getDeviceId();
  if (!deviceId) return false;

  try {
    const [readingsRes, checkinsRes, reportRes] = await Promise.all([
      supabase.from('readings').select('*').eq('user_id', userId),
      supabase.from('checkins').select('*').eq('user_id', userId),
      supabase.from('monthly_reports').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    if (readingsRes.error) {
      console.error('Error fetching readings from Supabase:', readingsRes.error);
      return false;
    }
    if (checkinsRes.error) {
      console.error('Error fetching checkins from Supabase:', checkinsRes.error);
      return false;
    }
    if (reportRes.error) {
      console.error('Error fetching monthly report from Supabase:', reportRes.error);
      return false;
    }

    const cloudReadings = (readingsRes.data || []) as CloudReadingRow[];
    const cloudCheckins = (checkinsRes.data || []) as CloudCheckInRow[];
    const cloudReport = reportRes.data as CloudMonthlyReportRow | null;

    const cloudMappedReadings = cloudReadings.map(mapCloudReading);
    const localReadings = getAllLocalReadings();
    const mergedReadings = mergeReadings(cloudMappedReadings, localReadings).map((entry) => ({
      ...entry,
      syncStatus: 'synced' as const,
    }));

    const cloudMappedCheckins = cloudCheckins.map((c) => ({
      date: c.date,
      mood: c.mood,
    }));
    const localCheckins = getLocalCheckIns();
    const mergedCheckins = mergeCheckIns(cloudMappedCheckins, localCheckins);

    const localReport = getLocalMonthlyReport();
    let mergedReport = localReport;
    if (!localReport && cloudReport?.report) {
      mergedReport = cloudReport.report;
    } else if (localReport && cloudReport?.report) {
      mergedReport = localReport;
    }

    writeJsonArray(getScopedStorageKey(LOCAL_STORAGE_KEY, userId), mergedReadings);
    writeJsonArray(getScopedStorageKey(CHECKIN_STORAGE_KEY, userId), mergedCheckins);
    if (mergedReport) {
      setMonthlyReportForKey(getScopedStorageKey(MONTHLY_REPORT_KEY, userId), mergedReport);
    }

    // 推送：云端缺失，或本地 revision 更高（含墓碑/收藏等变更）
    const cloudById = new Map(cloudMappedReadings.map((r) => [r.id, r]));
    const pushList = mergedReadings.filter((local) => {
      const cloud = cloudById.get(local.id);
      if (!cloud) return true;
      return local.revision > cloud.revision;
    });

    const cloudCheckinDates = new Set(cloudCheckins.map((c) => c.date));
    const checkinsToPush = mergedCheckins.filter((c) => !cloudCheckinDates.has(c.date));

    const pushErrors: string[] = [];

    if (pushList.length > 0) {
      const dbReadings = pushList.map((r) => toCloudRow(r, userId, deviceId));
      const { error } = await supabase.from('readings').upsert(dbReadings);
      if (error) {
        console.error('Failed to push readings:', error);
        pushErrors.push(error.message);
      }
    }

    if (checkinsToPush.length > 0) {
      const dbCheckins = checkinsToPush.map((c) => ({
        user_id: userId,
        device_id: deviceId,
        date: c.date,
        mood: c.mood,
      }));
      const { error } = await supabase
        .from('checkins')
        .upsert(dbCheckins, { onConflict: 'user_id,date' });
      if (error) {
        console.error('Failed to push checkins:', error);
        pushErrors.push(error.message);
      }
    }

    if (localReport && (!cloudReport || cloudReport.report !== localReport)) {
      const { error } = await supabase.from('monthly_reports').upsert(
        {
          user_id: userId,
          device_id: deviceId,
          report: localReport,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) {
        console.error('Failed to push monthly report:', error);
        pushErrors.push(error.message);
      }
    }

    return pushErrors.length === 0;
  } catch (e) {
    console.error('Failed to sync journal data with Supabase:', e);
    return false;
  }
}
