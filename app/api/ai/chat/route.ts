import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const { message, model, history } = await req.json();

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY!);
    const gemini = genAI.getGenerativeModel({
      model: model.includes('gemini') ? model : 'gemini-1.5-flash',
    });

    // Build chat context
    const chatHistory = history?.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })) || [];

    const chat = gemini.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { response: 'Sorry, I encountered an error. Please try again.' },
      { status: 500 }
    );
  }
}
