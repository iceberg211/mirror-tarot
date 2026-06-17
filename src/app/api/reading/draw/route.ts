import { NextResponse } from 'next/server';
import { drawCards } from '@/lib/tarot/drawCards';
import { SpreadType } from '@/lib/tarot/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spreadType = (searchParams.get('spreadType') || 'three_cards') as SpreadType;
  const customPositionsParam = searchParams.get('customPositions') || '';
  const customPositions = customPositionsParam
    .split(',')
    .map((position) => position.trim())
    .filter(Boolean);

  try {
    const cards = drawCards(spreadType, customPositions);
    return NextResponse.json({ success: true, cards });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
  }
}
