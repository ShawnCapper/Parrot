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
import { InstallPWA } from "@/components/install-pwa";
import { useState, useEffect } from "react";
import { Upload, Wand2, Copy, CheckCheck, FileAudio, Download, Mic, Volume2 } from "lucide-react";

export default function Home() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [mode, setMode] = useState<"speech-to-text" | "text-to-speech">("speech-to-text");
  const [prefsLoaded, setPrefsLoaded] = useState<boolean>(false);

  // Load saved preferences on component mount
  useEffect(() => {
    // Load saved model preference
    const savedModel = localStorage.getItem("parrot-selected-model");
    if (savedModel) {
      setSelectedModel(savedModel);
      setPrefsLoaded(true);
    }
    
    // Load saved mode preference
    const savedMode = localStorage.getItem("parrot-mode");
    if (savedMode === "speech-to-text" || savedMode === "text-to-speech") {
      setMode(savedMode);
      setPrefsLoaded(true);
    }

    // Hide the preferences loaded notification after 3 seconds
    if (savedModel || (savedMode === "speech-to-text" || savedMode === "text-to-speech")) {
      setTimeout(() => setPrefsLoaded(false), 3000);
    }
  }, []);

  // Save model preference when it changes
  useEffect(() => {
    localStorage.setItem("parrot-selected-model", selectedModel);
  }, [selectedModel]);
  
  // Save mode preference when it changes
  useEffect(() => {
    localStorage.setItem("parrot-mode", mode);
  }, [mode]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFile(file);
  };

  const handleFile = (file?: File) => {
    setError("");
    
    if (file) {
      // Check if the file is a supported audio format
      const supportedFormats = [
        'audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/mpga', 'audio/m4a', 'audio/wav', 'audio/webm',
        // Some browsers might use these mime types
        'audio/x-m4a', 'audio/x-wav', 'audio/x-mp3', 'audio/wave'
      ];
      
      const fileType = file.type;
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const validExt = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'].includes(fileExt || '');
      
      if (!supportedFormats.includes(fileType) && !validExt) {
        setError("Please select a supported audio file format (MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM).");
        return;
      }
      
      setAudioFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
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

    try {
      const startTime = Date.now();
      
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("model", selectedModel);

      console.log(`Sending request to transcribe ${audioFile.name} using ${selectedModel}`);
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      // Clone the response before parsing to ensure we can read it
      const responseClone = response.clone();
      
      if (!response.ok) {
        // Safely handle JSON parsing for error responses
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await responseClone.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (jsonError) {
          console.error("Failed to parse error response:", jsonError);
          try {
            // Try to get plain text if JSON parsing failed
            const textResponse = await response.text();
            if (textResponse) {
              errorMessage = `Server error: ${textResponse.slice(0, 100)}`;
            }
          } catch (textError) {
            console.error("Failed to get error text:", textError);
          }
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await responseClone.json();
      } catch (jsonError) {
        console.error("Failed to parse response as JSON:", jsonError);
        // Try to get response text to debug
        try {
          const textResponse = await response.text();
          console.error("Raw response:", textResponse);
        } catch (textError) {
          console.error("Failed to get response text:", textError);
        }
        throw new Error("Failed to parse server response");
      }
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      setTranscription(result.transcription);
      setSuccessMessage(`Transcription completed in ${processingTime}s`);
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

  const handleDownloadTxt = () => {
    if (!transcription) return;
    
    const element = document.createElement("a");
    const file = new Blob([transcription], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `transcription_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
            
            {/* Preferences loaded notification */}
            {prefsLoaded && (
              <div className="ml-4 px-3 py-1 bg-green-900/30 border border-green-800 rounded-full text-xs text-green-200 flex items-center animate-fade-in-out">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5"></div>
                Settings restored
              </div>
            )}
          </div>

          {/* Center area - PWA Install Button */}
          <div className="hidden sm:flex items-center">
            <InstallPWA />
          </div>
          
          {/* Mode Toggle */}
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            <button
              onClick={() => setMode("speech-to-text")}
              className={`px-4 py-2 flex flex-1 justify-center items-center gap-2 text-sm transition-colors ${
                mode === "speech-to-text"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800/70 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              <Mic className="w-4 h-4" />
              <span className={
                mode === "speech-to-text"
                  ? "hidden lg:inline"
                  : "hidden"
              }>Speech-to-Text</span>
            </button>
            <button
              onClick={() => setMode("text-to-speech")}
              className={`px-4 py-2 flex flex-1 justify-center items-center gap-2 text-sm transition-colors ${
                mode === "text-to-speech"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800/70 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span className={
                mode === "text-to-speech"
                  ? "hidden lg:inline"
                  : "hidden"
              }>Text-to-Speech</span>
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col xl:flex-row w-full max-w-7xl mx-auto p-4 gap-6">
        {mode === "speech-to-text" ? (
        <>
        {/* Left Panel - Upload */}
        <div className="w-full xl:w-1/2 space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <FileAudio className="h-6 w-6 text-indigo-400" />
                Step 1: Select Audio
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Select your audio file containing speech
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <label 
                htmlFor="audio-file"
                className={`rounded-lg border-2 border-dashed ${isDragging 
                  ? 'border-indigo-500 bg-indigo-500/5' 
                  : 'border-zinc-700 hover:border-indigo-500'
                } p-6 flex flex-col items-center justify-center transition-all cursor-pointer block`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className={`h-10 w-10 mb-2 ${isDragging ? 'text-indigo-400' : 'text-zinc-500'}`} />
                {isDragging ? (
                  <span className="text-sm text-indigo-400 font-medium cursor-pointer text-center">
                    Drop to upload your audio file
                  </span>
                ) : (
                  <span className="text-sm text-zinc-400 cursor-pointer text-center">
                    <span className="font-medium text-indigo-400">Click to upload</span> or drag and drop<br />
                    a <span className="relative group">
                      <span className="underline decoration-dotted cursor-help">supported</span>
                      <span className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 w-60 bg-zinc-800 text-zinc-200 text-xs rounded p-2 mb-1 shadow-lg z-10 border border-zinc-700">
                        Supported formats: MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM
                      </span>
                    </span> audio file
                  </span>
                )}
                <Input
                  id="audio-file"
                  type="file"
                  accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,audio/mp3,audio/mp4,audio/mpeg,audio/mpga,audio/m4a,audio/wav,audio/webm"
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

          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-indigo-400" />
                Step 2: Transcription Settings
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Choose the AI model for your transcription needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Label htmlFor="model" className="text-white text-base font-medium">Speech-to-text model</Label>
                
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Whisper Model Card */}
                  <div 
                    className={`rounded-lg border flex-1 min-w-0 ${selectedModel === "whisper-1" 
                      ? "border-indigo-500 bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 shadow-lg shadow-indigo-500/20" 
                      : "border-zinc-700 bg-zinc-800/50"} 
                      overflow-hidden transition-all hover:border-indigo-400/70 cursor-pointer`}
                    onClick={() => setSelectedModel("whisper-1")}
                  >
                    <div className="p-4 relative">
                      {/* Background gradient effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-rose-500/10 to-transparent opacity-70"></div>
                      
                      {/* Content */}
                      <div className="relative space-y-3">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-white whitespace-nowrap">Whisper 2</h3>
                          {selectedModel === "whisper-1" && (
                            <div className="bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 text-[10px] px-1.5 py-0.5 ml-1.5 rounded-full whitespace-nowrap">Selected</div>
                          )}
                        </div>
                        
                        <div className="pt-2 flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                            <div className="h-2 w-2 rounded-full bg-zinc-700"></div>
                            <div className="h-2 w-2 rounded-full bg-zinc-700"></div>
                          </div>
                          <span className="text-xs text-zinc-500">Performance</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="text-zinc-400 text-xs">⚡</div>
                          </div>
                          <span className="text-xs text-zinc-500">Speed</span>
                        </div>
                        
                        <div className="pt-2 mt-2 border-t border-zinc-700/50 text-xs text-zinc-400">
                          <span className="font-semibold text-indigo-300">$0.006</span> per minute of audio
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 bg-zinc-900/80 border-t border-zinc-700/50">
                      <div className="text-xs text-zinc-400">Basic transcription with good accuracy for clear audio</div>
                    </div>
                  </div>
                  
                  {/* GPT-4o mini Model Card */}
                  <div 
                    className={`rounded-lg border flex-1 min-w-0 ${selectedModel === "gpt-4o-mini" 
                      ? "border-indigo-500 bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/30" 
                      : "border-zinc-700 bg-zinc-800/50"} 
                      overflow-hidden transition-all hover:border-indigo-400/70 cursor-pointer`}
                    onClick={() => setSelectedModel("gpt-4o-mini")}
                  >
                    <div className="p-4 relative">
                      {/* Background gradient effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent opacity-70"></div>
                      
                      {/* Content */}
                      <div className="relative space-y-3">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-white whitespace-nowrap">GPT-4o mini</h3>
                          {selectedModel === "gpt-4o-mini" && (
                            <div className="bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 text-xs px-1.5 py-0.5 ml-1.5 rounded-full text-[10px] whitespace-nowrap">Selected</div>
                          )}
                        </div>
                        
                        <div className="pt-2 flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                            <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                            <div className="h-2 w-2 rounded-full bg-zinc-700"></div>
                          </div>
                          <span className="text-xs text-zinc-500">Performance</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="text-zinc-400 text-xs">⚡⚡</div>
                          </div>
                          <span className="text-xs text-zinc-500">Speed</span>
                        </div>
                        
                        <div className="pt-2 mt-2 border-t border-zinc-700/50 text-xs text-zinc-400">
                          <div><span className="font-semibold text-indigo-300">$1.25</span> per 1M tokens in</div>
                          <div><span className="font-semibold text-indigo-300">$5.00</span> per 1M tokens out</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 bg-zinc-900/80 border-t border-zinc-700/50">
                      <div className="text-xs text-zinc-400">Enhanced transcription with improved formatting and clarity</div>
                    </div>
                  </div>
                  
                  {/* GPT-4o Model Card */}
                  <div 
                    className={`rounded-lg border flex-1 min-w-0 ${selectedModel === "gpt-4o" 
                      ? "border-indigo-500 bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 shadow-lg shadow-indigo-500/20" 
                      : "border-zinc-700 bg-zinc-800/50"} 
                      overflow-hidden transition-all hover:border-indigo-400/70 cursor-pointer`}
                    onClick={() => setSelectedModel("gpt-4o")}
                  >
                    <div className="p-4 relative">
                      {/* Background gradient effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent opacity-70"></div>
                      
                      {/* Content */}
                      <div className="relative space-y-3">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-white whitespace-nowrap">GPT-4o</h3>
                          {selectedModel === "gpt-4o" && (
                            <div className="bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 text-[10px] px-1.5 py-0.5 ml-1.5 rounded-full whitespace-nowrap">Selected</div>
                          )}
                        </div>
                        
                        <div className="pt-2 flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                            <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                            <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                          </div>
                          <span className="text-xs text-zinc-500">Performance</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="text-zinc-400 text-xs">⚡</div>
                          </div>
                          <span className="text-xs text-zinc-500">Speed</span>
                        </div>
                        
                        <div className="pt-2 mt-2 border-t border-zinc-700/50 text-xs text-zinc-400">
                          <div><span className="font-semibold text-indigo-300">$2.50</span> per 1M tokens in</div>
                          <div><span className="font-semibold text-indigo-300">$10.00</span> per 1M tokens out</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 bg-zinc-900/80 border-t border-zinc-700/50">
                      <div className="text-xs text-zinc-400">Premium transcription with highest accuracy and semantic understanding</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Panel - Results */}
        <div className="w-full xl:w-1/2 space-y-6">
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
              {successMessage && !error && !isLoading && (
                <div className="mt-3 px-4 py-2 bg-green-900/30 border border-green-800 rounded-md text-sm text-green-200 flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                  {successMessage}
                </div>
              )}
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
                  <div className="text-sm">Upload an audio file and click &quot;Transcribe Audio&quot; to get started</div>
                </div>
              )}
            </CardContent>
            {transcription && (
              <CardFooter className="flex justify-end border-t border-zinc-800 p-4">
                <div className="flex gap-2">
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
                  
                  <Button
                    onClick={handleDownloadTxt}
                    variant="outline"
                    className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download as .txt
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
        </>
        ) : (
          // Text-to-Speech Mode (Placeholder)
          <div className="w-full space-y-6">
            <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                  <Volume2 className="h-6 w-6 text-indigo-400" />
                  Text-to-Speech
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Convert written text into natural-sounding speech
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <Volume2 className="h-16 w-16 text-zinc-600 mb-4" />
                  <h3 className="text-xl font-medium text-zinc-400">Coming Soon</h3>
                  <p className="text-zinc-500 max-w-md">
                    The Text-to-Speech feature is currently under development. 
                    Please check back later for updates.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
