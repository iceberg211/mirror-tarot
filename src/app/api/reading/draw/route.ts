import { NextResponse } from 'next/server';
import { drawCards } from '@/lib/tarot/drawCards';
import { SpreadType } from '@/lib/tarot/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spreadType = (searchParams.get('spreadType') || 'three_cards') as SpreadType;

  try {
    const cards = drawCards(spreadType);
    return NextResponse.json({ success: true, cards });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
  }
}
