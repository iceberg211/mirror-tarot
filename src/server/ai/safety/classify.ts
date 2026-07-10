export type SafetyLevel = 'normal' | 'sensitive' | 'high_risk' | 'crisis';

export interface SafetyClassification {
  level: SafetyLevel;
  ruleIds: string[];
  blocked: boolean;
}

interface SafetyRule {
  id: string;
  level: SafetyLevel;
  pattern: RegExp;
}

const RULES: SafetyRule[] = [
  {
    id: 'crisis_self_harm',
    level: 'crisis',
    pattern: /自杀|轻生|不想活|结束生命|自残|割腕|跳楼|去死|结束自己|杀了自己/,
  },
  {
    id: 'crisis_violence',
    level: 'crisis',
    pattern: /杀了|弄死|家暴正在|正在被打|有人要伤害我|被跟踪威胁/,
  },
  {
    id: 'high_risk_abuse',
    level: 'high_risk',
    pattern: /家暴|虐待|性侵|强奸|人身安全|逃出家|报警/,
  },
  {
    id: 'high_risk_minor',
    level: 'high_risk',
    pattern: /未成年|儿童色情|强迫发生关系|性剥削/,
  },
  {
    id: 'sensitive_medical',
    level: 'sensitive',
    pattern: /诊断|吃药|停药|精神病|抑郁症严重|双相|精神分裂/,
  },
  {
    id: 'sensitive_legal_finance',
    level: 'sensitive',
    pattern: /打官司|起诉|合同纠纷|破产|巨额债务|能否胜诉/,
  },
];

const LEVEL_RANK: Record<SafetyLevel, number> = {
  normal: 0,
  sensitive: 1,
  high_risk: 2,
  crisis: 3,
};

/**
 * 规则优先的安全分类。不调用模型，不记录原文。
 */
export function classifySafety(text: string): SafetyClassification {
  if (process.env.AI_SAFETY_CLASSIFY === '0') {
    return { level: 'normal', ruleIds: [], blocked: false };
  }

  const input = text || '';
  let level: SafetyLevel = 'normal';
  const ruleIds: string[] = [];

  for (const rule of RULES) {
    if (rule.pattern.test(input)) {
      ruleIds.push(rule.id);
      if (LEVEL_RANK[rule.level] > LEVEL_RANK[level]) {
        level = rule.level;
      }
    }
  }

  return {
    level,
    ruleIds,
    blocked: level === 'high_risk' || level === 'crisis',
  };
}

export function logSafetyAudit(meta: {
  requestId: string;
  route: string;
  level: SafetyLevel;
  ruleIds: string[];
}): void {
  console.info(
    JSON.stringify({
      type: 'ai_safety_audit',
      requestId: meta.requestId,
      route: meta.route,
      level: meta.level,
      ruleIds: meta.ruleIds,
      // 故意不记录原始问题文本
    })
  );
}
