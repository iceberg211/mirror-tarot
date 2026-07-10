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
  getLocalCheckIns,
  getLocalMonthlyReport,
  getLocalReadings,
} from '../journal-crud';
import { mergeCheckIns, mergeReadings } from './merge';

function isCloudEnabled(): boolean {
  return Boolean(supabase);
}

/**
 * 拉取云端数据、与本地合并后写回，并把本地独有记录推送上云。
 * 会检查 Supabase 返回的 error；任一关键写入失败则返回 false。
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

    const cloudMappedReadings: JournalEntry[] = cloudReadings.map((r) => {
      const {
        _chatHistory: chatHistory,
        _isStarred: isStarred,
        _actionSeed: actionSeed,
        _userNotes: userNotes,
        _readingStyle: readingStyle,
        _dreamContext: dreamContext,
        ...cleanReading
      } = r.reading;

      return {
        id: r.id,
        question: r.question,
        mood: r.mood,
        spreadType: r.spread_type as SpreadType,
        cards: r.cards,
        reading: cleanReading,
        createdAt: r.created_at,
        isDream: r.is_dream,
        chatHistory,
        isStarred,
        actionSeed,
        userNotes,
        readingStyle,
        dreamContext,
      };
    });

    const localReadings = getLocalReadings();
    const mergedReadings = mergeReadings(cloudMappedReadings, localReadings);

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

    const cloudReadingIds = new Set(cloudReadings.map((r) => r.id));
    const readingsToPush = mergedReadings.filter((r) => !cloudReadingIds.has(r.id));

    const cloudCheckinDates = new Set(cloudCheckins.map((c) => c.date));
    const checkinsToPush = mergedCheckins.filter((c) => !cloudCheckinDates.has(c.date));

    const pushErrors: string[] = [];

    if (readingsToPush.length > 0) {
      const dbReadings = readingsToPush.map((r) => ({
        id: r.id,
        user_id: userId,
        device_id: deviceId,
        question: r.question,
        mood: r.mood,
        spread_type: r.spreadType,
        cards: r.cards,
        reading: {
          ...r.reading,
          _chatHistory: r.chatHistory,
          _isStarred: r.isStarred,
          _actionSeed: r.actionSeed,
          _userNotes: r.userNotes,
          _readingStyle: r.readingStyle,
          _dreamContext: r.dreamContext,
        },
        created_at: r.createdAt,
        is_dream: r.isDream || false,
      }));
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
