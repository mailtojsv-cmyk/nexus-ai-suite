import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const { action, component, currentDesign, model } = await req.json();

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY!);
    const gemini = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let prompt = '';

    if (action === 'add') {
      prompt = `A student just added "${component.name}" to their robot design. 

Current design has ${currentDesign.length} components.

Provide:
1. A friendly congratulations
2. What this component does
3. What other components work well with it
4. A helpful tip for using it

Keep it brief and encouraging.`;
    }

    const result = await gemini.generateContent(prompt);
    const suggestion = result.response.text();

    return NextResponse.json({ suggestion });
  } catch (error: any) {
    return NextResponse.json(
      { suggestion: 'AI assist unavailable right now.' },
      { status: 500 }
    );
  }
}
