import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const { action, component, currentDesign, model } = await req.json();

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY!);
    const gemini = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let prompt = '';

    if (action === 'add') {
      const componentNames = (currentDesign || []).map((c: any) => c.name).join(', ');
      prompt = `A student is building a robot. They just added "${component.name}" (${component.specs}).

Current design has: ${componentNames || 'No other components yet'}

Provide in 3-4 short lines:
1. What this component does
2. What it needs to work (power, driver, etc.)
3. A suggestion for next component to add
4. An encouraging comment

Keep it brief and student-friendly.`;
    } else if (action === 'generate_code') {
      const componentNames = (currentDesign || []).map((c: any) => c.name).join(', ');
      prompt = `Generate Arduino code for a robot with these components:
${componentNames}

Requirements:
1. Include pin definitions
2. Include setup() and loop()
3. Add comments explaining each section
4. Make it simple enough for a student to understand
5. Include basic functionality for each component

Provide complete, working Arduino code.`;
    }

    const result = await gemini.generateContent(prompt);
    const suggestion = result.response.text();

    return NextResponse.json({ suggestion });
  } catch (error: any) {
    return NextResponse.json(
      { suggestion: 'AI assistant is temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}
