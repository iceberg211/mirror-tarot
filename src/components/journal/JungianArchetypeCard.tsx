'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Moon } from 'lucide-react';
import { JournalEntry } from '@/lib/db/localJournal';

interface JungianArchetypeCardProps {
  entries: JournalEntry[];
}

// 预定义荣格人格原型文案字典
const archetypeDict: Record<string, { title: string; quote: string; desc: string }> = {
  '00-fool': {
    title: '天真愚人 (The Innocent Fool)',
    quote: '“不问归途，无知无畏亦是潜意识的神圣指引。”',
    desc: '你正站在一段新心智周期的起点。本月你的能量场倾向于打破陈规、跨越边界。潜意识呼唤你卸下过度防御与逻辑计算，像孩童般信任当下的直觉，勇敢地朝深渊迈出一小步。这并非盲目，而是灵魂渴望新生的绝对自由。',
  },
  '01-magician': {
    title: '心智创造师 (The Magician)',
    quote: '“风火水土在案前汇聚，你早已具备创造现状的能力。”',
    desc: '本月你处于能量与意志力被充分唤醒的阶段。沟通、创意、现实化手段正是你的优势所在。荣格心理学指明，这代表着你的“意识焦点”非常清晰，适合开启新企划、做出决断或表达自我。相信你的资源和专注力。',
  },
  '02-high-priestess': {
    title: '潜意识女祭司 (The High Priestess)',
    quote: '“石柱之间，水月映照，最深的秘密在寂静中无需言说。”',
    desc: '你正处于极其强烈的直觉与内心整合阶段。这代表你内在的“阿尼玛（感性直觉）”正引领你的主要认知。无需向外寻求过多的现实证据或他人建议，静水流深，当你停止头脑的喧嚣时，答案早已在你的寂静中静默浮现。',
  },
  '03-empress': {
    title: '丰饶母性 (The Empress)',
    quote: '“滋养万物，大地回暖，接纳生命本身的丰盈与繁衍。”',
    desc: '本月你的主导面具是“滋养与接纳”。你渴望创造一个安全、舒适且充满生命力的外部环境，或者在人际交往中扮演疗愈与倾听者。这也是一个适合关注身体感官、享受当下物质与自然滋养的时期。',
  },
  '04-emperor': {
    title: '秩序主宰者 (The Emperor)',
    quote: '“在坚硬的王座上，用理性与边界守护内心的疆土。”',
    desc: '本月你的理智与秩序感占据主导。你在积极建立自己生活的边界、规则和逻辑掌控体系。这是你内在的“父亲面具”在呼唤你戒除软弱与拖延，承担现实的硬核掌控。但也要主意，过度控制是否正在演变成对自我的冷酷压抑。',
  },
  '07-the-chariot': {
    title: '英雄意志 (The Chariot)',
    quote: '“拉扯的两翼正在思考，用意志力强行突围。”',
    desc: '你正面临心智冲突的拉扯（如：理智与情感、理想与现实的交战）。本月的主导面具是“征服者”。潜意识提示你，不要试图完全消灭两端，而是要握紧冲突的缰绳，用强大的意志力与清晰的目标感，驱使相反的力量共同为你突围。',
  },
  '08-strength': {
    title: '温柔驯兽师 (Inner Strength)',
    quote: '“以温柔抚平狂野之狮，内省与耐性胜过刚猛之怒。”',
    desc: '本月你的能量在于“柔性自控”。你内在的某些本能冲动、愤怒或焦灼正在抬头（狮子），但你学会了不用压抑或暴力去对抗，而是带着深刻的觉察与同理去“抚摸”你的阴影。温柔地与自己的软弱和解，这便是无上的精神力量。',
  },
  '09-the-hermit': {
    title: '孤光求道者 (The Hermit)',
    quote: '“在绝对的黑暗中，我自己的心识就是唯一的引路灯。”',
    desc: '本月你被情绪深处的隐士灯火所守护。你内在的社交面具正在退潮，而灵魂正呼唤你走向独处与深层复盘。这是一个适合学习、思考、闭关和理清过去 30 天得失的智慧周期。慢下来，向内看，黑暗中你的本色比任何时候都明亮。',
  },
  '10-wheel-of-fortune': {
    title: '命运顺应者 (The Wheel of Fortune)',
    quote: '“浪潮起伏非人力所能及，在旋转的轴心中守住静止。”',
    desc: '你正经历心境与外部处境的快速流转变化。本月的主导原型是“观察者”。不要在命运之轮的外圈跟着大起大落而感到焦虑，将重心收回到轮子的正轴心——做那一颗冷觉、接纳且静止的觉察之眼，顺势流转，不离本位。',
  },
  '14-temperance': {
    title: '心智炼金术士 (Temperance)',
    quote: '“水火互通，能量流转，在对立的极点之间调和出生命长河。”',
    desc: '本月你处于心智净化与能量调和阶段。代表你正在整合自身看似矛盾的不同部分（如：工作与生活、理性与感性）。通过控制情绪的流量、节制表达、以及在静修中进行内心流动的调理，你在熬炼一剂最温存的心灵疗愈良药。',
  },
  '17-the-star': {
    title: '希望疗愈者 (The Star)',
    quote: '“黑夜虽漫长，永恒之星已经亮起，将创伤泼洒给泥土。”',
    desc: '你正处于极其温暖的伤口抚平与憧憬复归阶段。本月你具有天然的疗愈感与艺术灵性。你的潜意识完全敞开，抛开过去的防御盔甲，将真诚的水流毫无保留地洒回给生命。这是一段可以深呼吸、卸下包袱、抬头看星的无压周期。',
  },
};

