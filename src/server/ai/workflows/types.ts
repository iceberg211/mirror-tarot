import type { SafetyLevel } from '@/server/ai/safety/classify';
import type { ResolvedCardContext } from '@/server/readings/card-repository';

export type WorkflowStatus = 'blocked' | 'ready_to_stream' | 'error';

export interface ReadingWorkflowInput {
  question: string;
  mood: string;
  spreadType: string;
  style: string;
  cardRefs: { id: string; orientation: 'upright' | 'reversed' }[];
  recentMoodState?: 'shadow' | 'storm';
  readingId?: string;
  userId?: string | null;
  requestId: string;
}

export interface ReadingWorkflowContext {
  spreadName: string;
  cardsWithMeanings: ResolvedCardContext[];
  memoryPrompt: string;
  isLateNight: boolean;
  theme: string;
  inputHash: string;
}

export interface ReadingWorkflowResult {
  status: WorkflowStatus;
  safetyLevel: SafetyLevel;
  safetyRuleIds: string[];
  requestId: string;
  context?: ReadingWorkflowContext;
  /** 安全拦截时直接返回的固定文本 */
  supportText?: string;
  errorCode?: string;
  errorMessage?: string;
  startedAt: number;
}
