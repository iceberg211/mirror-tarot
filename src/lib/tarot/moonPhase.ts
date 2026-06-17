/**
 * 纯前端天文学月相算法模块
 * 基于当前时间与基准新月时间计算月龄与对应神秘学情绪指引
 */

export interface MoonPhaseInfo {
  age: number; // 月龄 (0 - 29.53)
  name: string; // 月相名称 (例如 "新月")
  illustration: string; // 月相简述
  percent: number; // 满月百分比 (0 - 100)
  advice: string; // 今日神秘学/情绪建议
  iconType: 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' | 'full' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent';
}

// 著名的基准新月时间: 2000-01-06T18:14:00Z
const BASE_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();
const LUNAR_CYCLE = 29.530588853; // 朔望月周期 (天)
const MS_PER_DAY = 86400000;

export function getTodayMoonPhase(dateInput?: Date): MoonPhaseInfo {
  const targetDate = dateInput || new Date();
  const diffMs = targetDate.getTime() - BASE_NEW_MOON;
  const diffDays = diffMs / MS_PER_DAY;
  
  // 计算当前周期中的天数余数 (月龄)
  let age = diffDays % LUNAR_CYCLE;
  if (age < 0) {
    age += LUNAR_CYCLE;
  }

  // 根据月相计算满月百分比 (以 14.77天 为满月)
  // 0 和 29.53 时 percent 接近 0，14.77 时 percent 接近 100
  const percent = Math.round((1 - Math.abs(age - LUNAR_CYCLE / 2) / (LUNAR_CYCLE / 2)) * 100);

  let name = '';
  let illustration = '';
  let advice = '';
  let iconType: MoonPhaseInfo['iconType'] = 'new';

  if (age < 1.84 || age >= 27.68) {
    name = '新月 ✦ New Moon';
    illustration = '万物伊始，灵气复苏';
    advice = '宜静心冥想，制定本周情绪目标，在心中播种新的心愿。忌过度消耗。';
    iconType = 'new';
  } else if (age >= 1.84 && age < 5.53) {
    name = '峨眉月 ✦ Waxing Crescent';
    illustration = '萌芽初露，能量微升';
    advice = '宜倾听直觉，做细微的尝试，逐步积累自信。适合将灵感付诸初步行动。';
    iconType = 'waxing_crescent';
  } else if (age >= 5.53 && age < 9.22) {
    name = '上弦月 ✦ First Quarter';
    illustration = '意志锤炼，直面阻碍';
    advice = '宜鼓起勇气，打破当下的犹豫，做出某些必要的调整。适合突破舒适区。';
    iconType = 'first_quarter';
  } else if (age >= 9.22 && age < 12.92) {
    name = '渐盈凸月 ✦ Waxing Gibbous';
    illustration = '沉淀打磨，蓄势待发';
    advice = '宜修正细节，保持耐性与平常心，静待花开。适合做阶段性总结。';
    iconType = 'waxing_gibbous';
  } else if (age >= 12.92 && age < 16.61) {
    name = '满月 ✦ Full Moon';
    illustration = '能量巅峰，灵性照耀';
    advice = '宜感恩过往，举行清理仪式，释放堆积的负面情绪，与自我达成深度和解。';
    iconType = 'full';
  } else if (age >= 16.61 && age < 20.30) {
    name = '渐亏凸月 ✦ Waning Gibbous';
    illustration = '觉知感悟，传递分享';
    advice = '宜整理感悟，与信任的人进行深层交流，倾诉内心。适合表达感谢与关怀。';
    iconType = 'waning_gibbous';
  } else if (age >= 20.30 && age < 23.99) {
    name = '下弦月 ✦ Last Quarter';
    illustration = '审视内省，深度清理';
    advice = '宜进行断舍离，清理物理与心理空间的垃圾，拒绝无意义的社交消耗。';
    iconType = 'last_quarter';
  } else {
    name = '残月 ✦ Waning Crescent';
    illustration = '洗尽铅华，静候新生';
    advice = '宜安养生息，早睡恢复精力，接受当下的不完美，等待下一个新月的复苏。';
    iconType = 'waning_crescent';
  }

  return {
    age: Math.round(age * 100) / 100,
    name,
    illustration,
    percent,
    advice,
    iconType
  };
}

export function getMoonSvgPath(iconType: string, _percent: number): string {
  void _percent;
  // 圆心是 50,50，半径是 38
  switch (iconType) {
    case 'full':
      return 'M 50 12 A 38 38 0 1 1 50 88 A 38 38 0 1 1 50 12 Z';
    case 'first_quarter':
      // 右半圆亮
      return 'M 50 12 A 38 38 0 0 1 50 88 Z';
    case 'last_quarter':
      // 左半圆亮
      return 'M 50 12 A 38 38 0 0 0 50 88 Z';
    case 'waxing_crescent':
      // 右侧细弯月亮 (渐盈眉月)
      return 'M 50 12 A 38 38 0 0 1 50 88 A 20 38 0 0 1 50 12 Z';
    case 'waning_crescent':
      // 左侧细弯月亮 (残月)
      return 'M 50 12 A 38 38 0 0 0 50 88 A 20 38 0 0 0 50 12 Z';
    case 'waxing_gibbous':
      // 渐盈凸月 (右侧鼓起大半)
      return 'M 50 12 A 38 38 0 0 1 50 88 A 18 38 0 0 0 50 12 Z';
    case 'waning_gibbous':
      // 渐亏凸月 (左侧鼓起大半)
      return 'M 50 12 A 38 38 0 0 0 50 88 A 18 38 0 0 1 50 12 Z';
    case 'new':
    default:
      // 新月：只留一条微弱右侧反光线
      return 'M 50 12 A 38 38 0 0 1 50 14 A 38 38 0 0 0 50 12 Z';
  }
}
