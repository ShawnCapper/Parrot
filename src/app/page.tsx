"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Upload, Wand2, Copy, CheckCheck, FileAudio } from "lucide-react";

export default function Home() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError("");
    
    if (file) {
      // Check if the file is an audio file
      if (!file.type.startsWith('audio/')) {
        setError("Please select an audio file.");
        return;
      }
      
      setAudioFile(file);
      setSuccessMessage(`File "${file.name}" selected (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
    }
  };

  const handleTranscribe = async () => {
    if (!audioFile) {
      setError("Please select an audio file first.");
      return;
    }

    setIsLoading(true);
    setTranscription(""); // Clear previous transcription
    setError("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("audio", audioFile);

    try {
      const startTime = Date.now();
      
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      setTranscription(result.transcription);
      setSuccessMessage(`✓ Transcription completed in ${processingTime}s`);
    } catch (error) {
      console.error("Error transcribing audio:", error);
      let errorMessage = "Failed to transcribe audio.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
      {/* Header */}
      <header className="w-full border-b border-zinc-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wand2 className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Parrot</h1>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto p-4 gap-6">
        {/* Left Panel - Upload */}
        <div className="w-full md:w-1/2 space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <FileAudio className="h-6 w-6 text-indigo-400" />
                Audio Transcription
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Upload your audio file and get it transcribed instantly using AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <label 
                htmlFor="audio-file"
                className="rounded-lg border-2 border-dashed border-zinc-700 p-6 flex flex-col items-center justify-center transition-all hover:border-indigo-500 cursor-pointer block"
              >
                <Upload className="h-10 w-10 text-zinc-500 mb-2" />
                <span className="text-sm text-zinc-400 cursor-pointer text-center">
                  <span className="font-medium text-indigo-400">Click to upload</span> or drag and drop<br />
                  MP3, WAV, M4A, or other audio files
                </span>
                <Input
                  id="audio-file"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {audioFile && (
                  <div className="mt-4 px-3 py-1 bg-zinc-800/80 rounded-full text-xs text-zinc-300 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    {audioFile.name}
                  </div>
                )}
              </label>
              
              {error && (
                <div className="px-4 py-3 bg-red-900/30 border border-red-800 rounded-md text-sm text-red-200">
                  {error}
                </div>
              )}
              
              {successMessage && !error && !isLoading && (
                <div className="px-4 py-3 bg-green-900/30 border border-green-800 rounded-md text-sm text-green-200">
                  {successMessage}
                </div>
              )}
              
              <Button
                onClick={handleTranscribe}
                disabled={isLoading || !audioFile}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0 h-12 font-medium transition-all disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                    Processing...
                  </span>
                ) : (
                  "Transcribe Audio"
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="p-4 bg-zinc-900/30 backdrop-blur-sm rounded-lg border border-zinc-800">
            <h3 className="font-medium text-zinc-300 mb-2">Supported Audio Formats</h3>
            <ul className="grid grid-cols-2 gap-2 text-sm text-zinc-400">
              <li className="flex items-center gap-1"><div className="w-1 h-1 bg-indigo-400 rounded-full"></div> MP3</li>
              <li className="flex items-center gap-1"><div className="w-1 h-1 bg-indigo-400 rounded-full"></div> WAV</li>
              <li className="flex items-center gap-1"><div className="w-1 h-1 bg-indigo-400 rounded-full"></div> M4A</li>
              <li className="flex items-center gap-1"><div className="w-1 h-1 bg-indigo-400 rounded-full"></div> MP4 (audio)</li>
              <li className="flex items-center gap-1"><div className="w-1 h-1 bg-indigo-400 rounded-full"></div> FLAC</li>
              <li className="flex items-center gap-1"><div className="w-1 h-1 bg-indigo-400 rounded-full"></div> OGG</li>
            </ul>
          </div>
        </div>
        
        {/* Right Panel - Results */}
        <div className="w-full md:w-1/2 space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-xl h-full">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-2xl font-bold text-white">
                Transcription Results
              </CardTitle>
              <CardDescription className="text-zinc-400">
                {transcription ? 
                  `${transcription.split(' ').length} words, ${transcription.length} characters` : 
                  "Your transcribed text will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] overflow-y-auto pt-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                  <div className="text-zinc-500">Transcribing your audio...</div>
                </div>
              ) : transcription ? (
                <div className="whitespace-pre-wrap bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-zinc-100 min-h-full">
                  {transcription}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-lg">
                  <div className="mb-2 opacity-50">No transcription yet</div>
                  <div className="text-sm">Upload an audio file and click "Transcribe Audio" to get started</div>
                </div>
              )}
            </CardContent>
            {transcription && (
              <CardFooter className="flex justify-end border-t border-zinc-800 p-4">
                <Button
                  onClick={handleCopyToClipboard}
                  variant="outline"
                  className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCheck className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy to clipboard
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
