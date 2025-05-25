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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const model = formData.get('model') as string || 'whisper-1';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert the File object to a Blob
    const buffer = await audioFile.arrayBuffer();
    const blob = new Blob([buffer]);

    // Check file size (25MB limit for most OpenAI API endpoints)
    const fileSizeMB = buffer.byteLength / (1024 * 1024);
    if (fileSizeMB > 25) {
      return NextResponse.json({ 
        error: 'File size (${fileSizeMB.toFixed(2)}MB) exceeds the limit of 25MB'
      }, { status: 400 });
    }

    // Create a File object that OpenAI's API can use
    const file = new File([blob], audioFile.name, { type: audioFile.type });

    let transcription: string;
    const enhancementPromptText = 'You are a highly accurate transcription enhancer. Improve the formatting, readability, and accuracy of the provided transcription while preserving all original meaning. Fix grammar, punctuation, and formatting issues. If there are speakers, label them appropriately.';

    let effectiveModel: string;
    const transcriptionParams: OpenAI.Audio.Transcriptions.TranscriptionCreateParams = {
      file,
      model: '', // Will be set below
    };

    if (model === 'gpt-4o') {
      effectiveModel = 'gpt-4o-transcribe';
      transcriptionParams.prompt = enhancementPromptText;
    } else if (model === 'gpt-4o-mini') {
      effectiveModel = 'gpt-4o-mini-transcribe';
      transcriptionParams.prompt = enhancementPromptText;
    } else { 
      // This branch handles 'whisper-1' (default model if not 'gpt-4o' or 'gpt-4o-mini')
      effectiveModel = 'whisper-1';
      // No prompt is added for 'whisper-1' here, matching the original code's behavior for basic whisper-1.
    }

    transcriptionParams.model = effectiveModel;

    // The OpenAI SDK's `transcriptions.create` method returns a response object
    // which has a `text` property when the default `response_format: 'json'` is used.
    // This is supported by whisper-1, gpt-4o-transcribe, and gpt-4o-mini-transcribe.
    const response = await openai.audio.transcriptions.create(transcriptionParams);
    transcription = response.text;

    return NextResponse.json({ transcription });
  } catch (error: any) {
    console.error('Error in transcription API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
