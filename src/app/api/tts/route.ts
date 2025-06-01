import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 30; // Sets max duration for edge function (in seconds)
export const dynamic = 'force-dynamic'; // Prevent caching of responses

// Handler for methods other than POST
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST instead.' },
    { status: 405 }
  );
}

// Add handlers for other common methods
export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST instead.' },
    { status: 405 }
  );
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST instead.' },
    { status: 405 }
  );
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST instead.' },
    { status: 405 }
  );
}

export async function HEAD(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST instead.' },
    { status: 405 }
  );
}

export async function POST(request: NextRequest) {  try {
    const formData = await request.formData();
    const text = formData.get('text') as string;
    let model = formData.get('model') as string || 'tts-1';
    const voice = formData.get('voice') as string || 'alloy';
    const speed = parseFloat(formData.get('speed') as string) || 1.0;

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Check text length (4,096 character limit for TTS models)
    if (text.length > 4096) {
      return NextResponse.json({ 
        error: `Text length (${text.length} characters) exceeds the limit of 4,096 characters`
      }, { status: 400 });
    }    // Ensure model is one of the allowed values
    const allowedModels = ['tts-1', 'tts-1-hd', 'gpt-4o-mini'];
    if (!allowedModels.includes(model)) {
      return NextResponse.json({ 
        error: `Invalid model: ${model}. Allowed values are: ${allowedModels.join(', ')}`
      }, { status: 400 });
    }
    
    // Handle non-OpenAI TTS models differently
    if (model === 'gpt-4o-mini') {
      // For GPT-4o-mini, we'll route to a different API endpoint or use a different approach
      // For now, default to tts-1 as a fallback if GPT-4o-mini is requested
      model = 'tts-1';
    }

    // Ensure voice is one of the allowed values
    const allowedVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    if (!allowedVoices.includes(voice)) {
      return NextResponse.json({ 
        error: `Invalid voice: ${voice}. Allowed values are: ${allowedVoices.join(', ')}`
      }, { status: 400 });
    }

    // Ensure speed is within range
    if (speed < 0.25 || speed > 4.0) {
      return NextResponse.json({ 
        error: `Invalid speed: ${speed}. Value must be between 0.25 and 4.0`
      }, { status: 400 });
    }

    // Generate the audio
    const response = await openai.audio.speech.create({
      model,
      voice,
      input: text,
      speed,
      response_format: 'mp3', // We'll use mp3 for better compatibility
    });

    // Convert the binary audio data to a buffer
    const audioData = await response.arrayBuffer();

    // Return the audio as a binary stream
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="speech.mp3"',
      },
    });
  } catch (error: any) {
    console.error('Error in text-to-speech API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
