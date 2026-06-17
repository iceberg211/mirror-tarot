export interface MoodConfig {
  id: string;
  name: string;
  label: string;
  category: 'light' | 'shadow' | 'storm';
  score: number;
  description: string;
}

export const moodConfigs: MoodConfig[] = [
  // 光芒 ✦ Light (平稳与高能量)
  { id: 'calm', name: '平静', label: '静', category: 'light', score: 4, description: '内心安定，水流无波' },
  { id: 'expectant', name: '期待', label: '期', category: 'light', score: 4, description: '心怀憧憬，望向远方' },
  { id: 'joyful', name: '欣喜', label: '喜', category: 'light', score: 5, description: '能量满溢，充满喜悦' },
  { id: 'healed', name: '治愈', label: '愈', category: 'light', score: 4, description: '伤口抚平，身心舒缓' },
  
  // 阴影 ✦ Shadow (低沉与内耗)
  { id: 'confused', name: '迷茫', label: '迷', category: 'shadow', score: 3, description: '雾气笼罩，看不清路' },
  { id: 'anxious', name: '焦虑', label: '虑', category: 'shadow', score: 2, description: '紧绷悬空，心神不宁' },
  { id: 'sad', name: '难过', label: '难', category: 'shadow', score: 1, description: '细雨微凉，情绪低落' },
  { id: 'tired', name: '疲惫', label: '累', category: 'shadow', score: 2, description: '心力耗竭，需要休憩' },
  
  // 风暴 ✦ Storm (心理冲突与防御)
  { id: 'tangled', name: '纠结', label: '纠', category: 'storm', score: 3, description: '思绪缠绕，难以决断' },
  { id: 'angry', name: '愤怒', label: '怒', category: 'storm', score: 2, description: '火焰涌动，边界受侵' },
  { id: 'empty', name: '空虚', label: '空', category: 'storm', score: 2, description: '心海寂寥，存在感淡' },
  { id: 'resistant', name: '抗拒', label: '拒', category: 'storm', score: 3, description: '身心防卫，逃避当下' },
];

export function getMoodConfigById(id: string): MoodConfig | undefined {
  return moodConfigs.find((m) => m.id === id);
}

export function getMoodConfigByName(name: string): MoodConfig | undefined {
  return moodConfigs.find((m) => m.name === name);
}
