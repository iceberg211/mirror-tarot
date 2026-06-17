export type ArcanaType = 'major' | 'minor';
export type SuitType = 'wands' | 'cups' | 'swords' | 'pentacles';

export interface CardMeaning {
  general: string;
  love: string;
  career: string;
  advice: string;
}

export interface TarotCard {
  id: string;
  number: number;
  name: string;
  zhName: string;
  arcana: ArcanaType;
  suit?: SuitType;
  image: string;
  keywords: {
    upright: string[];
    reversed: string[];
  };
}

export interface SelectedCard extends TarotCard {
  orientation: 'upright' | 'reversed';
  positionName: string;
  positionOrder: number;
}

export interface Spread {
  type: string;
  name: string;
  positions: string[];
  description: string;
}

export type SpreadType = 'one_card' | 'three_cards' | 'relationship' | 'career' | 'shadow' | 'choice' | 'mirror_cross' | 'custom';

export interface ParsedReading {
  questionSummary: string;
  intuitiveSummary: string;
  cardReadings: {
    positionName: string;
    cardName: string;
    cardZhName: string;
    orientation: 'upright' | 'reversed';
    interpretation: string;
  }[];
  contradiction: string;
  overlookedFactor: string;
  actionAdvice: string;
  gentleReminder: string;
  followUpSuggestions: string[];
}
