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
    let isChunk = formData.get('isChunk') === 'true'; // Check if this is a pre-processed chunk

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
        error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds the limit of 25MB`
      }, { status: 400 });
    }
      // Extract duration from the file name if available (format: *_duration1789.848s*)
    let audioDurationSeconds: number | null = null;
    const durationMatch = audioFile.name.match(/_duration([0-9]+(?:\.[0-9]+)?)s/);
    if (durationMatch && durationMatch[1]) {
      audioDurationSeconds = parseFloat(durationMatch[1]);
      console.log(`Found duration in filename: ${audioDurationSeconds}s`);
    }
    
    // Check if this is a chunk (format: *_chunk1of3_*)
    const isFileChunk = audioFile.name.match(/_chunk([0-9]+)of([0-9]+)_/) !== null;
    if (isFileChunk) {
      console.log(`Detected file chunk from filename pattern: ${audioFile.name}`);
      // Force isChunk to true if the filename indicates it's a chunk, regardless of the form parameter
      isChunk = true;
    }
      // Check duration limits for GPT models if we know the duration
    // Skip this check if the request is marked as a chunk or using Whisper
    console.log(`Processing audio: ${audioFile.name}, isChunk: ${isChunk}, model: ${model}, duration: ${audioDurationSeconds || 'unknown'}`);
    
    if (audioDurationSeconds && (model === 'gpt-4o' || model === 'gpt-4o-mini')) {
      console.log(`Checking duration: ${audioDurationSeconds} vs limit: 1500, isChunk: ${isChunk}`);
      
      if (!isChunk && audioDurationSeconds > 1500) {
        console.error(`Audio duration ${audioDurationSeconds} exceeds limit of 1500 seconds for model ${model}`);
        return NextResponse.json({
          error: `Audio duration ${audioDurationSeconds} seconds is longer than 1500 seconds which is the maximum for this model`
        }, { status: 400 });
      }
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
