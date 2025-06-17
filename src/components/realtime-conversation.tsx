import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useEffect, useRef } from "react";
import { Mic, X, BookOpenText, Rabbit, Snail } from "lucide-react";
import { useRealtimeConversation } from "@/lib/useRealtimeConversation";
import { useAudioVisualizer } from "@/lib/useAudioVisualizer";

interface RealtimeConversationProps {
  ttsVoice: string;
  setTtsVoice: (voice: string) => void;
  ttsSpeed: number;
  setTtsSpeed: (speed: number) => void;
}

export default function RealtimeConversation({ 
  ttsVoice, 
  setTtsVoice,
  ttsSpeed,
  setTtsSpeed
}: RealtimeConversationProps) {
  // Get conversation state and actions
  const { 
    state: { messages, isRecording, isAiResponding, error }, 
    actions: { startRecording, stopRecording, cancelRealtimeConversation, startNewConversation } 
  } = useRealtimeConversation();

  // Get audio visualizer
  const { canvasRef, startVisualization, stopVisualization } = useAudioVisualizer();
  
  // Scroll to bottom ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Effect to scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Effect to manage visualization based on state
  useEffect(() => {
    if (isRecording) {
      startVisualization("listening");
    } else if (isAiResponding) {
      startVisualization("responding");
    } else {
      stopVisualization();
    }
  }, [isRecording, isAiResponding, startVisualization, stopVisualization]);

  // Save voice and speed preferences to localStorage
  useEffect(() => {
    localStorage.setItem("parrot-tts-voice", ttsVoice);
  }, [ttsVoice]);

  useEffect(() => {
    localStorage.setItem("parrot-tts-speed", ttsSpeed.toString());
  }, [ttsSpeed]);

  return (
    <div className="w-full flex flex-col xl:flex-row gap-6">
      {/* Main Panel - Realtime Chat */}
      <div className="w-full xl:w-2/3 space-y-6">
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-xl h-full">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-indigo-400">
                <path d="M12 8c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5Z"></path>
                <path d="M12 2v2"></path>
                <path d="M12 20v2"></path>
                <path d="m4.93 4.93 1.41 1.41"></path>
                <path d="m17.66 17.66 1.41 1.41"></path>
                <path d="M2 12h2"></path>
                <path d="M20 12h2"></path>
                <path d="m6.34 17.66-1.41 1.41"></path>
                <path d="m19.07 4.93-1.41 1.41"></path>
              </svg>
              Realtime AI Conversation
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Have a natural conversation with an AI using your voice
            </CardDescription>
            {error && (
              <div className="mt-3 px-4 py-2 bg-red-900/30 border border-red-800 rounded-md text-sm text-red-200 flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-400 mr-2"></div>
                {error}
              </div>
            )}
          </CardHeader>
          <CardContent className="h-[500px] flex flex-col">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id}
                  className={`${
                    message.sender === "ai" 
                      ? "bg-zinc-800/50 border border-zinc-700" 
                      : "bg-indigo-900/30 border border-indigo-700"
                  } rounded-lg p-4 ${
                    message.sender === "ai" ? "max-w-[80%]" : "max-w-[80%] ml-auto"
                  }`}
                >
                  <div 
                    className={`text-xs mb-1 ${
                      message.sender === "ai" ? "text-indigo-400" : "text-indigo-300"
                    }`}
                  >
                    {message.sender === "ai" ? "AI Assistant" : "You"}
                  </div>
                  <div className="text-zinc-200">
                    {message.text}
                  </div>
                  <div className="text-right text-xs text-zinc-500 mt-1">
                    {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              ))}
              
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Audio Visualizer */}
            <div className="h-32 p-4 border-t border-zinc-800">
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 h-full">
                <div className="flex justify-between items-center">
                  <div className="text-zinc-400 text-sm flex items-center gap-2">
                    {isRecording && (
                      <>
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                        <span>Listening...</span>
                      </>
                    )}
                    {isAiResponding && (
                      <>
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                        <span>AI is responding...</span>
                      </>
                    )}
                    {!isRecording && !isAiResponding && (
                      <>
                        <div className="w-2 h-2 rounded-full bg-zinc-400"></div>
                        <span>Press mic to start</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isAiResponding}
                      variant="outline"
                      size="sm"
                      className={`h-8 border-zinc-700 ${
                        isRecording 
                          ? "bg-green-900/50 border-green-700 text-green-400 hover:bg-green-800" 
                          : "bg-zinc-800 hover:bg-zinc-700"
                      } ${isAiResponding ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <Mic className={`h-4 w-4 ${isRecording ? "text-green-400" : "text-indigo-400"}`} />
                    </Button>
                    <Button
                      onClick={cancelRealtimeConversation}
                      disabled={!isRecording && !isAiResponding}
                      variant="outline"
                      size="sm"
                      className={`h-8 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 ${
                        !isRecording && !isAiResponding ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <X className="h-4 w-4 text-zinc-400" />
                    </Button>
                  </div>
                </div>
                
                {/* Audio Waveform */}
                <canvas
                  ref={canvasRef}
                  className="w-full h-14 mt-2"
                  width={500}
                  height={60}
                ></canvas>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Right Panel - Settings */}
      <div className="w-full xl:w-1/3 space-y-6">
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-indigo-400">
                <path d="m9.6 20.4-1.8-.8c-.3-.2-.5-.4-.5-.8V16c-1.1-.3-2.1-1-2.9-1.8l-2.6 1c-.3.1-.7 0-.9-.4l-1.8-3.1c-.2-.4-.1-.8.2-1l2.3-1.7c0-.5 0-1.1.1-1.6l-2.3-1.7c-.3-.2-.4-.7-.2-1l1.8-3.1c.2-.3.5-.5.9-.4l2.6.9c.8-.8 1.8-1.5 2.9-1.8V.8c0-.3.2-.6.5-.8l1.8-.8c.3-.1.7-.1 1 .1L13 .8c.3.2.5.4.5.8v2.8c1.1.3 2.1 1 2.9 1.8l2.6-1c.3-.1.7 0 .9.4l1.8 3.1c.2.3.1.8-.2 1L19.2 11c0 .5 0 1.1-.1 1.6l2.3 1.7c.3.2.4.7.2 1l-1.8 3.1c-.2.3-.5.5-.9.4l-2.6-1c-.8.8-1.8 1.4-2.9 1.7v2.9c0 .3-.2.6-.5.8l-1.8.8c-.3.1-.7.1-1-.1L8 21.2c-.3-.2-.5-.4-.5-.8v-2.8c-1.1-.3-2.1-1-2.9-1.8l-2.6 1c-.3.1-.7 0-.9-.4l-1.8-3.1c-.2-.3-.1-.8.2-1L2 9.6c0-.5 0-1.1.1-1.6L0 6.3c-.3-.2-.4-.7-.2-1l1.8-3.1c.2-.3.5-.5.9-.4l2.6 1c.8-.8 1.8-1.5 2.9-1.8V.8c0-.3.2-.6.5-.8l1.8-.8c.3-.1.7-.1 1 .1L14.5.8c.3.2.5.4.5.8v2.8c1.1.3 2.1 1 2.9 1.8l2.6-1c.3-.1.7 0 .9.4l1.8 3.1c.2.3.1.8-.2 1L20.8 11c0 .5 0 1.1-.1 1.6l2.3 1.7c.3.2.4.7.2 1l-1.8 3.1c-.2.3-.5.5-.9.4l-2.6-1c-.8.8-1.8 1.4-2.9 1.7v2.9c0 .3-.2.6-.5.8l-1.8.8c-.3.1-.7.1-1-.1Z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Conversation Settings
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Customize your realtime conversation experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-white text-base font-medium">AI Voice</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map((voice) => (
                  <div 
                    key={voice}
                    className={`rounded-lg border p-3 ${ttsVoice === voice 
                      ? "border-indigo-500 bg-indigo-500/10" 
                      : "border-zinc-700 bg-zinc-800/50"} 
                      transition-all hover:border-indigo-400/70 cursor-pointer`}
                    onClick={() => setTtsVoice(voice)}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Mic className={`h-5 w-5 ${ttsVoice === voice ? "text-indigo-400" : "text-zinc-500"}`} />
                      <span className={ttsVoice === voice ? "text-indigo-300" : "text-zinc-400"} style={{textTransform: 'capitalize'}}>
                        {voice}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-white text-base font-medium">Response Speed</Label>
                <span className="text-sm text-zinc-400">{ttsSpeed}x</span>
              </div>
              
              <div className="flex items-center gap-4">
                <Snail className="h-4 w-4 text-zinc-500" />
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={ttsSpeed}
                  onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <Rabbit className="h-4 w-4 text-zinc-500" />
              </div>
            </div>
            
            <div className="pt-4 border-t border-zinc-800">
              <Label className="text-white text-base font-medium mb-3 block">Smart Features</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpenText className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm text-zinc-300">Memory & Context</span>
                  </div>
                  <div className="w-8 h-4 rounded-full bg-indigo-500/30 border border-indigo-500/50"></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 7 4 4 20 4 20 7"></polyline>
                      <line x1="9" y1="20" x2="15" y2="20"></line>
                      <line x1="12" y1="4" x2="12" y2="20"></line>
                    </svg>
                    <span className="text-sm text-zinc-300">Auto Punctuation</span>
                  </div>
                  <div className="w-8 h-4 rounded-full bg-indigo-500 border border-indigo-600"></div>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <Button 
                  onClick={startNewConversation}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0 h-10 font-medium transition-all"
                >
                  Start New Conversation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