export default function JungianArchetypeCard({ entries }: JungianArchetypeCardProps) {
  // 分析 30 天内最高频的大阿卡纳
  const archetypeInfo = useMemo(() => {
    try {
      const nowMs = new Date().getTime();
      const recentReadings = entries.filter((r) => {
        const entryTime = new Date(r.createdAt).getTime();
        return nowMs - entryTime <= 30 * 24 * 60 * 60 * 1000;
      });

      if (recentReadings.length === 0) return null;

      // 统计所有大阿卡纳牌
      const majorCardCounts: Record<string, number> = {};
      let totalMajorCount = 0;

      recentReadings.forEach((reading) => {
        if (!Array.isArray(reading.cards)) return;
        reading.cards.forEach((card) => {
          const isMajor = card.arcana === 'major' || /^\d{2}-/.test(card.id);
          if (isMajor) {
            majorCardCounts[card.id] = (majorCardCounts[card.id] || 0) + 1;
            totalMajorCount++;
          }
        });
      });

      if (totalMajorCount === 0) {
        // 如果这 30 天没有抽到大阿卡纳，则提取频率最高的小阿卡纳，根据其套组分配元素
        const elementCounts = { water: 0, fire: 0, wind: 0, earth: 0 };
        recentReadings.forEach((reading) => {
          if (!Array.isArray(reading.cards)) return;
          reading.cards.forEach((card) => {
            const id = card.id.toLowerCase();
            if (id.includes('cup') || id.includes('chalice')) elementCounts.water++;
            else if (id.includes('wand') || id.includes('rod') || id.includes('staff')) elementCounts.fire++;
            else if (id.includes('sword')) elementCounts.wind++;
            else if (id.includes('pentacle') || id.includes('coin') || id.includes('disk')) elementCounts.earth++;
          });
        });

        let topElement: 'water' | 'fire' | 'wind' | 'earth' = 'water';
        let maxCount = 0;
        (Object.keys(elementCounts) as Array<'water' | 'fire' | 'wind' | 'earth'>).forEach((el) => {
          const count = elementCounts[el];
          if (count > maxCount) {
            maxCount = count;
            topElement = el;
          }
        });

        const elementArchetypes = {
          water: {
            title: '水镜共感原型 (The Empathetic Mirror)',
            quote: '“如水般流动，承接一切情绪，潜意识正以波澜起舞。”',
            desc: '最近 30 天你被水元素能量环绕。在荣格心理中，这代表你的情感（Feeling）认知面具高度活跃。你对周围的情绪和自身细微的感觉极其敏锐，容易与他人共情，但也要注意守护好心智边界，防范被过载的情绪水流所淹没。',
          },
          fire: {
            title: '火之开拓原型 (The Fire Catalyst)',
            quote: '“炽热燃烧，直觉先行，渴望用行动打破困局。”',
            desc: '最近 30 天你被火元素能量包围。在荣格心智中，这代表你的直觉（Intuition）冲动和激情正在被点燃。你渴望突破常规，讨厌停滞，适合做出改变现实的决策。信任这股向外的驱动力，但请注意避免在行动中过度消耗自己。',
          },
          wind: {
            title: '风之沉思原型 (The Wind Observer)',
            quote: '“思维如风，穿过迷雾，保持理性的超然悬浮。”',
            desc: '最近 30 天你被风元素能量笼罩。这在荣格分析中对应了思考（Thinking）功能的活跃。你的脑海正在对现实问题进行高速逻辑解析和辨析，极具分析欲，但也极易陷入过度内耗（Overthinking）。你需要适当静坐以止息脑中风暴。',
          },
          earth: {
            title: '大地锚定原型 (The Earth Anchor)',
            quote: '“双脚落地，默默耕耘，在厚重的大地中寻找踏实边界。”',
            desc: '最近 30 天你被土元素能量滋养。这对应了荣格心理学里的感觉（Sensation）主导功能。你高度重视秩序、物质成果、健康边界和落地的安全感。这是一个极佳的蓄力稳固周期，适合将庞杂的思绪落实成每天生活的微小正念习惯。',
          },
        };

        return {
          id: `element-${topElement}`,
          ...elementArchetypes[topElement],
          resCount: maxCount > 0 ? maxCount : 1,
        };
      }

      // 取得频次最高的大阿卡纳 ID
      let topMajorId = '';
      let maxMajorCount = 0;
      Object.entries(majorCardCounts).forEach(([id, count]) => {
        if (count > maxMajorCount) {
          maxMajorCount = count;
          topMajorId = id;
        }
      });

      let cardName = '潜意识印记';
      const sampleCard = recentReadings
        .flatMap((r) => r.cards)
        .find((c) => c && c.id === topMajorId);
      if (sampleCard) cardName = sampleCard.zhName;

      const config = archetypeDict[topMajorId] || {
        title: `精神原型：${cardName} (The Archetype of ${cardName})`,
        quote: `“卡牌象征的能量正在你体内回响，这是本月潜意识的映射。”`,
        desc: `本月大阿卡纳「${cardName}」在您的测算中高频浮现。在荣格心理分析中，这代表着该牌的深层心理原型（Archetype）正在您的潜意识层起主导或投射作用。请多关注该牌面的核心寓意，它可能正在试图指出你当前生活矛盾中的深层出路。`,
      };

      return {
        id: topMajorId,
        ...config,
        resCount: maxMajorCount,
      };
    } catch (e) {
      console.error('Failed to resolve Jungian archetype:', e);
      return null;
    }
  }, [entries]);

  if (!archetypeInfo) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full rounded-2xl border border-gold/22 bg-gradient-to-b from-card/80 to-card/95 p-5 shadow-gold-glow flex flex-col gap-4 relative overflow-hidden select-none transition-all duration-400"
    >
      <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-gold/5 blur-2xl pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-mono text-gold-muted/50 uppercase tracking-[0.2em]">
            Jungian Archetype mapping
          </span>
          <h3 className="text-sm font-serif font-bold text-gold tracking-widest mt-1">
            本月心智主导原型 (Archetype)
          </h3>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-gold/15 bg-gold/5 text-gold/80 animate-pulse">
          <Moon className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="flex flex-col gap-3.5 pt-1">
        <div className="flex flex-col gap-1">
          <h4 className="text-base font-serif font-bold text-gold-focus tracking-wider">
            ✦ {archetypeInfo.title}
          </h4>
          <p className="text-[11px] font-serif text-gold-muted/65 italic tracking-wide mt-1">
            {archetypeInfo.quote}
          </p>
        </div>

        <p className="text-[11px] font-serif text-foreground/80 leading-relaxed tracking-wider border-t border-gold/5 pt-3.5 font-medium">
          {archetypeInfo.desc}
        </p>

        <div className="flex justify-end items-center gap-1.5 mt-1 text-[9px] font-mono text-gold-muted/40 uppercase tracking-widest">
          <span>共鸣频次: {archetypeInfo.resCount} 次</span>
        </div>
      </div>
    </motion.div>
  );
}
