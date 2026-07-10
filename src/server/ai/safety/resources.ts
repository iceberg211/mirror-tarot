import type { SafetyLevel } from './classify';

export interface SupportResource {
  name: string;
  contact: string;
  note: string;
}

/** 默认中文地区可信求助资源（可按地区扩展） */
export const DEFAULT_SUPPORT_RESOURCES: SupportResource[] = [
  {
    name: '全国心理援助热线',
    contact: '400-161-9995',
    note: '24 小时心理援助',
  },
  {
    name: '北京心理危机研究与干预中心',
    contact: '010-82951332',
    note: '危机干预与心理支持',
  },
  {
    name: '紧急情况',
    contact: '当地急救 120 / 报警 110',
    note: '若你或他人处于即时危险，请立即联系现场救援',
  },
];

export function buildSupportiveReadingText(level: SafetyLevel): string {
  const resources = DEFAULT_SUPPORT_RESOURCES.map(
    (r) => `- ${r.name}：${r.contact}（${r.note}）`
  ).join('\n');

  const opening =
    level === 'crisis'
      ? '我很关心你现在的安全。你值得被认真对待，此刻最重要的不是抽牌，而是让你获得现实中的支持。'
      : '你提到的处境涉及人身安全或重大现实风险。塔罗无法替代专业帮助，我们先把保护你自己放在第一位。';

  return `# SUMMARY
${opening}

# CARD_READING_1
此刻先暂停普通的象征解读。请优先确认你是否处在安全环境；若有即时危险，请马上联系身边可信的人或紧急服务。

# CONTRADICTION
当痛苦很大时，大脑会急着“找到一个答案”。真正需要的往往不是预言，而是陪伴、边界与可执行的求助步骤。

# OVERLOOKED_FACTOR
现实支持系统（热线、医疗、警方、可信亲友）比任何牌阵都更重要。你不需要独自扛下这一切。

# ACTION_ADVICE
如果可以，现在就做一件最小的保护行动：联系一位可信的人，或拨打下方求助热线中的任意一个，告诉对方你需要支持。

# GENTLE_REMINDER
你的生命与安全优先于任何解读。求助不是软弱，是照顾自己。

【可参考资源】
${resources}`;
}

export function buildSupportiveFollowUpText(level: SafetyLevel): string {
  const resources = DEFAULT_SUPPORT_RESOURCES.map((r) => `${r.name} ${r.contact}`).join('；');
  const head =
    level === 'crisis'
      ? '我听见你很难受，也担心你的安全。我们先不继续普通塔罗追问。'
      : '这个话题已经超出象征解读的安全范围，我们需要把现实帮助放在前面。';

  return `${head}请优先联系可信的人，或拨打：${resources}。如果你愿意，也可以只告诉我“我现在是否安全”，我们一步一步来。今天最小的一步：让至少一个真实世界的人知道你需要支持。`;
}
