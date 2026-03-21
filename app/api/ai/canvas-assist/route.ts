import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const { strokes, model } = await req.json();

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY!);
    const gemini = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analyze these drawing strokes and predict what the user might want to do next:

Recent strokes: ${strokes.length} strokes
Last action: ${strokes[strokes.length - 1]?.tool || 'pen'}

Based on the pattern, suggest:
1. What they might be drawing
2. Next recommended tool or action
3. A helpful tip

Keep it brief and encouraging.`;

    const result = await gemini.generateContent(prompt);
    const prediction = result.response.text();

    return NextResponse.json({ prediction });
  } catch (error: any) {
    return NextResponse.json(
      { prediction: 'AI prediction unavailable right now.' },
      { status: 500 }
    );
  }
}
