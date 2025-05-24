import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Ensure your OpenAI API key is set as an environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file uploaded." }, { status: 400 });
    }

    // Convert the file to a format suitable for the OpenAI API
    // The OpenAI Node.js library handles File objects directly for 'multipart/form-data'
      // Use OpenAI's API to transcribe the audio
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1", 
      file: file,
    });
    
    const transcribedText = transcription.text;

    return NextResponse.json({ transcription: transcribedText });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: "Error transcribing audio.", details: errorMessage }, { status: 500 });
  }
}
